import type { ApiErrorCode } from '@grimorio/shared';
import type { FastifyReply } from 'fastify';

/**
 * Erros sempre no formato `{ code, message, details? }` com códigos fixos (plano v2, 13).
 * O site traduz o código; a mensagem em inglês/português técnico é só para log e depuração.
 */
export function sendError(
  reply: FastifyReply,
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
) {
  return reply
    .code(status)
    .send(details === undefined ? { code, message } : { code, message, details });
}
