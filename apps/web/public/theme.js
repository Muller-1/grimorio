// Aplica o tema salvo antes de a página aparecer, para não piscar no tema errado.
// Fica num arquivo do próprio site porque a CSP não permite script inline.
// A chave e a lista são as mesmas de src/lib/theme.ts (o teste theme.test.ts confere).
(function () {
  try {
    var theme = localStorage.getItem('grimorio.tema');
    if (theme && /^(light|dark|arcane|forest|contrast)$/.test(theme)) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (e) {
    // Sem acesso ao armazenamento: fica o tema automático.
  }
})();
