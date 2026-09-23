# ADR-002 — Ficha editável antecipada, com formato local provisório

- **Status:** aceito
- **Data:** 2026-09-22

## Contexto

O plano de início começa pelo rolador (R1) e deixa a ficha para o R2, porque a ficha completa
depende de decisões ainda abertas (edição das regras, contas, conteúdo do SRD). Mesmo assim,
foi pedido ter já a tela inicial e a tela da ficha do protótipo, editável e com cálculo
automático.

## Decisão

1. A ficha entra agora como **ficha local**: tudo é digitado pelo jogador e salvo só no
   navegador (`localStorage`, chave `grimorio.ficha.v1`), sem contas nem servidor.
2. O formato é um schema Zod próprio e **provisório**, `LocalSheet` (`packages/shared`), com
   `schemaVersion: 1`. Os nomes seguem o `CharacterData` v2 do plano (`identity`, `state.hp`,
   `hpLog`, `deathSaves`...) para que a migração no R2 seja uma função simples.
3. Os cálculos ficam no motor puro (`packages/rules/src/sheet`): modificadores, proficiência,
   salvaguardas, perícias (nenhuma/metade/proficiente/especialização), iniciativa, CA sem
   armadura (10 + Des) ou manual, PV máximo pela média do dado de vida (ou manual), percepção
   passiva e ataques. Cada número vem com as partes que o compõem (`Explained`); o motor não
   produz texto.
4. O estado de jogo muda só por **ações** puras (`applySheetAction`): dano, cura, PV temporários,
   desfazer como ação inversa, testes contra a morte, dados de vida e descanso longo — já no
   formato que o R2 vai sincronizar.
5. **Regras de 2024** assumidas onde a edição muda algo (a ficha do protótipo usa "Origem"):
   descanso longo recupera todos os Dados de Vida; PV por nível e cura por Dado de Vida têm
   mínimo 1. A decisão #1 (edição) continua aberta para o conteúdo do SRD.
6. **Terminologia:** começou pelos termos do protótipo; depois foi trocada pelos do livro de
   2024 em português (ver ADR-004).
7. Ainda **não** entram: magias, inventário, armaduras do SRD, condições, descanso curto
   completo e recursos de classe. As abas de Magias e Inventário mostram "em breve".

## Consequências

- No R2 será preciso escrever `localSheetToCharacterData` e oferecer a importação da ficha
  local para a conta.
- A ficha já nasce testável: todos os números têm `data-testid` e `data-value`, e o motor tem
  testes de propriedade e de invariantes.
- Risco: o formato local pode divergir do v2. Mitigação: o formato é pequeno, versionado e
  validado na leitura; dados ilegíveis vão para `grimorio.ficha.backup` em vez de serem apagados.
