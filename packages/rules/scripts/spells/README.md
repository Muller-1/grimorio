# Gerador das magias (ADR-010)

Gera `packages/rules/src/spells/data/level-N.ts` e `packages/rules/src/spells/effects.ts`.

- `srd-spells.json`: as 339 magias do SRD 5.2 (CC BY 4.0), extraídas do PDF oficial.
- `names-pt.json`: nome em português de cada magia (termos do Livro do Jogador 2024).
- `tr/*.json`: o texto de cada magia, escrito para o site a partir do SRD (nunca copiado do
  livro), com medidas em metros. Campos: `text`, `higher`, `material` e, quando preciso,
  `castingTime`, `range`, `duration`, `auto` (acrescenta ou troca dados da automação: `damage`,
  `heal`, `effects`, `beams`, `tempHp`…) e `noAuto` (tira o que o detector errou).

Para corrigir uma magia, edite o `tr/*.json` dela e rode, na raiz do repositório:

```sh
python3 packages/rules/scripts/spells/gen.py --report   # magias sem texto e problemas
python3 packages/rules/scripts/spells/gen.py            # grava e formata com o Prettier
pnpm test                                               # confere as 339 magias
```
