# Publicar com contas (para um grupo de teste)

Resultado: o site em `https://NOME.pages.dev`, com **Entrar com Google** e fichas salvas na
conta, para as pessoas que você colocar na lista de teste do Google. Tudo no plano grátis.
Por que foi feito assim: [ADR-009](adr/009-publicacao-com-contas.md).

## Como as peças se encaixam

```
navegador ──► Cloudflare Pages (o site)  ──/api/*──►  Render (a API)  ──►  Neon (o banco)
                 NOME.pages.dev                       grimorio-api.onrender.com
```

- O navegador só conversa com o endereço do site. Uma função da Cloudflare leva o que for
  `/api/...` até a API e traz a resposta. É isso que faz o login funcionar em todos os
  navegadores.
- A API **dorme depois de 15 min sem uso** e leva cerca de 1 minuto para acordar. O site
  funciona nesse meio-tempo; só a parte da conta espera.
- Segredos (senha do banco, chaves do Google, `PROXY_SECRET`) só vão nos painéis do Render e da
  Cloudflare. Nunca no Git nem em conversas.

Ordem: **Neon → Cloudflare → Render → Cloudflare de novo → Google → testar.** Cada passo usa um
endereço que o anterior criou.

## 0. Antes: o código no GitHub

O Render e a Cloudflare pegam o código do GitHub. No terminal do VS Code, na pasta `grimorio`:

```bash
git status      # NÃO pode aparecer nenhum arquivo .env (eles ficam fora do Git)
git add -A
git commit -m "Descrição do que mudou"
git push
```

## 1. Banco no Neon

1. Entre em <https://neon.com> (pode usar a conta do GitHub) e crie um projeto:
   - **Project name:** `grimorio`
   - **Cloud provider:** AWS · **Region:** **US East 1 (N. Virginia)** (perto da API)
   - versão do Postgres: a que vier marcada.
2. No painel do projeto, clique em **Connect** e copie o endereço de conexão (começa com
   `postgresql://`). Ele contém a senha do banco: guarde-o só até o passo 3.

Não precisa criar tabelas: a API cria sozinha quando sobe.

## 2. Site na Cloudflare Pages

Se o projeto já existe na Cloudflare, pule para o passo 3 e só anote o endereço dele.

1. <https://dash.cloudflare.com> → **Workers & Pages** → **Create application** → **Pages** →
   **Connect to Git**. Autorize o GitHub e escolha o repositório `grimorio`.
2. Em **Set up builds and deployments**:

   | Campo                  | Valor           |
   | ---------------------- | --------------- |
   | Project name           | `grimorio`      |
   | Production branch      | `main`          |
   | Framework preset       | `None`          |
   | Build command          | `pnpm build`    |
   | Build output directory | `apps/web/dist` |
   | Root directory         | (vazio)         |

   Em **Environment variables**: `PNPM_VERSION` = `10.28.0`.

3. **Save and Deploy**. Em poucos minutos aparece o endereço, por exemplo
   `https://grimorio.pages.dev`. Se o nome já for de outra pessoa, a Cloudflare acrescenta
   letras no fim. **Anote o endereço exato**: ele é o `SITE_URL`.

Abra o endereço: o site já funciona, ainda sem contas.

## 3. API no Render

1. <https://dashboard.render.com> (pode usar a conta do GitHub) → **New** → **Blueprint** →
   **Connect** ao lado do repositório `grimorio`. O Render lê o arquivo `render.yaml` e mostra
   o serviço `grimorio-api` (plano _Free_).
2. Ele pede quatro valores:

   | Variável               | O que colocar                                                  |
   | ---------------------- | -------------------------------------------------------------- |
   | `SITE_URL`             | o endereço do passo 2, **sem barra no fim**                    |
   | `DATABASE_URL`         | o endereço do Neon (passo 1)                                   |
   | `GOOGLE_CLIENT_ID`     | o mesmo do seu `apps/api/.env`                                 |
   | `GOOGLE_CLIENT_SECRET` | o mesmo do seu `apps/api/.env`                                 |

   `AUTH_SECRET` e `PROXY_SECRET` o Render gera sozinho.

3. **Deploy Blueprint**. A primeira montagem leva alguns minutos. Quando o serviço ficar
   **Live**, o endereço aparece no topo, algo como `https://grimorio-api.onrender.com`.
4. Teste abrindo `https://grimorio-api.onrender.com/ready`. Deve aparecer
   `{"status":"ready","checks":{"database":"ok"}}`.
5. No serviço → **Environment**, revele e copie o valor de **`PROXY_SECRET`** (vai para o passo
   seguinte).

## 4. Ligar as contas no site (Cloudflare)

1. No projeto da Pages → **Settings** → **Variables and Secrets** → **Add**, no ambiente
   **Production**:

   | Nome               | Tipo   | Valor                                      |
   | ------------------ | ------ | ------------------------------------------ |
   | `VITE_ACCOUNTS`    | Text   | `true`                                     |
   | `API_ORIGIN`       | Text   | o endereço da API (passo 3), sem barra     |
   | `API_PROXY_SECRET` | Secret | o `PROXY_SECRET` copiado do Render         |

2. **Deployments** → no último → **⋯** → **Retry deployment** (as variáveis só entram numa
   publicação nova).

## 5. Google

No <https://console.cloud.google.com>, no mesmo projeto do login local:

1. **Google Auth Platform → Clientes** → o seu cliente. Acrescente, sem apagar os de
   `localhost`:
   - **Origens JavaScript autorizadas:** `https://grimorio.pages.dev` (o seu endereço)
   - **URIs de redirecionamento autorizados:** `https://grimorio.pages.dev/api/auth/callback/google`
2. **Público-alvo (Audience) → Usuários de teste → Add users**: o Gmail de cada amigo (até
   100). Deixe o app em **Teste**: só entra quem está nessa lista.

O Google pode levar alguns minutos para aplicar.

## 6. Testar

1. Abra `https://grimorio.pages.dev/entrar` → **Entrar com Google**. Se a API estava dormindo,
   o primeiro acesso demora até 1 minuto.
2. Em **Fichas**, clique em **Criar personagem** e siga o assistente. O personagem deve aparecer
   em **Meus personagens** e também abrir em outro aparelho, com a mesma conta.
3. Mande o link para os amigos. Eles precisam usar exatamente o Gmail que você colocou na lista.

### Ver os dados com o pgAdmin (opcional)

Em **Register → Server**: aba _Connection_ com o host do Neon (o trecho depois do `@`, até a
`/`), porta `5432`, banco `neondb`, usuário e senha do endereço; aba _Parameters_ com
**SSL mode** = `require`. As fichas ficam na tabela `characters`.

## Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| Ícone de nuvem riscada no canto do site | API dormindo (espere 1 min e recarregue) ou `API_ORIGIN`/`API_PROXY_SECRET` errados na Cloudflare |
| Não aparece o botão **Entrar** | falta `VITE_ACCOUNTS=true` na Cloudflare, ou faltou o **Retry deployment** |
| Google mostra `redirect_uri_mismatch` | o URI no Google não é exatamente `https://SEU-SITE/api/auth/callback/google` |
| Google mostra "acesso bloqueado" | o Gmail não está em **Usuários de teste** |
| `/ready` da API mostra `"database":"down"` | `DATABASE_URL` errado no Render (copie de novo do Neon) |
| A API não sobe no Render: "Variáveis de ambiente inválidas" | `SITE_URL` sem `https://` ou com barra no fim |
| Abrir a API direto mostra `FORBIDDEN` | normal: ela só atende pelo endereço do site (menos `/health`, `/ready`, `/version`) |

## Atualizações

Depois de tudo ligado, cada `git push` na `main` publica sozinho: o site na Cloudflare e, se
mudou algo da API, a API no Render, que também aplica as migrações novas ao subir.
