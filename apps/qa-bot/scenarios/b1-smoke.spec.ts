/**
 * B1 — Fumaça (plano v2, 15.7): abre todas as páginas, confere título e ausência de erros
 * no console; com semente fixa, 1d20 dá um valor exato conhecido.
 */
import { seededRng } from '@grimorio/rules';
import {
  expect,
  expected404,
  openPage,
  openThemeOptions,
  PAGES,
  rollBy,
  test,
} from '../support/bot';

test.describe('B1 — fumaça', { tag: '@B1' }, () => {
  for (const path of PAGES) {
    test(`abre ${path} sem erros`, async ({ page }) => {
      await openPage(page, path);
      await expect(page).toHaveTitle(/Grimório/);
      await expect(page.locator('h1').first()).toBeVisible();
    });
  }

  test('página que não existe responde 404 e mostra o aviso, sem erro', async ({ page }) => {
    expected404('/nao-existe');
    const response = await page.goto('/nao-existe');
    expect(response?.status()).toBe(404);
    await page.waitForFunction(() => window.__APP_TEST__ !== undefined);
    await expect(page.locator('h1')).toHaveText('Esta página não está no mapa');
  });

  // Feedback dos testadores (14/10): quem chega pela inicial vai direto para o assistente.
  test('a inicial leva para o assistente e para os primeiros passos', async ({ page }) => {
    await openPage(page, '/');
    await page.getByTestId('home.create').click();
    await page.waitForURL(/\/criar$/);
    await expect(page.getByTestId('wizard.option.class.fighter')).toBeVisible();
    await openPage(page, '/');
    await page.getByTestId('home.start').click();
    await page.waitForURL(/\/comecar$/);
    await expect(page.getByTestId('start.create')).toBeVisible();
  });

  test('no assistente, Avançar com pendência leva até ela', async ({ page }) => {
    await openPage(page, '/criar');
    await expect(page.getByTestId('wizard.next')).toHaveAttribute('data-ready', 'false');
    await page.getByTestId('wizard.next').click();
    await expect(page.locator('#wizard-class-list')).toHaveClass(/wizard-flash/);
    await expect(page.getByTestId('wizard.step.class')).toHaveAttribute('aria-current', 'step');
    // A explicação inicial some depois de "Entendi" e não volta.
    await page.getByTestId('wizard.intro.ok').click();
    await expect(page.getByTestId('wizard.intro')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('wizard.option.class.fighter')).toBeVisible();
    await expect(page.getByTestId('wizard.intro')).toHaveCount(0);
  });

  test('a ficha em branco aponta para o assistente', async ({ page }) => {
    await openPage(page, '/ficha');
    await expect(page.getByTestId('sheet.wizard-hint')).toBeVisible();
    await page.getByTestId('sheet.wizard-hint').getByRole('link').click();
    await page.waitForURL(/\/criar$/);
  });

  // Tema claro ou escuro, lembrado neste navegador.
  test('troca o tema, lembra depois de recarregar e volta ao automático', async ({ page }) => {
    const html = page.locator('html');
    await openPage(page, '/');
    await expect(html).not.toHaveAttribute('data-theme', /./);
    await openThemeOptions(page);
    await page.getByTestId('theme.option.dark').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByTestId('theme.option.dark').getByRole('radio')).toBeChecked();
    // O public/theme.js aplica o tema antes do app: vale até numa página "shell".
    await openPage(page, '/dados');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await openThemeOptions(page);
    await page.getByTestId('theme.option.auto').click();
    await expect(html).not.toHaveAttribute('data-theme', /./);
    expect(await page.evaluate(() => localStorage.getItem('grimorio.tema'))).toBeNull();
  });

  test('o seletor de tema funciona pelo teclado', async ({ page, isMobile }) => {
    test.skip(isMobile, 'no celular as opções de tema ficam no menu, sem a paleta');
    await openPage(page, '/');
    const trigger = page.getByTestId('theme.trigger');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('theme.picker')).toBeVisible();
    // O foco vai para o tema marcado; as setas escolhem o próximo.
    await expect(page.getByTestId('theme.option.auto').getByRole('radio')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('theme.picker')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('o tema salvo é aplicado por um arquivo do site, antes do CSS', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const script = html.indexOf('<script src="/theme.js"></script>');
    expect(script).toBeGreaterThan(-1);
    expect(script).toBeLessThan(html.indexOf('rel="stylesheet"'));
    expect((await request.get('/theme.js')).status()).toBe(200);
  });

  test('o build de teste informa a versão', async ({ page }) => {
    await openPage(page, '/');
    const build = await page.evaluate(() => window.__APP_TEST__!.build);
    expect(build.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('com semente fixa, 1d20 dá o valor exato do oráculo', async ({ page, seed }) => {
    await openPage(page, '/dados');
    await page.evaluate((s) => window.__APP_TEST__!.setRngSeed(s), seed);
    await page.getByTestId('dice.input').fill('1d20');
    await rollBy(page, () => page.getByTestId('dice.submit').click());
    const expected = seededRng(seed).int(1, 20);
    await expect(page.getByTestId('roll.last.total')).toHaveAttribute(
      'data-value',
      String(expected),
    );
  });

  // Etapa 8: cada rota tem o próprio HTML (ver scripts/prerender.mjs).
  for (const [path, mark] of [
    ['/', 'data-prerendered="/"'],
    ['/termos', 'data-prerendered="/termos"'],
    ['/comecar', 'data-prerendered="/comecar"'],
    ['/dados', 'data-shell="/dados"'],
    ['/ficha', 'data-shell="/ficha"'],
  ] as const) {
    test(`${path} chega com o HTML certo (${mark.split('=')[0]})`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      expect(html).toContain(mark);
    });
  }

  // ADR-013: o Google acha as páginas públicas e deixa as pessoais de fora.
  test('busca: sitemap, robots.txt, endereço canônico e noindex nas páginas pessoais', async ({
    request,
  }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('/dados</loc>');
    expect(sitemap).not.toContain('/entrar');
    expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://');

    const home = await (await request.get('/')).text();
    expect(home).toMatch(/<link rel="canonical" href="https:\/\/[^"]+\/"/);
    expect(home).toContain('application/ld+json');
    expect(home).toContain('property="og:image"');
    const login = await (await request.get('/entrar')).text();
    expect(login).toContain('<meta name="robots" content="noindex" />');
    expect(login).not.toContain('rel="canonical"');
    expect((await request.get('/og.jpg')).headers()['content-type']).toContain('image/jpeg');
  });

  test('responde com os cabeçalhos de segurança da produção', async ({ request }) => {
    const headers = (await request.get('/dados')).headers();
    expect(headers['content-security-policy']).toContain("script-src 'self'");
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});
