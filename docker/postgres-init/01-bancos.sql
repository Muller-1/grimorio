-- Roda uma única vez, quando o volume do Postgres é criado (docker-compose.yml).
-- O app_dev já é criado pela variável POSTGRES_DB; aqui entra o banco dos testes.
CREATE DATABASE app_test;
