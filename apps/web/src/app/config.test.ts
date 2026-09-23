import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('__APP_VERSION__', '0.1.0');
vi.stubGlobal('__APP_COMMIT__', 'abc1234');

const { emailOrEmpty, httpsOrEmpty, reportLink } = await import('./config');

describe('reportLink (RF-104)', () => {
  it('sem endereço configurado não há link', () => {
    expect(reportLink('/ficha', '')).toBeNull();
  });

  it('preenche os marcadores {pagina} e {versao}', () => {
    expect(reportLink('/ficha', 'https://x.dev/new?title={pagina}&body={versao}')).toBe(
      'https://x.dev/new?title=%2Fficha&body=0.1.0%2Babc1234',
    );
  });

  it('sem marcadores, anexa como parâmetros', () => {
    expect(reportLink('/dados', 'https://forms.example.com/f')).toBe(
      'https://forms.example.com/f?pagina=%2Fdados&versao=0.1.0%2Babc1234',
    );
  });
});

describe('valores vindos das variáveis de ambiente', () => {
  it('só aceita links https', () => {
    expect(httpsOrEmpty(' https://apoia.se/grimorio ')).toBe('https://apoia.se/grimorio');
    expect(httpsOrEmpty('https://x.dev/new?title={pagina}')).toBe(
      'https://x.dev/new?title={pagina}',
    );
    expect(httpsOrEmpty('http://inseguro.dev')).toBe('');
    expect(httpsOrEmpty('javascript:alert(1)')).toBe('');
    expect(httpsOrEmpty('não é link')).toBe('');
    expect(httpsOrEmpty(undefined)).toBe('');
  });

  it('só aceita um e-mail simples', () => {
    expect(emailOrEmpty('contato@grimorio.dev')).toBe('contato@grimorio.dev');
    expect(emailOrEmpty('sem-arroba')).toBe('');
    expect(emailOrEmpty('<a@b.c>')).toBe('');
    expect(emailOrEmpty(undefined)).toBe('');
  });
});
