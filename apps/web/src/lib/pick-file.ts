/**
 * Abre o "escolher arquivo" do navegador e entrega o texto do .json escolhido. Precisa ser
 * chamado direto do clique (o navegador só abre a janela em resposta a um toque).
 */
export function pickJsonFile(onText: (text: string) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) void file.text().then(onText);
  });
  input.click();
}
