import type { CharacterDocument } from '@grimorio/shared';
import type {
  ActionsResult,
  CampaignDetail,
  CampaignSummary,
  GameAction,
  PartyMember,
  UpdatesResponse,
} from '@grimorio/shared/campaign';
import { api } from '@/lib/api';
import { newId } from '@/ports/ids';

/** Chamadas da campanha (rotas em apps/api/src/modules/campaigns/routes.ts). */
export const campaignApi = {
  list: () => api<{ campaigns: CampaignSummary[] }>('/api/v1/campaigns'),
  create: (name: string) =>
    api<CampaignDetail>('/api/v1/campaigns', { method: 'POST', body: { id: newId(), name } }),
  join: (code: string) =>
    api<{ campaignId: string }>('/api/v1/campaigns/join', { method: 'POST', body: { code } }),
  detail: (id: string) => api<CampaignDetail>(`/api/v1/campaigns/${id}`),
  renewInvite: (id: string) =>
    api<CampaignDetail>(`/api/v1/campaigns/${id}/invite`, { method: 'POST', body: {} }),
  leave: (id: string) => api(`/api/v1/campaigns/${id}/members/me`, { method: 'DELETE' }),
  end: (id: string) => api(`/api/v1/campaigns/${id}`, { method: 'DELETE' }),
  party: (id: string) => api<{ party: PartyMember[] }>(`/api/v1/campaigns/${id}/party`),
  addCharacter: (id: string, characterId: string) =>
    api(`/api/v1/campaigns/${id}/characters`, { method: 'POST', body: { characterId } }),
  removeCharacter: (id: string, characterId: string) =>
    api(`/api/v1/campaigns/${id}/characters/${characterId}`, { method: 'DELETE' }),

  /** Uma ação de jogo com id novo (reenviar o mesmo pedido não aplica duas vezes). */
  act: (characterId: string, action: GameAction) =>
    api<ActionsResult>(`/api/v1/characters/${characterId}/actions`, {
      method: 'POST',
      body: { actions: [{ actionId: newId(), action }] },
    }),
  updates: (characterId: string, after: number) =>
    api<UpdatesResponse>(`/api/v1/characters/${characterId}/updates?after=${after}`),
  propose: (characterId: string, amount: number) =>
    api(`/api/v1/characters/${characterId}/proposals`, {
      method: 'POST',
      body: { proposalId: newId(), amount },
    }),
  decide: (characterId: string, proposalId: string, accept: boolean) =>
    api<{ document: CharacterDocument; duplicate: boolean }>(
      `/api/v1/characters/${characterId}/proposals/${proposalId}/${accept ? 'accept' : 'reject'}`,
      { method: 'POST', body: {} },
    ),
};

/** Código do convite a partir do link colado (…/campanhas?convite=CÓDIGO) ou do código puro. */
export function inviteCodeFrom(text: string): string {
  const trimmed = text.trim();
  const match = /[?&]convite=([A-Za-z0-9_-]+)/.exec(trimmed);
  return match ? match[1]! : trimmed;
}

/** Link do convite para mandar aos jogadores. */
export function inviteLink(code: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/campanhas?convite=${code}`;
}
