// Aplica o tema salvo antes de a página aparecer, para não piscar no tema errado.
// Fica num arquivo do próprio site porque a CSP não permite script inline.
// A chave e a lista são as mesmas de src/lib/theme.ts (o teste theme.test.ts confere).
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
