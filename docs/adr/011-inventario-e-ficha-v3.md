# ADR-011 — Inventário, origem das características e ficha v3

- **Status:** aceito
- **Data:** 2026-10-15

## Contexto

Pedidos de 15/10: o equipamento inicial estava escrito numa característica; o usuário quer um
**Inventário** com peças de ouro e cálculo de peso no topo (como o cabeçalho das magias), **toda
arma no inventário** com a opção de estar **equipada** (carregada) ou não, as **características
separadas pela origem** (classe, subclasse, espécie, talentos…), **condições e magias que
atrapalham** escolhidas num popup, e a **foto do personagem** enviada do computador, com
compressão. Também: subida de nível em telas mais curtas e páginas menos compridas.

## Decisões

1. **Ficha v3** (`packages/shared`): `inventory` (moedas PC, PP, PE, PO, PL e até 200 itens com
   quantidade, peso de uma unidade, "com você" e anotações), `weapons[].equipped` e
   `weapons[].weightKg`, `features[].source` (`class`, `subclass`, `species`, `background`,
   `feat`, `training`, `other`). Campo ausente = arma equipada / item com você. A migração
   v2 → v3 só acrescenta o inventário vazio; `inventory` virou uma seção da API (revisões
   antigas contam como 0, igual a `spells` na v2). Fixture: `fixtures/v2-barbarian.json`.
2. **O que precisa das regras roda no site, uma vez** (`rules/creation/upgrade.ts`): ao abrir
   uma ficha com característica sem origem, o site descobre a origem pelo nome (listas da
   classe, da subclasse e da espécie) e passa o texto "Equipamento inicial" para o Inventário,
   **só se o texto for o que o assistente escrevia** (senão fica como está). O módulo carrega sob
   demanda: a ficha não leva as listas de espécies.
3. **Peso** (`rules/inventory`): tabela em kg dos itens comuns do cap. 6 (1 libra do SRD 5.2 =
   0,5 kg, a conversão das tabelas em português), achada pelo nome sem acento e no singular.
   Peso escrito pelo jogador vale mais. Capacidade de Carga = Força × 7,5 kg (Golias, Porte
   Poderoso: × 15). 50 moedas = 0,5 kg. Acima da capacidade o Deslocamento vai a 1,5 m; acima do
   dobro, 0 (regra de arrastar e empurrar). Só arma equipada aparece nos ataques e pesa.
4. **Efeitos em você** (`rules/engine/on-you.ts`): as 15 condições do glossário (nomes do livro:
   Contido, Imobilizado, Exaustão 1–6…) e 7 magias que atrapalham viram efeitos do motor, como as
   magias que ajudam. Desvantagem e Vantagem se anulam. O descanso longo tira 1 de Exaustão e
   mantém as outras condições. Magia conjurada com "Em mim" marcado entra sozinha na lista.
5. **Foto** (`web/lib/image.ts`): reduzida no navegador para no máximo 320 px de lado, WebP (ou
   JPEG), até 150 mil caracteres de data URL na ficha. Nada vai para outro servidor além da
   ficha da conta.
6. **Peso das páginas**: popup de efeitos, editores de arma e característica, compressão de foto
   e Inventário carregam sob demanda; `/ficha` continua no orçamento de 115 kB.
7. **Cuidado com o pedaço `rules`** (`vite.config.ts`): ele e o pedaço da ficha se importam;
   nenhum módulo das regras pode usar valor de `@grimorio/shared` no carregamento (fora de
   função). Foi o que quebrou a ficha no primeiro build desta versão; o bot (B15/B16) pegou.

## Livro conferido

- **Especialização** existe (glossário): dobra o Bônus de Proficiência numa perícia em que você
  já tem proficiência; não acumula. Vem do Ladino, do Bardo, do Patrulheiro e de talentos.
- **Metade da proficiência** só aparece no **Pau pra Toda Obra** do Bardo (perícias sem
  proficiência). Por isso o botão da perícia passa por nenhuma → proficiência → Especialização;
  a metade só vem de fichas antigas.

## Testes

Unitários em `rules/inventory/inventory.test.ts`, migração v2 em `shared`, API (v2 abre com
inventário e salva a seção nova) e bot B16 (ficha antiga organizada, arma guardada sai dos
ataques, item novo com peso do livro, Envenenado dá Desvantagem, foto reduzida a 320×240).
