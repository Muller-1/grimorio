# ADR-010 — Magias, subida de nível e habilidades que o site calcula

- **Status:** aceito
- **Data:** 2026-10-14

## Contexto

O usuário pediu (14/10): (1) subir de nível escolhendo **quantos níveis** subiu, confirmar e
passar por **uma tela por nível** com o que ganhou (mesmo sem escolha) e o que escolher; (2) o
**sistema de magias**, com uma estratégia para a lista enorme; (3) habilidades que o jogador
**liga** e o site **calcula sozinho**, inclusive combinações como o **Frenesi** (Fúria + Ataque
Imprudente). O livro (tradução PT-BR) foi lido pelo sumário: cap. 2 (Avanço de Nível), cap. 3
(Classes), cap. 5 (Talentos) e cap. 7 (Magias), e conferido com o SRD 5.2.

## Decisões

1. **O conteúdo fica no código, não no banco** (`packages/rules`):
   - `classes/`: as 12 classes do nível 1 ao 20 (colunas da tabela, características, a
     subclasse do SRD de cada uma, espaços de magia), `feats.ts` (talentos de nível e Dádivas
     Épicas), `creation/species-spells.ts` (magias de espécie).
   - `spells/data/`: as **339 magias do SRD 5.2**, uma lista por círculo, geradas por
     `packages/rules/scripts/spells/gen.py` a partir de `srd-spells.json` (extraído do PDF
     oficial do SRD), `names-pt.json` (nomes do livro, ADR-004) e `tr/*.json` (textos escritos
     para o site, em metros, e ajustes da automação). Não edite `spells/data` à mão.
   - Por quê: é igual para todo mundo, precisa funcionar sem conta e sem internet, a API grátis
     dorme (ADR-009) e cada correção passa por testes e pelo Git.
   - O **banco e a ficha guardam só escolhas**: ids das magias (`spells`), histórico de níveis
     (`progression`), usos gastos (`state.resources`), o que está ligado (`state.active`),
     espaços gastos e a Concentração.
2. **Licença.** Só entra o que está no SRD 5.2 (CC BY 4.0, atribuição em Créditos). Os textos
   são escritos para o site a partir do SRD, nunca copiados do livro; nomes sem personagens
   ("Esfera Resiliente"). O que só existe no livro entra como **"Outro (do livro)"** (subclasse,
   talento, magia), preenchido pelo jogador (mesma regra do ADR-008).
3. **Ficha v2** (`schemaVersion: 2`) com migração v1 → v2 (`shared/src/sheet/migrations.ts`)
   aplicada no navegador, no cache da conta e na API ao ler (fichas antigas do Neon continuam
   abrindo; testes com fichas v1 de exemplo). Seções novas `progression` e `spells`.
4. **Motor das habilidades** (`rules/src/engine`): cada característica declara `resource`
   (usos e recarga), `activation` (ligar/desligar ou usar), `passive`, `optionEffects` (efeito
   da opção escolhida) e `conditional` (efeitos que valem quando outras estão ligadas, como o
   Frenesi). Os efeitos são tipados (bônus de ataque/dano com filtro, dados extras uma vez por
   turno, vantagem, resistência, CA, deslocamento, crítico, PV máximo, CD de magia…).
   `deriveSheet` aplica tudo e cada número diz de onde veio. As magias com efeito numérico
   (Bênção, Escudo da Fé, Armadura Arcana, Marca do Predador…) ficam em `spells/effects.ts`
   (pequeno, vai com a ficha) e podem ser marcadas "em você".
5. **Subida de nível** (`rules/src/levelup`): `levelUpSteps` diz, por nível, o que ganha e o
   que escolher; `applyLevelUp` aplica e guarda o histórico. Obrigatórias: subclasse, atributo
   ou talento, Dádiva Épica, opções e Estilo de Luta; as outras (magias, perícias…) dá para
   deixar para a ficha. PV: média do livro ou rolagem. Desfazer: um aviso com "Desfazer"
   devolve a ficha de antes (em memória). Ficha feita à mão escolhe a classe na hora.
   Multiclasse fica para depois.
6. **Carregamento.** A lista de magias (≈ 72 kB compactado) só baixa ao abrir a aba Magias ou a
   subida de nível. As regras foram divididas em dois pedaços (`vite.config.ts`): o rolador
   (que `/dados` usa) e o resto (classes e motor, só a ficha e o assistente). `withModifier`
   passou para `dice/` para `/dados` não puxar as classes. Orçamentos: `/ficha` 115 kB (era
   100: a ficha agora traz o motor e as 12 classes), aba Magias 90 kB, subir de nível 100 kB.

## Consequências

- Corrigir uma magia = editar `tr/*.json` e rodar o gerador; os testes conferem 339 magias,
  listas por classe iguais ao SRD, dados válidos no rolador e que toda magia citada por classes,
  subclasses e espécies existe.
- O alcance da arma não está na ficha: Destreza fixa conta como à distância (é como o
  assistente monta arcos), Acuidade e Força como corpo a corpo.
- A Armadura Arcana só vale se der CA maior que a atual (a ficha não sabe se há armadura).
- Próximos passos: etapa de magias no assistente (hoje as magias de classe e do Iniciado em
  Magia são escolhidas na aba Magias), multiclasse, separar os textos das classes do motor para
  a ficha ficar mais leve.
