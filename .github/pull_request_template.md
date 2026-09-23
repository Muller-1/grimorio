## O que muda

<!-- Uma ou duas frases. Qual etapa/issue? -->

## Como conferir

<!-- Comandos e o que olhar. -->

## Pronto geral (plano de início, seção 7)

- [ ] Tipos, lint e testes passando no CI.
- [ ] Testes novos para o comportamento novo (motor: escritos antes do código).
- [ ] Todo número novo exibido na tela tem `data-testid` e `data-value`.
- [ ] Nenhum texto de interface fora de `apps/web/src/lib/i18n`.
- [ ] Cenário do bot criado ou atualizado, se a mudança for visível ao usuário (a partir da Etapa 6).
- [ ] Nenhuma chamada direta a `Math.random`, `Date.now()` ou `crypto` fora das portas.
- [ ] Mudou o banco? Migração gerada (`db:generate`), conferida e que só **adiciona** (plano v2, 17).
- [ ] Serviço externo novo no site? `_headers` (CSP) e página de Privacidade atualizados juntos.
- [ ] Documentação ou ADR atualizado, se alguma decisão mudou.
