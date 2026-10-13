import {
  CharacterDocumentSchema,
  CharacterListSchema,
  type CharacterDocument,
  type CharacterSummary,
  type LocalSheet,
} from '@grimorio/shared';
import { api, type ApiResult } from '@/lib/api';

/** Chamadas da API de personagens (plano v2, 13). Respostas conferidas com os schemas. */

interface Schema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

function checked<T>(result: ApiResult<unknown>, schema: Schema<T>): ApiResult<T> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.data);
  return parsed.success
    ? { ok: true, status: result.status, data: parsed.data }
    : { ok: false, status: result.status, error: null };
}

export async function listCharacters(): Promise<ApiResult<CharacterSummary[]>> {
  const result = checked(await api('/api/v1/characters'), CharacterListSchema);
  return result.ok ? { ...result, data: result.data.characters } : result;
}

export async function getCharacter(id: string): Promise<ApiResult<CharacterDocument>> {
  return checked(
    await api(`/api/v1/characters/${encodeURIComponent(id)}`),
    CharacterDocumentSchema,
  );
}

/** O id vem do navegador: repetir (clique duplo, rede instável) não cria duas fichas. */
export async function createCharacter(
  id: string,
  sheet: LocalSheet,
): Promise<ApiResult<CharacterDocument>> {
  return checked(
    await api('/api/v1/characters', { method: 'POST', body: { id, sheet } }),
    CharacterDocumentSchema,
  );
}

export async function deleteCharacter(id: string): Promise<ApiResult<unknown>> {
  return api(`/api/v1/characters/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
