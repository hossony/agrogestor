# AgroGestor

Sistema administrativo para a sua fazenda no Farming Simulator 25: talhões, safras, colheitas, estoque, épocas de venda, financeiro, tarefas, diário de campo com imagens e vídeos, frota, animais, avisos e um guia completo de como jogar.

## Contas e saves

Ao abrir o app pela primeira vez, a pessoa cria uma conta (nome, usuário e senha). Cada aparelho pode ter várias contas, e cada conta tem vários **saves**, um para cada jogo salvo do FS25.

Para criar um save, escolha:

1. **Mapa:** Riverbend Springs (EUA), Zielonka (Europa), Hutan Pantai (Ásia) ou outro mapa/mod (só o nome).
2. **Modo de início:** Novo fazendeiro, Gerente de fazenda ou Começo do zero.
3. **Fazenda:** nome, dinheiro inicial, empréstimo, moeda e mês em que o jogo começa.

No **Novo fazendeiro** em um mapa oficial, o save já vem com a fazenda inicial do jogo: lotes, lavouras prontas para colher, máquinas e animais (veja `src/data/presets.ts`). Onde o jogo não informa um número exato (área de alguns lotes, quantidade de animais, valor das máquinas), o item vem marcado para a pessoa conferir. Gerente de fazenda, Começo do zero e mapas de mod começam vazios, só com o dinheiro.

As contas são travas locais: ficam só no aparelho, com a senha guardada como hash (SHA-256 com sal), sem servidor. Quem usava a versão anterior (sem contas) tem os dados importados como um save na primeira conta criada.

Feito em React Native (Expo SDK 58) com um único código para Android e Windows.

## Versão web com comunidade

A pasta `web/` tem o site (Next.js) para publicar na Vercel: feed com imagens e vídeos, curtidas e foguinho 🔥, amigos pelo ID com a fazenda deles (patrimônio, campos, máquinas e animais), perfil com foto e banner, e convites para jogar com notificação no celular. O app de gestão vai junto, em `/gestao`. Veja `web/README.md` para publicar com banco e armazenamento gratuitos.

## Comunidade no app (sincronizada com o site)

A aba **Comunidade** do app (celular, Windows e `/gestao`) usa o mesmo servidor e o mesmo banco do site. Feed, curtidas e foguinhos, comentários, amigos, convites para jogar, avisos e perfil aparecem iguais nos dois lados.

- **Conectar:** na aba Comunidade, informe o endereço do site (ex.: `agrogestor.vercel.app`) e entre com a conta do site ou crie uma. Essa conta é diferente da conta local do app (que guarda os saves no aparelho). Para o endereço já vir preenchido, coloque-o em `app.json` › `expo.extra.apiUrl` ou na variável `EXPO_PUBLIC_API_URL` do build.
- **Fazenda no perfil:** em Comunidade › Perfil, ligue **Sincronizar** para o save aberto. Cada mudança no save vai para o perfil depois de 5 segundos (patrimônio, campos, máquinas, animais e silo). As fotos locais não são enviadas.
- **Fotos e vídeos:** vão direto do celular para o Vercel Blob (o servidor só autoriza o envio).
- **Avisos ao vivo:** com o app aberto, os convites e as curtidas aparecem na tela em segundos.
- **Notificações com o app fechado (Android):** precisam de um build com push configurado:
  1. `eas init`. Ele mostra o `projectId`; como a configuração é dinâmica (`app.config.js`), coloque-o à mão em `app.json` › `expo.extra.eas.projectId`.
  2. No [Firebase](https://console.firebase.google.com), crie um projeto, adicione um app Android com o pacote `com.elielfilho.agrogestor`, baixe o `google-services.json` para a raiz do repositório e acrescente `"googleServicesFile": "./google-services.json"` em `app.json` › `expo.android`.
  3. `eas credentials` › Android › Google Service Account (FCM V1): envie a chave da conta de serviço do Firebase.
  4. `npm run build:apk` e instale o APK novo. Na aba Jogar, toque em **Ligar** notificações.

  O convite chega com os botões **Bora jogar!** e **Agora não**. O envio é pelo serviço gratuito da Expo; no servidor não é preciso configurar nada (a variável `EXPO_ACCESS_TOKEN` é opcional).

## Rodar em desenvolvimento

```bash
npm install
npm run web        # abre no navegador
npm run android    # abre no Expo Go ou em um emulador
```

## Testes

```bash
npm test                               # lógica: senhas, contas, saves, presets dos mapas, assistente
npx expo export --platform web         # gera dist/ para os testes de interface
npm run test:e2e                       # interface com Playwright (desktop e celular)
```

## Android (APK)

Usa o EAS Build, que compila na nuvem da Expo (conta gratuita):

```bash
npm install -g eas-cli
eas login
npm run build:apk
```

No fim o EAS mostra o link para baixar o `.apk`.

## Windows (.exe)

A pasta `desktop/` embrulha a versão web do app em uma janela Electron.

```bash
npm install
npm --prefix desktop install
npm run desktop      # abre a janela desktop
npm run build:win    # gera instalador e executável portátil em desktop/release
```

O executável não é assinado, então o Windows SmartScreen mostra um aviso na primeira abertura ("Mais informações" > "Executar assim mesmo").

## Estrutura

```
App.tsx               navegação: barra lateral no desktop, abas no celular
src/theme.ts          cores e medidas
src/types.ts          modelo de dados
src/accounts.ts       contas, sessão e saves locais (testável em Node)
src/sha256.ts         hash das senhas
src/store.tsx         estado global: conta, saves e dados do save aberto (AsyncStorage)
src/data/presets.ts   início de jogo de cada mapa: lotes, lavouras, máquinas, animais e modos
src/media.ts          escolha e armazenamento das imagens e dos vídeos
src/video.tsx         player de vídeo e campo de vídeo do formulário
src/motion.tsx        animações (entrada em cascata, toque com mola, acordeão, confete)
src/prep.ts           assistente de preparo: próxima etapa de cada talhão
src/data/guide.ts     conteúdo do guia, situações, dicas e tutorial
src/data/maps.ts      mapas padrão do FS25: lotes iniciais, pontos de venda, produções e dicas
src/alerts.ts         regras dos avisos
src/notify.ts         notificações do sistema (Android e Windows)
src/anim.tsx          contadores animados
src/charts.tsx        gráficos (rosca, área, barras, anel)
src/selectors.ts      cálculos: estoque, fluxo de caixa, recomendação de venda
src/utils.ts          formatação, calendário e curva de preço
src/ui.tsx            componentes: tabela/cartões, formulário, foto, ficha de detalhes, faixa das estações
src/data/crops.ts     catálogo de culturas do FS25
src/data/demo.ts      fazenda de exemplo
src/screens/          uma tela por arquivo (Community.tsx: feed, amigos, jogar, avisos e perfil)
src/community/        cliente da API do site, sessão, avisos ao vivo, push e sincronização da fazenda
desktop/              janela Electron para Windows
app.config.js         lê o app.json; com EXPO_BASE_URL exporta a versão web para um subcaminho (/gestao no site)
web/                  site com a comunidade (Next.js, Vercel)
```

## Como os números são calculados

- **Colheita prevista:** primeiro mês de colheita da cultura depois do plantio.
- **Produção esperada:** área do talhão × produtividade da cultura.
- **Estoque de produção:** colhido − vendido ± ajustes manuais.
- **Preço estimado do mês:** curva entre o preço mais baixo (na colheita) e o pico (melhor mês), a partir do preço médio e do preço de pico cadastrados em Culturas. É uma estimativa: no jogo o preço real varia por ponto de venda e dificuldade.
- **Receita:** vendas de produção + lançamentos de receita.

## Guia e dicas

A tela **Guia e dicas** (ícone de capelo no topo do celular, ou na barra lateral) tem:

- **Assistente de preparo:** para cada talhão, as etapas que faltam na ordem certa (pedras, calcário, aração, 1ª e 2ª adubação, ervas daninhas). Ao concluir uma etapa, o talhão é atualizado e o trabalho vai para o Diário.
- **Passo a passo:** primeiros passos, preparo do campo, fertilizantes e adubos, plantio, colheita, vendas, máquinas e animais.
- **O que fazer se…:** pedras, ervas daninhas (antes de plantar, lavoura pequena, lavoura alta), calcário, aração, lavoura murcha, pisoteio, dívida, preço baixo, silo cheio, máquina quebrada, animais doentes, ajudante parado e arroz sem água.
- **Dicas:** dica do dia, dicas para a sua fazenda calculadas a partir dos talhões e a lista completa.
- **Tutorial do app:** o mesmo tutorial que aparece no primeiro acesso. Para vê-lo de novo ao abrir o app, use Ajustes > Ver tutorial de novo.

- **Mapas:** os três mapas que vêm com o FS25. Riverbend Springs (EUA), Zielonka (Europa) e Hutan Pantai (Ásia), com lotes iniciais, pontos de venda, produções e dicas próprias. O mapa escolhido (aqui ou em Ajustes) muda as dicas do Painel.

Em **Talhões > Talhões do mapa** você cadastra vários campos de uma vez com o número do jogo. Os lotes iniciais conhecidos (Zielonka 45 e 46; Hutan Pantai 27, 28, 30 e 31) já vêm preenchidos. Para os demais campos, informe a área do menu de Terras do jogo, porque ela muda quando você junta ou divide campos. Arrozais ganham a etapa "Alagar o arrozal" no Assistente.

Os dados dos mapas vêm de guias da comunidade e da wiki do jogo. Atualizações podem mudar números de lotes e pontos de venda.

Cada tópico pode ser marcado como aprendido; o progresso aparece no topo do Guia. A busca encontra qualquer palavra (por exemplo "chorume" ou "pedras").

## Imagens e vídeos

Registros do diário, itens da frota e animais aceitam uma imagem da galeria do celular ou de uma pasta do computador. Os registros do diário também aceitam um vídeo (um vídeo colhendo, plantando, arando…). Os modelos rápidos no topo do Diário e o botão + do celular ("Vídeo da colheita", "Vídeo do plantio") já abrem o formulário preenchido.

- Android: a imagem e o vídeo são copiados para a pasta de documentos do app. Dá para escolher da galeria ou gravar na hora.
- Windows e navegador: a imagem é reduzida para até 1280 px e o vídeo é guardado inteiro (até 400 MB) no IndexedDB.

## Avisos e notificações

Os avisos são calculados a partir do estado da fazenda (`src/alerts.ts`): colheita pronta, melhor mês de venda, tarefas do mês e atrasadas, revisão de máquinas, ervas daninhas, pedras, saúde e lotação dos animais, último mês de plantio. Ficam na tela Avisos, com contador no sino.

Com as notificações ligadas em Ajustes, cada aviso novo também vai para a barra de notificações do Android ou para a central do Windows. Como os avisos seguem o mês do jogo, eles surgem quando você avança o mês ou altera dados com o app aberto; não há envio com o app fechado.

No Expo Go as notificações do sistema são limitadas. Para testá-las no Android, instale o APK gerado pelo EAS.

## Dados

Tudo fica gravado no próprio dispositivo. Para levar de um aparelho para outro, use Ajustes > Copiar backup e, no outro, Restaurar backup. As imagens e os vídeos não entram no backup.

O catálogo de culturas segue o calendário padrão do FS25. Para mapas com outro calendário, edite janelas, produtividade e preços na tela Culturas.
