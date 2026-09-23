# ADR-004 — Terminologia e edição das regras

- **Status:** aceito
- **Data:** 2026-09-22
- **Decide:** #5 do plano (terminologia) e confirma a edição de 2024 para a ficha local

## Decisão

1. **Termos:** a interface usa os nomes do Livro do Jogador de 2024 em português:
   - "Salvaguarda" (e não "teste de resistência");
   - "Salvaguardas contra Morte" (antes, no protótipo: "Testes Contra Morte");
   - "Inspiração Heroica" (antes: "Pontos de Inspiração");
   - "Deslocamento" (antes: "Movimento");
   - "Temporários" para os PV temporários (antes: "Extra");
   - perícias como no livro (ex.: "Lidar com Animais"), tipos de dano como no livro
     (ex.: "Ígneo", "Gélido", "Energético").
2. **Edição:** onde as regras de 2014 e 2024 diferem, a ficha segue as de **2024** (ex.: o
   descanso longo devolve todos os Dados de Vida). A decisão #1 continua valendo para a escolha
   do SRD que entra no R2 (a recomendação do plano também é o SRD 5.2).

## Consequências

- Todos os textos estão em `apps/web/src/lib/i18n/pt-BR.ts`; trocar um termo é mexer num lugar só.
- Quando a tradução PT-BR do SRD 5.2 entrar, conferir se ela usa os mesmos termos e ajustar aqui.
