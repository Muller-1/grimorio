/** Exportar e importar ficha: vem com o módulo carregado no clique, fora do pedaço da ficha. */
export const transferPtBR = {
  confirmTitle: 'Trocar pela ficha importada?',
  confirmText: (name: string) =>
    `A ficha deste navegador dá lugar a ${name}. Isso não pode ser desfeito (exporte antes, se quiser guardar).`,
  failed: 'Esse arquivo não é uma ficha do Grimório.',
  done: (name: string) => `${name} foi importada.`,
};
