# Publicação (Etapa 8)

Como colocar o site no ar na **Cloudflare** (Worker com arquivos estáticos; antes, Pages), ligar os canais que ainda estão em aberto e
ativar o monitor B14. As decisões por trás disto estão no
[ADR-005](adr/005-publicacao-cloudflare.md).

> **Com contas (login e fichas na conta):** siga [publicar-com-contas.md](publicar-com-contas.md),
> que inclui a criação do projeto na Cloudflare, a API no Render e o banco no Neon (ADR-009).

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

## 2. Criar o projeto na Cloudflare

O site é publicado como **Worker com arquivos estáticos** (o tipo que o painel da Cloudflare
cria hoje), configurado pelo `wrangler.jsonc` da raiz ([ADR-009](adr/009-publicacao-com-contas.md)).
Passo a passo no item 1 de [publicar-com-contas.md](publicar-com-contas.md): build `pnpm build`,
deploy `npx wrangler deploy`. O endereço fica como `https://grimorio.SUA-CONTA.workers.dev`.

Depois disso:

- todo push na `main` publica em produção;
- os cabeçalhos de segurança vêm de `apps/web/public/_headers` e o 404 de `404.html`, gerado no
  build (o `wrangler.jsonc` liga os dois). Não é preciso configurar nada disso no painel.

### Conferir depois de publicar

```bash
pnpm bot --scenario=B14 --env=https://grimorio.SUA-CONTA.workers.dev
```

Se passar, o site abre, rola dados e não tem nada bloqueado pela política de segurança.

> **Cuidado com recursos "automáticos" da Cloudflare** num domínio próprio: _Rocket Loader_,
> _Email Address Obfuscation_ e _Web Analytics_ injetam scripts que a política de segurança do
> site bloqueia. Deixe-os desligados (o B14 acusa se algum for ligado).

## 3. Ligar "Relatar problema", apoio e contato

Tudo é configurado por variáveis **do build** na Cloudflare (no Worker: Settings → Build →
Variables and secrets). Depois de mudar, publique de novo (um `git push`, ou
`git commit --allow-empty -m "publicar de novo"` e `git push`) — os valores entram no build.

| Variável                | Para quê                                          | Exemplo                                                            |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| `VITE_REPORT_URL`       | Link "Relatar problema" (RF-104)                  | ver abaixo                                                         |
| `VITE_SUPPORT_PLATFORM` | Nome da plataforma de apoio (decisão #2)          | `Apoia.se`                                                         |
| `VITE_SUPPORT_URL`      | Link da página de apoio                           | `https://apoia.se/grimorio`                                        |
| `VITE_CONTACT_EMAIL`    | E-mail para pedidos sobre dados (termos/privac.)  | `contato@exemplo.com`                                              |
| `VITE_ACCOUNTS`         | Liga contas/login (ADR-008/009). Só com a API ligada | `true` (com `API_ORIGIN` e `API_PROXY_SECRET`: [publicar-com-contas.md](publicar-com-contas.md)) |

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
- Valor: `https://grimorio.SUA-CONTA.workers.dev` (sem barra no fim)

A partir daí, a cada 30 minutos o workflow **Monitor sintético (B14)** abre `/dados`, rola `1d20`
e confere o total. Depois de 2 falhas seguidas ele abre uma issue, e o GitHub avisa por e-mail.
Dá para rodar na hora em **Actions → Monitor sintético (B14) → Run workflow**.

- Em repositório privado, cada execução gasta de 1 a 2 minutos da cota gratuita de Actions.
  Se for o caso, troque `*/30 * * * *` por `0 * * * *` (a cada hora) em
  `.github/workflows/sintetico.yml`.
- O GitHub pode pausar agendamentos de repositórios sem nenhuma atividade por 60 dias; um
  commit reativa.

## 5. Domínio próprio (decisão #3)

Quando o nome estiver escolhido (sem "D&D" nem "Dungeons & Dragons"): no Worker, **Settings →
Domains & Routes → Add → Custom domain**. O HTTPS é automático. Depois, atualize a variável
`PRODUCTION_URL` do GitHub, o `SITE_URL` do Render, a variável de build `VITE_SITE_URL` do
Worker (seção 6) e os endereços no Google (tela de consentimento e "URIs de redirecionamento").

## 6. Aparecer no Google (ADR-013)

O site já gera `sitemap.xml`, `robots.txt`, endereço canônico e a prévia de link. Falta dizer
ao Google que o site é seu:

1. Abra o **Google Search Console** (search.google.com/search-console) com a sua conta Google.
2. **Adicionar propriedade → Prefixo do URL** → `https://grimorio.SUA-CONTA.workers.dev/`.
   (A opção "Domínio" pede um registro de DNS, que só existe com domínio próprio.)
3. Método **Tag HTML**: o Google mostra `<meta name="google-site-verification" content="XXXX" />`.
   Copie **só o código** `XXXX`.
4. Na Cloudflare, no Worker: **Settings → Build → Variables and secrets → Add**:
   `VITE_GOOGLE_SITE_VERIFICATION` = `XXXX`. Publique de novo (um `git push`, como na seção 3).
5. Quando o site novo estiver no ar, volte ao Search Console e clique em **Verificar**.
6. Menu **Sitemaps** → digite `sitemap.xml` → **Enviar**.
7. Opcional: **Inspeção de URL** na página inicial → **Solicitar indexação**.

O Google leva de alguns dias a algumas semanas para mostrar o site. Com domínio próprio, crie
outra propriedade para ele e mude `VITE_SITE_URL` para o endereço novo (sem barra no fim).

| Variável de build                | Para quê                                        | Padrão                         |
| -------------------------------- | ----------------------------------------------- | ------------------------------ |
| `VITE_SITE_URL`                  | Endereço canônico, sitemap e prévia de link     | o endereço `workers.dev` atual |
| `VITE_GOOGLE_SITE_VERIFICATION`  | Verificação do Search Console (só o código)     | vazio                          |

## 7. Manter a API acordada (opcional)

No plano grátis do Render, a API dorme depois de 15 min sem uso e leva até 1 minuto para
acordar. O site já avisa ("Acordando o servidor…") e tenta de novo sozinho. Para evitar a
espera:

- **Grátis:** um monitor externo (ex.: UptimeRobot) chamando
  `https://SUA-API.onrender.com/health` a cada 5 minutos. A rota `/health` não toca no banco, então
  o Neon continua dormindo quando ninguém usa. O plano grátis do Render dá 750 horas por mês
  por conta: dá para **um** serviço ligado o mês inteiro, não para dois.
- **Pago:** plano Starter do Render (não dorme).

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
- [ ] Site verificado no Search Console e `sitemap.xml` enviado (seção 6).
- [ ] `VITE_CONTACT_EMAIL` e `VITE_REPORT_URL` configurados (a privacidade cita o contato).

## Rodar as verificações no seu computador

```bash
pnpm build && pnpm size     # orçamentos de tamanho
pnpm lighthouse             # precisa do Google Chrome instalado; relatórios em .lighthouseci/
pnpm --filter @grimorio/web preview   # o site de produção em http://localhost:4173
```
