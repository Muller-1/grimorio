-- Roda uma única vez, quando o volume do Postgres é criado (docker-compose.yml).
-- O app_dev já é criado pela variável POSTGRES_DB; aqui entram o banco dos testes e o do teste
-- de carga (num volume que já existia, o `pnpm load:up` cria o de carga).
CREATE DATABASE app_test;
CREATE DATABASE app_carga_staging;
