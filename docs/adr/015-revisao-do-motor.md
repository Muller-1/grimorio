# ADR-015 — Revisão do motor de regras

- **Status:** aceito
- **Data:** 2026-10-30

## Contexto

Uma revisão do motor de regras apontou oito pontos. Dois eram defeitos com conta errada e foram
corrigidos antes (`768080c`: desfazer dano devolve as falhas contra a morte; `7e353d1`: crítico
no 1º acerto dobra também Ataque Furtivo e Frenesi). Os outros seis eram limites do modelo da
ficha: armadura, duração dos efeitos, condições que só viravam texto, ids ligados repetidos,
tipo da arma deduzido pelo atributo e a ficha recalculada várias vezes por edição.

Em todos, a regra foi a mesma das versões anteriores: **guardar as escolhas, calcular o resto**
(plano v2, 9.1), e nenhuma ficha salva deixa de abrir. Os campos novos são opcionais; o que as
fichas antigas não têm, o site deduz como antes ou organiza uma vez ao abrir.

## Decisões

1. **Ids ligados são únicos** (`state.active`). O schema tira a repetição ao ler a ficha,
   `normalizeSheet` também, e a invariante `duplicate-active` acusa. O motor já conferia por
   conjunto; quem percorria a lista (chips, campanha) mostrava em dobro.

2. **A ficha derivada é calculada uma vez por versão da ficha** (`features/sheet/derived.ts`).
   A ficha do store nunca é alterada no lugar, então o próprio objeto serve de chave num
   `WeakMap`: todos os painéis e a ação seguinte usam o mesmo cálculo. `applySheetAction` e
   `normalizeSheet` aceitam a ficha derivada pronta como parâmetro opcional. Foi escolhido em vez
   de guardar `derived` no store porque não muda nenhum componente e funciona também para fichas
   fora do store (Painel, campanha).

3. **A arma guarda o tipo e as propriedades** (`range`, `finesse`, `thrown`, `twoHanded`, `light`,
   `reach`, `rangeM`). Arquearia e Ataque Furtivo olham para eles, não para o atributo.
   `ability: 'finesse'` continua dizendo "use o maior atributo"; a propriedade Acuidade é
   `finesse` (o Cajado do Monge usa o maior atributo sem ter Acuidade). Arma sem os campos
   (ficha antiga): Destreza fixa = à distância, "Acuidade" = Acuidade, como antes. O assistente
   preenche tudo a partir do texto da tabela do livro.

4. **Armadura e Escudo são itens do Inventário com números** (`item.armor`: tipo, CA base, teto
   de Destreza, Força exigida, Furtividade, bônus mágico). Vestida = item marcado. A CA sai da
   armadura vestida; o ajuste manual continua valendo no lugar dela e do Escudo.
   - Estilo Defesa (`ac-bonus` com `requiresArmor`) só soma vestindo armadura; sem ela, aparece
     um lembrete.
   - Fórmulas sem armadura (Defesa sem Armadura do Bárbaro e do Monge, Armadura Arcana,
     Resiliência Dracônica) só valem sem armadura; as que pedem "sem Escudo", sem Escudo.
   - Força abaixo da exigida tira 3 m enquanto vestida; Desvantagem em Furtividade vai para a
     perícia.
   - O assistente não grava mais a CA manual nem tira os 3 m do deslocamento guardado: põe a
     armadura no Inventário e guarda o Estilo de Luta do nível 1 em `creation.fightingStyleId`.
   - Fichas antigas (`upgradeSheetContent`, ao abrir): armadura com nome do livro ganha os
     números. Se a CA manual é exatamente a que o assistente calculava (refeita com os atributos
     e o equipamento da criação), ela sai, o Estilo de Luta vai para o registro e os 3 m voltam;
     se o jogador mudou a CA, ela fica. Assim nenhum número muda na hora de abrir.
   - Fica de fora: treinamento em armadura (sem ele, Desvantagem e sem magias) e armadura de
     criatura grande.

5. **Condições: o que a ficha aplica sozinha fica separado do que a mesa decide.** Efeitos novos:
   `auto-fail-save` (a salvaguarda vira "Falha" e não rola), `cannot-act` (sem ações, Ações
   Bônus ou Reações; com `breaksConcentration`, encerra a Concentração ao ligar) e
   `cannot-attack-target`. Lembretes que dependem de posição, visão ou alvo levam
   `situational` e aparecem em "Depende da situação (você e o Mestre decidem)". A ficha não
   impede atacar quando está sem ações: avisa, porque a mesa pode ter um motivo.

6. **Efeitos ligados têm início, duração e origem**, sem trocar a lista de ids. Os detalhes ficam
   ao lado, em `state.activeInfo` (por id), e os da Concentração em `concentrationInfo` (a magia
   pode estar em outra criatura). Trocar `active` por objetos mexeria na campanha, na API e em
   todo lugar que lê a lista; os detalhes ao lado dão o mesmo resultado e cada parte pode migrar
   depois, se precisar.
   - Relógio: `state.round` (Começar combate, Próxima rodada, Encerrar). Um efeito acaba no
     início da rodada `início + duração em rodadas` (1 minuto = 10). O que estava ligado antes do
     combate conta da rodada 1. Encerrar tira o que dura rodadas e para de contar o resto.
   - Fora de combate não há relógio: o descanso curto passa 1 hora (acaba o que dura até 1 hora)
     e o longo encerra as magias, como antes.
   - A duração das magias vem do livro: as magias que a ficha calcula têm `duration` (gerador das
     magias) e a aba Magias passa a duração ao conjurar com Concentração.
   - Condição pode durar N rodadas ("até o próximo turno" = 1). Sem isso, fica até tirar.
   - "Em quem" ainda é implícito: tudo em `active` está no personagem; magia lançada em outra
     criatura só aparece pela Concentração.

## Tamanho

A página da ficha ficou em 118 kB de 120: os textos dos editores e do Inventário foram para
`lib/i18n/editors` (carregam com essas telas) e os talentos saíram do pedaço das regras (vêm com
a subida de nível, cujo orçamento foi de 108 para 112 kB).

## Testes

Unidade: armadura (`inventory/armor.test.ts`), condições (`engine/conditions.test.ts`), duração
(`engine/durations.test.ts`), arma, ficha derivada e as invariantes com as ações novas no teste
de propriedade. Bot: cenário B18 (arma, armadura, Atordoado, rodadas), nas telas de computador e
de celular.
