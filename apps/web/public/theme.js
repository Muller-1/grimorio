// Aplica o tema, o movimento e a fonte salvos antes de a página aparecer, para não piscar no
// tema errado nem começar uma animação que a pessoa desligou.
// Fica num arquivo do próprio site porque a CSP não permite script inline.
// As chaves e as listas são as mesmas de src/lib/theme.ts e src/lib/preferences.ts (os testes
// theme.test.ts e preferences.test.ts conferem).
(function () {
  var root = document.documentElement;
  try {
    var theme = localStorage.getItem('grimorio.tema');
    if (theme && /^(light|dark)$/.test(theme)) {
      root.setAttribute('data-theme', theme);
    }
  } catch (e) {
    // Sem acesso ao armazenamento: fica o tema automático.
  }

  try {
    // A antiga caixa "Animação" do rolador, desmarcada, vira movimento desligado.
    var motion = localStorage.getItem('grimorio.movimento');
    if (!motion && localStorage.getItem('grimorio.dados.animacao') === '0') {
      motion = 'off';
      localStorage.setItem('grimorio.movimento', motion);
    }
    localStorage.removeItem('grimorio.dados.animacao');
    if (motion && /^(on|off)$/.test(motion)) {
      root.setAttribute('data-motion', motion);
    }
    if (localStorage.getItem('grimorio.fonte') === 'legible') {
      root.setAttribute('data-font', 'legible');
    }
  } catch (e) {
    // Sem acesso ao armazenamento: o movimento segue o aparelho e a fonte fica a padrão.
  }

  // "Automático" segue o aparelho: `data-system-dark` acompanha a preferência do sistema, até
  // quando ela muda com a página aberta. O CSS só usa a marca quando não há tema escolhido.
  if (!window.matchMedia) return;
  var dark = window.matchMedia('(prefers-color-scheme: dark)');
  function follow() {
    if (dark.matches) root.setAttribute('data-system-dark', '');
    else root.removeAttribute('data-system-dark');
  }
  follow();
  if (dark.addEventListener) dark.addEventListener('change', follow);
  else if (dark.addListener) dark.addListener(follow);
})();
