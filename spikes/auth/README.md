# Spike de login (descartável)

Experimento da Etapa 9 para a decisão #7 (biblioteca de login). **Não é código do produto**:
fica fora do workspace do pnpm, do lint, dos testes e do CI. O resultado está no
[ADR-007](../../docs/adr/007-decisoes-do-r2.md). Pode apagar a pasta quando o login real existir.

O que ele prova, com Better Auth 1.7 + Fastify 5 + Drizzle + Postgres:

- cadastro e login com e-mail e senha; cookie `HttpOnly` + `SameSite=Lax`;
- a sessão é lida numa rota nossa do Fastify;
- ids vêm da nossa porta `IdGenerator`; `name` vira `display_name`; campo extra `is_synthetic`;
- e-mail repetido (maiúsculas/minúsculas) é recusado;
- pedido de outra origem é recusado (proteção contra CSRF por `trustedOrigins`);
- login com Discord gera o endereço de autorização (sem credenciais reais, só a primeira etapa);
- o plugin `testUtils` cria uma sessão por id de usuário — o `/__test__/session` do plano.

Rodar (com o Postgres do `docker compose` no ar):

```bash
cd spikes/auth
npm install
npm run spike
```

`schema.ts` foi gerado por `npx auth@latest generate` e o banco de teste (`spike_auth_test`)
é criado e recriado a cada execução.
