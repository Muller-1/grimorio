import { PORTRAIT_DATA_MAX } from '@grimorio/shared';

/**
 * Foto do personagem enviada do computador. Antes de guardar na ficha, a
 * imagem é reduzida no próprio navegador: lado maior de até 320 px, WebP (ou JPEG, se o navegador
 * não gerar WebP). Uma foto de celular de vários MB vira ~15–40 kB, o que cabe no navegador e na
 * conta sem pesar no salvamento.
 */

const MAX_SIDE = 320;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

export type ImageError = 'not-image' | 'too-big' | 'unreadable';

export class ImageFailure extends Error {
  constructor(readonly code: ImageError) {
    super(code);
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // cai no <img> abaixo (alguns navegadores não abrem todos os formatos aqui)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new ImageFailure('unreadable');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encode(canvas: HTMLCanvasElement, quality: number): string {
  const webp = canvas.toDataURL('image/webp', quality);
  // Navegador sem WebP devolve PNG (grande): usa JPEG.
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality);
}

/** Lê, reduz e comprime a imagem. Devolve o data URL para `identity.portraitData`. */
export async function compressPortrait(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new ImageFailure('not-image');
  if (file.size > MAX_INPUT_BYTES) throw new ImageFailure('too-big');
  const source = await loadBitmap(file);
  const width = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const height = 'naturalHeight' in source ? source.naturalHeight : source.height;
  if (!width || !height) throw new ImageFailure('unreadable');

  let side = MAX_SIDE;
  for (const quality of [0.82, 0.7, 0.55]) {
    const scale = Math.min(1, side / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ImageFailure('unreadable');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const data = encode(canvas, quality);
    if (data.length <= PORTRAIT_DATA_MAX) return data;
    side = Math.round(side * 0.75);
  }
  throw new ImageFailure('too-big');
}
