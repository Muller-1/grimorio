/** E-mail (plano v2, 6.5 e 17): fora de produção, nada sai de verdade — vai para uma caixa. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export interface InMemoryMailer extends Mailer {
  outbox(): readonly MailMessage[];
  clear(): void;
}

export function inMemoryMailer(): InMemoryMailer {
  const sent: MailMessage[] = [];
  return {
    async send(message) {
      sent.push({ ...message });
    },
    outbox: () => [...sent],
    clear: () => void (sent.length = 0),
  };
}

export function isInMemoryMailer(mailer: Mailer): mailer is InMemoryMailer {
  return typeof (mailer as Partial<InMemoryMailer>).outbox === 'function';
}

/**
 * Produção ainda sem provedor (Resend, Brevo…: decidido no R2). Falha alto em vez de
 * "enviar" em silêncio para lugar nenhum.
 */
export const unconfiguredMailer: Mailer = {
  async send() {
    throw new Error('Nenhum provedor de e-mail configurado para produção.');
  },
};
