# AgroGestor Web

A versão web do AgroGestor: tudo o que o app tem (em **/gestao**) e mais a parte social.

- **Feed** estilo Reddit do agro: postagens com texto, imagens e vídeos, categorias, curtidas ❤️, **foguinho 🔥** e comentários com respostas. Ordens: *Em alta* (foguinhos recentes pesam mais), *Novos* e *Top* (30 dias). Filtro *Todos* / *Amigos*.
- **Amigos pelo ID**: cada conta ganha um ID (ex.: `AG-7K3P9Q`). Com a amizade aceita, vocês veem a fazenda um do outro: patrimônio, dinheiro, campos e lavouras, máquinas, animais e silo.
- **Perfil** com foto, banner e bio.
- **Bora jogar**: sem chat, só o convite. O amigo recebe um aviso na hora com o site aberto e uma notificação push no celular ou no computador (com os botões *Bora jogar!* / *Agora não*).
- **Minha fazenda**: publica no perfil um save do app de gestão aberto no mesmo navegador, ou um backup colado do app do celular/Windows (Ajustes › Copiar backup).

Feito em Next.js 16 (App Router) + React 19, animações com Motion (curvas ease-in-out e molas suaves).

## Serviços gratuitos (sem cartão, sem cobrança surpresa)

| O quê | Serviço | Plano grátis |
|---|---|---|
| Site | Vercel Hobby | grátis para uso pessoal; se passar do limite, pausa em vez de cobrar |
| Banco de dados | **Neon** (Postgres) pelo Marketplace da Vercel | 0,5 GB, sem cartão; dorme quando ninguém usa e acorda sozinho |
| Imagens e vídeos | **Vercel Blob** | cota mensal grátis no Hobby (confira o limite atual em Storage › Blob › Usage); no Hobby, ao estourar, o envio para em vez de cobrar. Vídeos limitados a 80 MB cada |
| Notificações push | Web Push (VAPID) | grátis, sem serviço externo |

Por que Neon e não Supabase: o Supabase grátis **pausa o projeto depois de 7 dias sem uso** e precisa ser reativado à mão; o Neon só “dorme” e acorda na primeira visita. O Turso também serviria, mas é SQLite e este código usa Postgres.

As imagens são reduzidas para no máximo 1600 px (WebP) no navegador antes do envio, para render bem a cota do Blob.

## Selos, privacidade e seguidores

- **Selos:** verde (Primeiros fazendeiros, automático para os 100 primeiros cadastros), vermelho (Criador de conteúdo), roxo (Streamer), amarelo (Veterano), azul (Verificado) e preto holográfico (Dono).
- **Selo de dono:** defina a variável `OWNER_USERNAME` na Vercel com o seu usuário (sem @). Na próxima vez que você entrar, o selo aparece. Só o dono vê o botão **Selos** no perfil das outras pessoas, para conceder ou tirar os demais selos.
- **Links sociais:** quem tem selo de Criador, Streamer ou Dono pode colocar YouTube, Twitch, Kick, Instagram, TikTok, Discord e site em Editar perfil.
- **Privacidade:** público, só amigos (padrão) ou privado. Vale para a fazenda e o patrimônio; as postagens continuam públicas.
- **Seguir:** cada perfil mostra o número de seguidores. A lista de quem segue não aparece para ninguém.

## Notas de atualização

Ficam em `src/data/changelog.json` e aparecem em **/novidades** (site) e no botão ✨ do AgroSocial (app). A cada atualização, acrescente uma entrada no topo com a versão, a data, o título e os itens (`"where": "site" | "app" | "ambos"`).

## Publicar na Vercel

1. Na Vercel: **Add New › Project** e importe este repositório.
2. Em **Root Directory**, escolha `web`. (Deixe ligado *Include files outside the root directory*: o build usa a raiz para exportar o app de gestão.)
3. Antes do primeiro deploy, em **Storage**:
   - **Create Database › Neon** (plano Free) e conecte ao projeto. Isso cria a variável `DATABASE_URL`.
   - **Create › Blob** e conecte ao projeto. Isso cria `BLOB_READ_WRITE_TOKEN`.
4. Em **Settings › Environment Variables**, adicione:
   - `SESSION_SECRET`: um texto longo e aleatório (`openssl rand -base64 32`).
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`: gere com `npm run vapid` dentro de `web/`.
   - `VAPID_SUBJECT`: `mailto:` + um e-mail seu.
5. **Deploy.** O build cria as tabelas sozinho (`scripts/migrate.mjs`, pode rodar quantas vezes quiser), exporta o app de gestão para `/gestao` e compila o site.

Para trocar uma variável depois, faça um novo deploy (as `NEXT_PUBLIC_*` entram no build).

## App do celular e do Windows

O app (aba **Comunidade**) usa esta mesma API e este mesmo banco. Ele entra com `Authorization: Bearer <token>` (o login devolve o token) em vez de cookie; `src/proxy.ts` libera o CORS da `/api` para o app, que roda fora deste domínio. Fotos e vídeos do app vão direto para o Vercel Blob com um token temporário gerado em `/api/upload`. O push para o app instalado vai pelo serviço da Expo (tabela `expo_push_tokens`); veja o README da raiz para configurar o build.

## Notificações no celular

- **Android (Chrome, Edge, Samsung Internet):** em *Avisos* ou *Editar perfil*, toque em **Ligar**. Os convites chegam mesmo com o navegador fechado.
- **iPhone/iPad (iOS 16.4+):** a Apple só libera push para sites instalados. Abra no Safari › Compartilhar › **Adicionar à Tela de Início**, abra pelo ícone e ligue as notificações.
- **Computador:** funciona no Chrome, Edge e Firefox.

Com o site aberto e em foco, o aviso aparece dentro da tela (sem duplicar com o do sistema). Quem abre o site depois de ter sido chamado vê os convites das últimas 3 horas que ainda estão em aberto.

## Rodar no computador

Precisa de um Postgres (pode ser um banco Neon grátis ou um local).

```bash
cd web
npm install
cp .env.example .env.local   # preencha DATABASE_URL e SESSION_SECRET
npm run db:migrate
npm run dev
```

Sem `BLOB_READ_WRITE_TOKEN`, em desenvolvimento as imagens e os vídeos vão para `public/uploads`.

Para ter o app de gestão em `/gestao` localmente: `node scripts/build-gestao.mjs` (exporta o app Expo da raiz).

## Estrutura

```
db/schema.sql            tabelas: usuários, amizades, postagens, reações, comentários, convites, avisos, push
scripts/                 migrate (cria tabelas), vapid (chaves push), build-gestao (exporta o app Expo)
public/sw.js             service worker das notificações push
src/app/(auth)/          entrar e criar conta
src/app/(app)/           feed, post, amigos, convites, avisos, perfil (u/[código]), editar perfil, minha fazenda
src/app/api/             rotas do servidor
src/components/          casca do app, feed, compositor, convite, fazenda, avisos ao vivo
src/lib/                 banco, sessão, push, resumo da fazenda, tipos
```

## Privacidade e limites

- Senhas com bcrypt; sessão em cookie `httpOnly` assinado (60 dias).
- A fazenda (patrimônio) só aparece para amigos aceitos e para a própria pessoa.
- Só os nomes e números da fazenda vão para o servidor; as fotos locais do app não são enviadas.
- Limites contra spam: 10 postagens a cada 10 minutos e um convite por minuto para a mesma pessoa.
