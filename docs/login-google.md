# Login com Google — passo a passo (computador local)

Resultado: `pnpm dev` + `pnpm dev:api` e o botão **Entrar com Google** funcionando em
`http://localhost:5173`. Detalhes técnicos no [ADR-008](adr/008-login-google-e-fichas-na-conta.md).

## 1. Credenciais no Google Cloud (uma vez)

1. Abra <https://console.cloud.google.com> e crie um projeto (ex.: `grimorio`).
2. **APIs e serviços → Tela de consentimento OAuth** (ou **Google Auth Platform → Branding**):
   - nome do app, e-mail de suporte, público **Externo**;
   - em **Público/Audience**, deixe em **Teste** e adicione o seu Gmail em **Usuários de teste**
     (enquanto o app estiver em teste, só quem está nessa lista consegue entrar).
3. **Clientes** (ou **Credenciais → Criar credenciais → ID do cliente OAuth**):
   - tipo **Aplicativo da Web**;
   - **Origens JavaScript autorizadas:** `http://localhost:5173`
   - **URIs de redirecionamento autorizados:** `http://localhost:5173/api/auth/callback/google`
4. Copie o **ID do cliente** e a **Chave secreta do cliente**. Elas nunca vão para o Git nem para
   conversas; ficam só no `apps/api/.env`.

## 2. Configurar a API

```bash
cp apps/api/.env.example apps/api/.env      # se ainda não tiver
```

No `apps/api/.env`, preencha:

```env
SITE_URL=http://localhost:5173
AUTH_SECRET=<gere com o comando abaixo>
GOOGLE_CLIENT_ID=<ID do cliente>
GOOGLE_CLIENT_SECRET=<chave secreta>
```

Para gerar o `AUTH_SECRET`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

## 3. Rodar

```bash
pnpm install          # entraram dependências novas (better-auth)
pnpm db:up            # Postgres no Docker
pnpm db:migrate       # cria sessions, accounts, verifications e characters
pnpm dev:api          # API em :3000
pnpm dev              # site em :5173 (em outro terminal)
```

Abra `http://localhost:5173/entrar` → **Entrar com Google**. Depois de entrar, o avatar aparece no
canto e **Fichas → Criar personagem** salva o personagem na conta.

## Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| Botão do Google desabilitado com "ainda não foi configurado" | `GOOGLE_CLIENT_ID`/`SECRET` vazios no `.env` (reinicie a API) |
| Google mostra `redirect_uri_mismatch` | o URI de redirecionamento no Google não é exatamente `http://localhost:5173/api/auth/callback/google` |
| Google mostra "acesso bloqueado / app não verificado" | o seu e-mail não está em **Usuários de teste** |
| Ícone de nuvem riscada no canto | a API não está rodando (`pnpm dev:api`) ou o banco está desligado (`pnpm db:up`) |
| A API não sobe: "Variáveis de ambiente inválidas" | falta `AUTH_SECRET` (32+ caracteres) no `.env` |

## Publicado (grupo de teste)

Passo a passo completo em [publicar-com-contas.md](publicar-com-contas.md) (ADR-009). No Google,
acrescente o endereço do site nas origens e `https://SEU-SITE/api/auth/callback/google` nos
redirecionamentos, e coloque cada pessoa que vai testar em **Usuários de teste**. Antes de abrir
ao público: revisão jurídica (decisão #4) e publicar o app no Google.
