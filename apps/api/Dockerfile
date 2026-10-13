# Imagem da API para o Render (ADR-009). Só a API: o site vai para a Cloudflare Pages.
# Contexto do build: a RAIZ do repositório (o render.yaml já aponta assim).
#   docker build -f apps/api/Dockerfile -t grimorio-api .

# 1) Montagem: instala tudo, empacota a API e reinstala só as dependências de produção.
FROM node:24-alpine AS build
# Mesma versão do "packageManager" do package.json da raiz.
RUN npm install --global pnpm@10.28.0
WORKDIR /repo
ENV CI=true
COPY . .
RUN pnpm install --frozen-lockfile --filter "@grimorio/api..." \
 && pnpm build:api \
 && rm -rf node_modules apps/*/node_modules packages/*/node_modules \
 && pnpm install --frozen-lockfile --prod --offline --filter @grimorio/api

# 2) Imagem final: Node + a API empacotada (dist/), as migrações e as dependências de produção.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /repo/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=node:node /repo/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /repo/apps/api/drizzle ./apps/api/drizzle
# Roda como o usuário "node", não como administrador.
USER node
WORKDIR /app/apps/api
# O Render informa a porta em PORT (a API lê sozinha). 10000 é o padrão dele.
EXPOSE 10000
# Aplica as migrações pendentes e sobe a API. As migrações só acrescentam (ADR-008), e rodar de
# novo quando não há nada novo não faz nada — por isso dá para rodar a cada início.
CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/server.js"]
