# AgroGestor

Sistema administrativo para a sua fazenda no Farming Simulator 25: talhões, safras, colheitas, estoque, épocas de venda, financeiro, tarefas, diário de campo com imagens e vídeos, frota, animais, avisos e um guia completo de como jogar.

## Acesso

O app abre em uma tela de login com um único usuário, definido em `src/auth.ts`:

- Usuário: `fazenda boaz`
- Senha: `daviboaz123`

É uma trava local do aparelho, não uma conta online. Quem tiver o código-fonte ou o instalador consegue ler a senha, então não reutilize essa senha em outros serviços.

Feito em React Native (Expo SDK 58) com um único código para Android e Windows.

## Rodar em desenvolvimento

```bash
npm install
npm run web        # abre no navegador
npm run android    # abre no Expo Go ou em um emulador
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
src/auth.ts           usuário e senha do login
src/store.tsx         estado global, sessão e gravação local (AsyncStorage)
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
src/screens/          uma tela por arquivo
desktop/              janela Electron para Windows
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
