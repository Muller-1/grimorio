# Publicação (Etapa 8)

Como colocar o site no ar na **Cloudflare Pages**, ligar os canais que ainda estão em aberto e
ativar o monitor B14. As decisões por trás disto estão no
[ADR-005](adr/005-publicacao-cloudflare.md).

## 1. Subir o repositório para o GitHub

1. Em [github.com/new](https://github.com/new), crie um repositório **vazio** (sem README,
   sem .gitignore). Público deixa o GitHub Actions gratuito sem limite de minutos.
2. Na pasta do projeto:

   ```bash
   git remote add origin https://github.com/SEU-USUARIO/grimorio.git
   git push -u origin main
   ```

3. O CI roda sozinho no primeiro push. Em **Settings → Branches**, proteja a `main` exigindo os
   checks `check`, `bot` e `lighthouse` antes do merge (Etapa 2).

## 2. Criar o projeto na Cloudflare Pages

1. No painel da Cloudflare: **Workers & Pages → Create application → aba Pages → Import an
   existing Git repository**. Autorize o GitHub e escolha o repositório.
2. Configuração do build:

   | Campo                  | Valor           |
   | ---------------------- | --------------- |
   | Production branch      | `main`          |
   | Framework preset       | `None`          |
   | Build command          | `pnpm build`    |
   | Build output directory | `apps/web/dist` |
   | Root directory         | (deixe vazio)   |

3. Em **Environment variables**, adicione `PNPM_VERSION` = `10.28.0` (a Cloudflare usa outra
   versão por padrão). O Node vem do arquivo `.nvmrc` sozinho.
4. **Save and Deploy**. O endereço fica como `https://NOME-DO-PROJETO.pages.dev`.

Depois disso:

- todo push na `main` publica em produção;
- todo pull request ganha um endereço de pré-visualização, que aparece como comentário no PR.
  Esses endereços não são indexados por buscadores (a Cloudflare manda `X-Robots-Tag: noindex`);
- os cabeçalhos de segurança vêm de `apps/web/public/_headers` e o 404 de `404.html`, gerado no
  build. Não é preciso configurar nada disso no painel.

### Conferir depois de publicar

```bash
pnpm bot --scenario=B14 --env=https://NOME-DO-PROJETO.pages.dev
```

Se passar, o site abre, rola dados e não tem nada bloqueado pela política de segurança.

> **Cuidado com recursos "automáticos" da Cloudflare** num domínio próprio: _Rocket Loader_,
> _Email Address Obfuscation_ e _Web Analytics_ injetam scripts que a política de segurança do
> site bloqueia. Deixe-os desligados (o B14 acusa se algum for ligado).

## 3. Ligar "Relatar problema", apoio e contato

Tudo é configurado por variáveis de ambiente **da Cloudflare** (Settings → Variables and
Secrets, tipo _Text_, ambiente _Production_; repita em _Preview_ se quiser). Depois de mudar,
faça um novo deploy (**Deployments → ⋯ → Retry deployment**) — os valores entram no build.

| Variável                | Para quê                                          | Exemplo                                                            |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| `VITE_REPORT_URL`       | Link "Relatar problema" (RF-104)                  | ver abaixo                                                         |
| `VITE_SUPPORT_PLATFORM` | Nome da plataforma de apoio (decisão #2)          | `Apoia.se`                                                         |
| `VITE_SUPPORT_URL`      | Link da página de apoio                           | `https://apoia.se/grimorio`                                        |
| `VITE_CONTACT_EMAIL`    | E-mail para pedidos sobre dados (termos/privac.)  | `contato@exemplo.com`                                              |

Só links `https://` são aceitos. Sem valor, o site mostra que o canal ainda não existe.

**Relatar problema pelo GitHub** (o mais simples): use as issues do próprio repositório.
`{pagina}` e `{versao}` são trocados pela página e pela versão do site:

```
https://github.com/SEU-USUARIO/grimorio/issues/new?title=Problema%20em%20{pagina}&body=Vers%C3%A3o%3A%20{versao}%0A%0AO%20que%20aconteceu%3F
```

(Quem relata precisa de conta no GitHub. Um Google Forms também serve: sem os marcadores, a
página e a versão vão no fim do link como `?pagina=…&versao=…`.)

## 4. Ligar o monitor B14

No GitHub: **Settings → Secrets and variables → Actions → aba Variables → New repository
variable**:

- Nome: `PRODUCTION_URL`
- Valor: `https://NOME-DO-PROJETO.pages.dev` (sem barra no fim)

A partir daí, a cada 30 minutos o workflow **Monitor sintético (B14)** abre `/dados`, rola `1d20`
e confere o total. Depois de 2 falhas seguidas ele abre uma issue, e o GitHub avisa por e-mail.
Dá para rodar na hora em **Actions → Monitor sintético (B14) → Run workflow**.

- Em repositório privado, cada execução gasta de 1 a 2 minutos da cota gratuita de Actions.
  Se for o caso, troque `*/30 * * * *` por `0 * * * *` (a cada hora) em
  `.github/workflows/sintetico.yml`.
- O GitHub pode pausar agendamentos de repositórios sem nenhuma atividade por 60 dias; um
  commit reativa.

## 5. Domínio próprio (decisão #3)

Quando o nome estiver escolhido (sem "D&D" nem "Dungeons & Dragons"): no projeto da Pages,
**Custom domains → Set up a custom domain**. O HTTPS é automático. Depois, atualize a variável
`PRODUCTION_URL` do GitHub.

## Checklist de lançamento (plano de início, Etapa 8)

- [ ] Site acessível no domínio escolhido, com HTTPS.
- [ ] B1, B11, B12 verdes no CI (build de teste servido como a Cloudflare serve, com os mesmos
      cabeçalhos); B14 verde contra a produção.
- [ ] Orçamentos de tamanho e Lighthouse passando (jobs `check` e `lighthouse` do CI).
- [ ] Nenhuma marca do jogo original no nome, logo ou textos (teste automático em
      `apps/web/build/brand.test.ts`).
- [ ] Termos, privacidade e apoio publicados (e `VITE_SUPPORT_*` configurado quando a decisão #2
      sair).
- [ ] Três pessoas usaram o rolador numa sessão de jogo e deram retorno.

## Rodar as verificações no seu computador

```bash
pnpm build && pnpm size     # orçamentos de tamanho
pnpm lighthouse             # precisa do Google Chrome instalado; relatórios em .lighthouseci/
pnpm --filter @grimorio/web preview   # o site de produção em http://localhost:4173
```
