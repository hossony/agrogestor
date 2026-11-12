/**
 * Guia de jogo do Farming Simulator 25 e tutorial do AgroGestor.
 * Os nomes das máquinas seguem a tradução do jogo em português; quando o
 * nome em inglês ajuda a achar na loja, ele aparece entre parênteses.
 *
 * Observação: alguns efeitos (pedras, ervas daninhas, calcário, aração)
 * só existem se estiverem ligados nas configurações do jogo salvo.
 */

export type GuideIcon = 'start' | 'soil' | 'fert' | 'seed' | 'harvest' | 'money' | 'machine' | 'animal' | 'stone' | 'weed' | 'lime' | 'plow' | 'wither' | 'damage' | 'debt' | 'price' | 'broken' | 'sick' | 'silo' | 'worker' | 'water' | 'video';

export interface GuideStep {
  title: string;
  text: string;
  /** Máquina ou item usado no jogo. */
  tool?: string;
}

export interface GuideTopic {
  id: string;
  title: string;
  summary: string;
  steps?: GuideStep[];
  tips?: string[];
  warning?: string;
}

export interface GuideCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: GuideIcon;
  color: string;
  topics: GuideTopic[];
}

export interface Situation {
  id: string;
  icon: GuideIcon;
  tone: 'red' | 'yellow' | 'blue' | 'green';
  problem: string;
  signs: string;
  fix: string[];
  prevent?: string;
}

export const GUIDE: GuideCategory[] = [
  {
    id: 'inicio',
    title: 'Primeiros passos',
    subtitle: 'Começar a carreira sem quebrar',
    icon: 'start',
    color: '#2B78B8',
    topics: [
      {
        id: 'inicio-modo',
        title: 'Escolhendo o início do jogo',
        summary: 'O modo de início define quanto dinheiro, terra e máquinas você recebe.',
        steps: [
          { title: 'Novo fazendeiro', text: 'Começa com alguns campos, máquinas básicas e dinheiro. É o melhor modo para aprender o ciclo completo.' },
          { title: 'Gerente de fazenda', text: 'Mais dinheiro e nada pronto. Bom para quem já conhece o jogo e quer planejar do zero.' },
          { title: 'Começo do zero', text: 'Pouco dinheiro, sem terra. Exige contratos no início. Deixe para a segunda carreira.' },
        ],
        tips: ['Na primeira carreira, deixe pedras, ervas daninhas e calcário ligados: assim você aprende o ciclo real e o AgroGestor acompanha tudo.', 'Use a dificuldade econômica fácil para ter preços de venda melhores enquanto aprende.'],
      },
      {
        id: 'inicio-contratos',
        title: 'Contratos: dinheiro sem gastar',
        summary: 'Os contratos usam campos e, às vezes, máquinas dos vizinhos. São a forma mais segura de ganhar dinheiro no início.',
        steps: [
          { title: 'Abra o menu de contratos', text: 'Veja a lista e prefira trabalhos que já fornecem a máquina (aparece o custo do aluguel).' },
          { title: 'Comece pelos simples', text: 'Colheita, enfardamento e cultivo pagam bem e quase não gastam insumo seu.' },
          { title: 'Entregue tudo', text: 'Na colheita, entregue a produção no ponto indicado. O que sobra no reboque pode ser vendido por você.' },
          { title: 'Registre no AgroGestor', text: 'Lance o pagamento em Financeiro como receita, categoria Contratos, para ver quanto eles rendem.' },
        ],
        tips: ['Contratos de colheita deixam você ficar com o que passar da meta.', 'Devolva as máquinas emprestadas antes do fim do contrato para não pagar multa.'],
      },
      {
        id: 'inicio-comprar',
        title: 'Comprar, alugar ou leasing?',
        summary: 'Máquina cara usada poucas vezes por ano quase nunca vale a compra.',
        steps: [
          { title: 'Uso diário', text: 'Trator principal, reboque e cultivador: compre. Você usa o ano todo.' },
          { title: 'Uso de temporada', text: 'Colheitadeira, plantadeira de batata, colhedora de beterraba: alugue (leasing) só no mês de uso.' },
          { title: 'Confira a potência', text: 'Todo implemento mostra a potência mínima. Trator fraco não puxa e gasta mais.' },
        ],
        tips: ['Cadastre na Frota a potência do trator e a exigida pelo implemento: o app mostra se combina.', 'Máquinas usadas na loja de usados saem bem mais baratas; confira o desgaste antes.'],
      },
      {
        id: 'inicio-ajudantes',
        title: 'Usando ajudantes (IA)',
        summary: 'Os ajudantes trabalham enquanto você faz outra coisa, mas cobram por hora.',
        steps: [
          { title: 'Abasteça antes', text: 'Encha tanque, semente e adubo. O ajudante para quando acaba e você continua pagando o tempo perdido.' },
          { title: 'Um ajudante por campo', text: 'Divida o trabalho: um ara, outro planta atrás.' },
          { title: 'Use o GPS/linhas', text: 'Em campos de formato estranho, o ajudante pode deixar faixas. Confira e repasse.' },
        ],
        tips: ['Em Ajustes do jogo dá para deixar o ajudante comprar combustível e sementes sozinho, mas ele cobra mais caro.'],
      },
      {
        id: 'inicio-tempo',
        title: 'Tempo, estações e dias por mês',
        summary: 'Cada cultura só pode ser plantada e colhida em certos meses.',
        steps: [
          { title: 'Dias por mês', text: 'Mais dias por mês dão tempo de terminar o trabalho. Para aprender, use 3 dias por mês ou mais.' },
          { title: 'Acompanhe o mês', text: 'Toda vez que o jogo virar o mês, toque em "Avançar mês" no Painel do AgroGestor.' },
          { title: 'Planeje com o Calendário', text: 'A tela Calendário mostra janelas de plantio, colheita e melhor venda lado a lado.' },
        ],
      },
    ],
  },
  {
    id: 'preparo',
    title: 'Preparo do campo',
    subtitle: 'Etapa por etapa, da resteva à semeadura',
    icon: 'soil',
    color: '#8A5A2B',
    topics: [
      {
        id: 'preparo-ciclo',
        title: 'O ciclo completo, passo a passo',
        summary: 'A ordem que dá mais produtividade com menos viagens.',
        steps: [
          { title: '1. Triturar a resteva', text: 'Depois da colheita, passe o triturador (mulcher) na palhada de milho, girassol ou sorgo. Dá um pequeno bônus e evita problema no próximo plantio.', tool: 'Triturador (Mulcher)' },
          { title: '2. Recolher pedras', text: 'Se o mapa mostrar pedras, recolha antes de cultivar. Pedras danificam as máquinas.', tool: 'Catador de pedras (Stone picker)' },
          { title: '3. Aplicar calcário', text: 'Quando o mapa de solo pedir calcário (normalmente a cada 3 colheitas), espalhe antes de arar para misturar no solo.', tool: 'Distribuidor de calcário' },
          { title: '4. Arar ou cultivar', text: 'Arar quando o campo pedir aração; nas outras vezes basta o cultivador ou a grade. O arado também enterra a palha.', tool: 'Arado ou cultivador' },
          { title: '5. Semear', text: 'Plante dentro da janela da cultura. Semeadora com tanque de adubo já faz a 1ª adubação junto.', tool: 'Semeadora / plantadeira' },
          { title: '6. Passar o rolo', text: 'Logo após semear, o rolo compactador dá um bônus de produtividade. Não passe depois que a planta crescer.', tool: 'Rolo compactador' },
          { title: '7. Adubar duas vezes', text: 'São 2 níveis de adubação por ciclo. Faça a 1ª no plantio (ou antes) e a 2ª nas primeiras fases de crescimento.', tool: 'Adubadora ou pulverizador' },
          { title: '8. Controlar ervas daninhas', text: 'Herbicida ou capina mecânica enquanto a lavoura é pequena. Ervas reduzem bastante a colheita.', tool: 'Pulverizador ou capinadeira' },
          { title: '9. Colher no ponto', text: 'Colha quando o mapa mostrar "pronto". Se esperar demais, a lavoura murcha e perde quase tudo.', tool: 'Colheitadeira' },
        ],
        tips: ['Marque cada etapa no AgroGestor: em Talhões, o solo do campo mostra o que falta; no Guia > Assistente você conclui etapa por etapa.', 'Plantio direto (semeadora de plantio direto) pula o cultivo e economiza tempo, mas não substitui a aração quando o campo pede.'],
      },
      {
        id: 'preparo-arar',
        title: 'Arar x cultivar x gradear',
        summary: 'Cada implemento tem uma função; usar o certo poupa horas.',
        steps: [
          { title: 'Arado', text: 'Revira a terra, enterra a palha e zera a necessidade de aração. Lento e pede trator forte.', tool: 'Arado de aivecas' },
          { title: 'Subsolador', text: 'Também cumpre a função da aração em vários equipamentos do FS25, trabalhando mais fundo.', tool: 'Subsolador' },
          { title: 'Cultivador', text: 'Solta a terra para plantar. Rápido; use entre uma aração e outra.', tool: 'Cultivador' },
          { title: 'Grade de discos', text: 'Mistura resteva e solo rápido em grandes áreas.', tool: 'Grade de discos' },
        ],
        warning: 'Arar campo com pedras sem recolher antes aumenta o dano das máquinas.',
      },
      {
        id: 'preparo-rolo',
        title: 'Rolo e triturador: os bônus esquecidos',
        summary: 'São passadas rápidas que somam produtividade sem gastar insumo.',
        tips: ['O rolo só funciona antes da planta crescer: passe logo depois de semear.', 'Triturar resteva de milho, girassol e sorgo antes do preparo dá bônus e deixa o campo limpo.', 'Algumas semeadoras já têm rolo integrado: confira na descrição da loja.'],
      },
      {
        id: 'preparo-mapa',
        title: 'Lendo o mapa de solo',
        summary: 'O mapa do jogo diz exatamente o que cada campo precisa.',
        steps: [
          { title: 'Abra o mapa', text: 'No menu do mapa, troque a camada para "Estado do solo".' },
          { title: 'Filtre', text: 'Ligue só uma camada por vez: calcário, aração, adubação, ervas, pedras.' },
          { title: 'Atualize o talhão no app', text: 'Em Talhões, marque o que o mapa mostrou. Os avisos e o Assistente usam essa informação.' },
        ],
      },
    ],
  },
  {
    id: 'adubos',
    title: 'Fertilizantes e adubos',
    subtitle: 'Qual usar, quanto e quando',
    icon: 'fert',
    color: '#1E6B3E',
    topics: [
      {
        id: 'adubos-tipos',
        title: 'Tipos de adubo e quando usar',
        summary: 'Todos contam como um nível de adubação. O que muda é preço, velocidade e de onde vem.',
        steps: [
          { title: 'Fertilizante sólido (granulado)', text: 'Comprado na loja. Distribuidor largo cobre área grande rápido. Bom para qualquer cultura.', tool: 'Distribuidor de adubo' },
          { title: 'Fertilizante líquido', text: 'Comprado na loja, aplicado com pulverizador. Mesmo pulverizador serve para herbicida (limpe a troca de produto).', tool: 'Pulverizador' },
          { title: 'Esterco', text: 'Grátis se você cria vacas ou porcos com palha. Pesado e lento de espalhar, mas economiza muito.', tool: 'Espalhador de esterco' },
          { title: 'Chorume', text: 'Líquido dos estábulos. Use tanque de chorume ou injetor; o injetor também pode ser usado em campo já plantado (fase inicial).', tool: 'Tanque de chorume' },
          { title: 'Digestato', text: 'Sobra da usina de biogás. Funciona como chorume.', tool: 'Tanque de chorume' },
          { title: 'Semeadora com adubo', text: 'Aduba no momento do plantio: economiza uma passada inteira.', tool: 'Semeadora com tanque de adubo' },
        ],
        warning: 'Calcário não é adubo e herbicida não aduba. Eles corrigem o solo e limpam o campo, mas não contam como nível de adubação.',
      },
      {
        id: 'adubos-quanto',
        title: 'Quanto adubar',
        summary: 'O máximo é 2 níveis por ciclo. Passar a terceira vez é desperdício.',
        steps: [
          { title: 'Nível 0', text: 'Produção baixa. Evite colher assim.' },
          { title: 'Nível 1', text: 'Melhora bastante. Aceitável se faltar dinheiro.' },
          { title: 'Nível 2 (máximo)', text: 'Produtividade cheia da adubação. É o alvo para toda lavoura.' },
        ],
        tips: ['No AgroGestor, o campo "Adubações feitas" vai de 0 a 2. Volte a 0 depois da colheita.', 'Cadastre o adubo no Estoque como insumo para saber quando comprar mais.'],
      },
      {
        id: 'adubos-quando',
        title: 'Melhor momento para adubar',
        summary: 'Adubo só conta até certa fase de crescimento.',
        steps: [
          { title: 'Antes ou no plantio', text: 'Primeira adubação: espalhe esterco/chorume antes de cultivar, ou use semeadora com adubo.' },
          { title: 'Nas primeiras fases', text: 'Segunda adubação: aplique enquanto a planta está pequena, no máximo até a metade do ciclo.' },
          { title: 'Planta alta', text: 'Passar com a máquina em planta crescida pode amassar a lavoura. Use as linhas de tráfego (trilhas) ou pulverizador largo.' },
        ],
      },
      {
        id: 'adubos-calcario',
        title: 'Calcário e cal',
        summary: 'Corrige a acidez do solo. Sem ele, a produção cai.',
        steps: [
          { title: 'Quando aplicar', text: 'Quando o mapa pedir, em geral a cada 3 colheitas.' },
          { title: 'Como aplicar', text: 'Distribuidor de calcário, de preferência antes de arar ou cultivar.' },
          { title: 'Onde comprar', text: 'Em big bags ou paletes na loja, ou granel no ponto de venda que oferecer.' },
        ],
        tips: ['Calcário é pesado: um distribuidor grande precisa de trator forte.', 'Grama e culturas perenes também precisam de calcário de tempos em tempos.'],
      },
    ],
  },
  {
    id: 'plantio',
    title: 'Plantio',
    subtitle: 'Cultura certa no mês certo',
    icon: 'seed',
    color: '#5E9A2C',
    topics: [
      {
        id: 'plantio-escolher',
        title: 'Escolhendo a cultura',
        summary: 'Pense na janela de plantio, nas máquinas que você tem e no preço de venda.',
        steps: [
          { title: 'Olhe o mês', text: 'No Calendário do app, veja quais culturas podem ser plantadas agora.' },
          { title: 'Confira as máquinas', text: 'Grãos usam semeadora e colheitadeira comuns. Batata, beterraba, cana, algodão, uva e azeitona pedem máquinas próprias.' },
          { title: 'Compare o lucro', text: 'Em Culturas veja produtividade por hectare e preço. Cultura cara de colher pode render menos que trigo.' },
        ],
        tips: ['Trigo, cevada e canola plantados no outono ocupam o campo no inverno e colhem no verão.', 'Diversifique: com várias culturas, você colhe em meses diferentes e não fica parado.'],
      },
      {
        id: 'plantio-especiais',
        title: 'Culturas especiais do FS25',
        summary: 'Algumas culturas têm regras próprias.',
        steps: [
          { title: 'Arroz', text: 'Precisa de campo de arroz alagado. Prepare o campo, plante e mantenha a água no nível.' },
          { title: 'Espinafre, ervilha e vagem', text: 'Colheita com máquinas específicas. Ciclo curto em alguns casos: dá para colher mais de uma vez por ano.' },
          { title: 'Grama', text: 'Perene: depois de plantada, rebrota após cada corte. Ótima para alimentar animais.' },
          { title: 'Choupo', text: 'Cresce por muito tempo e vira cavaco (biomassa). Bom para campos longe da sede.' },
          { title: 'Cobertura (nabo forrageiro)', text: 'Plante depois da colheita e incorpore ao solo: ajuda a preparar o próximo plantio.' },
        ],
      },
      {
        id: 'plantio-registrar',
        title: 'Registrando o plantio no app',
        summary: 'Cada plantio vira uma safra com colheita prevista.',
        steps: [
          { title: 'Safras > Novo plantio', text: 'Escolha talhão e cultura. O app calcula o mês de colheita e a produção esperada.' },
          { title: 'Grave um vídeo', text: 'No Diário, use o modelo "Plantio" e anexe um vídeo da semeadora trabalhando. Fica a memória da safra.' },
          { title: 'Crie as tarefas', text: 'Em Tarefas, programe a 2ª adubação e a pulverização para os próximos meses.' },
        ],
      },
    ],
  },
  {
    id: 'colheita',
    title: 'Colheita',
    subtitle: 'Colher no ponto e não perder nada',
    icon: 'harvest',
    color: '#C98A00',
    topics: [
      {
        id: 'colheita-ponto',
        title: 'Hora certa de colher',
        summary: 'A lavoura fica pronta por um tempo limitado. Depois disso murcha.',
        steps: [
          { title: 'Fique de olho nos avisos', text: 'O AgroGestor avisa "Colher" no mês previsto.' },
          { title: 'Confira no jogo', text: 'O mapa de crescimento mostra quando está pronto. A cor da lavoura também muda.' },
          { title: 'Prepare a logística', text: 'Reboque ao lado da colheitadeira evita parar. Um ajudante pode levar a carga.' },
        ],
        warning: 'Se a lavoura murchar, a produção é quase zero. Colha primeiro os campos que estão prontos há mais tempo.',
      },
      {
        id: 'colheita-plataforma',
        title: 'Plataforma e máquina certa',
        summary: 'Cada cultura pede uma plataforma de corte.',
        steps: [
          { title: 'Grãos (trigo, cevada, aveia, canola, soja)', text: 'Plataforma de corte comum (barra de corte).' },
          { title: 'Milho, girassol, sorgo', text: 'Plataforma de milho/girassol específica.' },
          { title: 'Raízes e especiais', text: 'Batata, beterraba, cenoura, cana, algodão, uva e azeitona usam colhedoras próprias.' },
        ],
      },
      {
        id: 'colheita-palha',
        title: 'Palha e fardos',
        summary: 'A palha de trigo, cevada e aveia vale dinheiro ou vira cama para animais.',
        steps: [
          { title: 'Ligue o espalhador/enleirador', text: 'Na colheitadeira, deixe a palha em leira em vez de picar.' },
          { title: 'Enfarde', text: 'Enfardadora redonda ou quadrada. Venda ou use nos estábulos.' },
          { title: 'Recolha rápido', text: 'Chuva atrasa o trabalho. Recolha os fardos antes de cultivar.' },
        ],
      },
      {
        id: 'colheita-registrar',
        title: 'Registrando a colheita',
        summary: 'Informe a quantidade colhida para o estoque ficar certo.',
        steps: [
          { title: 'Safras > Colher', text: 'Marque a safra como colhida e informe os litros.' },
          { title: 'Vídeo colhendo', text: 'No Diário, toque em "Colheita" nos modelos e anexe o vídeo da colheitadeira. Ótimo para comparar safras.' },
          { title: 'Atualize o talhão', text: 'Depois de colher, volte as adubações para 0 no talhão.' },
        ],
      },
    ],
  },
  {
    id: 'economia',
    title: 'Vendas e economia',
    subtitle: 'Vender caro e gastar pouco',
    icon: 'money',
    color: '#2B78B8',
    topics: [
      {
        id: 'economia-vender',
        title: 'Vender no melhor mês',
        summary: 'O preço de cada produto sobe e desce ao longo do ano.',
        steps: [
          { title: 'Guarde no silo', text: 'Na colheita o preço costuma estar baixo. Armazene se tiver espaço.' },
          { title: 'Acompanhe em Vendas', text: 'O app estima o preço do mês e avisa quando está perto do pico.' },
          { title: 'Compare pontos de venda', text: 'No jogo, cada comprador paga diferente. Veja os preços antes de carregar.' },
        ],
        tips: ['Quando aparecer "alta demanda" (grande procura) no jogo, aproveite: paga bem acima do normal.', 'Venda aos poucos se não souber o pico: metade agora, metade depois.'],
      },
      {
        id: 'economia-custos',
        title: 'Controlando custos',
        summary: 'Os maiores gastos são máquinas, sementes, adubo e arrendamento.',
        tips: ['Lance tudo no Financeiro: em poucos meses você descobre qual cultura dá lucro de verdade.', 'Venda máquinas paradas: elas perdem valor e custam manutenção.', 'Arrende campos (aluguel) antes de comprar: menos dinheiro parado.', 'Empréstimo no banco tem juros: pague assim que sobrar dinheiro.'],
      },
      {
        id: 'economia-producoes',
        title: 'Produções e fábricas',
        summary: 'Transformar matéria-prima em produto aumenta o valor.',
        tips: ['Fábricas compradas por você precisam de insumo constante para valer a pena.', 'Comece pelas que usam o que você já colhe (por exemplo, grãos para ração ou farinha).', 'Registre a produção como venda para acompanhar o retorno.'],
      },
    ],
  },
  {
    id: 'maquinas',
    title: 'Máquinas',
    subtitle: 'Manutenção, combustível e escolha',
    icon: 'machine',
    color: '#5F6F65',
    topics: [
      {
        id: 'maquinas-manutencao',
        title: 'Manutenção e desgaste',
        summary: 'Máquina desgastada fica mais lenta, gasta mais e pode quebrar.',
        steps: [
          { title: 'Confira o desgaste', text: 'Na oficina, veja a porcentagem de dano. Repare antes de ficar alto.' },
          { title: 'Lave', text: 'A sujeira não para a máquina, mas mantê-la limpa ajuda a conservar.' },
          { title: 'Repinte', text: 'A pintura gasta reduz o valor de revenda.' },
          { title: 'Registre as horas', text: 'Em Frota, informe horas e a revisão: o app avisa quando chegar perto.' },
        ],
      },
      {
        id: 'maquinas-potencia',
        title: 'Potência e largura',
        summary: 'Trator e implemento precisam combinar.',
        tips: ['Implemento mais largo cobre mais área por hora, mas exige mais potência.', 'Com potência no limite, o trator anda devagar e gasta mais diesel.', 'Na Frota, preencha "potência exigida" no implemento para comparar.'],
      },
    ],
  },
  {
    id: 'animais',
    title: 'Animais',
    subtitle: 'Comida, água, palha e produtos',
    icon: 'animal',
    color: '#9B5B3A',
    topics: [
      {
        id: 'animais-cuidados',
        title: 'Cuidados básicos',
        summary: 'Saúde e produtividade dependem de comida variada, água e limpeza.',
        steps: [
          { title: 'Comida', text: 'Cada espécie tem sua dieta. Ração misturada (TMR) dá a melhor produtividade para vacas.' },
          { title: 'Água', text: 'Mantenha o bebedouro cheio; alguns pastos têm água automática.' },
          { title: 'Palha (cama)', text: 'Palha aumenta a produtividade e gera esterco para adubar.' },
          { title: 'Limpeza', text: 'Recolha esterco e chorume com frequência para não lotar.' },
        ],
        tips: ['Animais felizes produzem mais leite, ovos, lã e esterco: tudo isso vira dinheiro ou adubo grátis.'],
      },
    ],
  },
];

export const SITUATIONS: Situation[] = [
  {
    id: 'pedras',
    icon: 'stone',
    tone: 'yellow',
    problem: 'Apareceram pedras no talhão',
    signs: 'Pedras visíveis no campo depois de arar ou cultivar, ou a camada "pedras" no mapa de solo.',
    fix: [
      'Não plante ainda: termine o preparo e depois recolha as pedras.',
      'Use o catador de pedras (stone picker) passando por toda a área marcada no mapa.',
      'Descarregue o reservatório quando encher e continue até o mapa ficar limpo.',
      'No AgroGestor, desmarque "Tem pedras" no talhão (ou conclua a etapa no Assistente).',
    ],
    prevent: 'Pedras voltam a subir quando você ara ou cultiva fundo. Planeje recolher depois de cada aração.',
  },
  {
    id: 'ervas-antes',
    icon: 'weed',
    tone: 'yellow',
    problem: 'Ervas daninhas antes de plantar',
    signs: 'Camada "ervas daninhas" no mapa num campo ainda vazio.',
    fix: [
      'Cultive ou are o campo: o preparo do solo destrói as ervas que já nasceram.',
      'Se for plantio direto, aplique herbicida antes de semear.',
      'Plante logo em seguida para a lavoura sair na frente.',
    ],
  },
  {
    id: 'ervas-pequena',
    icon: 'weed',
    tone: 'yellow',
    problem: 'Ervas daninhas na lavoura pequena',
    signs: 'Lavoura nas primeiras fases e mapa mostrando ervas.',
    fix: [
      'Opção barata: capinadeira mecânica (weeder/grade de dentes) nas primeiras fases de crescimento.',
      'Para culturas em linha (batata, beterraba), use a capinadeira de linhas (enxada rotativa).',
      'Opção que funciona em mais fases: pulverizador com herbicida.',
      'Marque no app: talhão sem ervas, e registre a pulverização no Diário.',
    ],
    prevent: 'Capinar cedo é mais barato e não precisa de herbicida.',
  },
  {
    id: 'ervas-alta',
    icon: 'weed',
    tone: 'red',
    problem: 'Ervas daninhas na lavoura já alta',
    signs: 'Lavoura crescida e mapa com ervas; a capinadeira já não funciona.',
    fix: [
      'Só o herbicida resolve nessa fase. Encha o pulverizador com herbicida.',
      'Use as linhas de tráfego (trilhas) para não amassar a lavoura.',
      'Se a colheita estiver muito perto, avalie: às vezes é melhor colher e preparar bem o próximo ciclo.',
    ],
  },
  {
    id: 'calcario',
    icon: 'lime',
    tone: 'yellow',
    problem: 'O campo pede calcário',
    signs: 'Camada "calcário" no mapa, ou pH baixo.',
    fix: [
      'Compre calcário e use o distribuidor de calcário.',
      'Aplique antes de arar/cultivar, de preferência entre a colheita e o próximo plantio.',
      'Marque "Calcário em dia" no talhão do app.',
    ],
    prevent: 'Crie uma tarefa para daqui a 3 colheitas lembrando de aplicar de novo.',
  },
  {
    id: 'arar',
    icon: 'plow',
    tone: 'yellow',
    problem: 'O campo precisa ser arado',
    signs: 'Camada "aração" no mapa.',
    fix: [
      'Use arado ou subsolador depois da colheita.',
      'Recolha pedras que subirem depois da aração.',
      'Cultive ou nivele se ficar irregular e então plante.',
      'Marque "Solo arado" no talhão.',
    ],
  },
  {
    id: 'murchou',
    icon: 'wither',
    tone: 'red',
    problem: 'A lavoura murchou',
    signs: 'Plantas secas/marrons e mapa mostrando "murcha". Passou do ponto de colheita.',
    fix: [
      'A produção está perdida; não vale gastar tempo colhendo.',
      'Passe o triturador ou cultive para limpar.',
      'No app, marque a safra como perdida em Safras.',
      'Replaneje: veja no Calendário o que ainda dá para plantar neste mês.',
    ],
    prevent: 'Ative as notificações em Ajustes e avance o mês no app junto com o jogo.',
  },
  {
    id: 'pisoteio',
    icon: 'damage',
    tone: 'yellow',
    problem: 'Lavoura amassada pelas rodas',
    signs: 'Faixas danificadas por onde as máquinas passaram.',
    fix: [
      'Use sempre as mesmas trilhas (linhas de tráfego) ao pulverizar e adubar.',
      'Prefira pulverizadores largos: menos passadas.',
      'Pneus estreitos (de linha) amassam menos lavoura.',
    ],
  },
  {
    id: 'divida',
    icon: 'debt',
    tone: 'red',
    problem: 'Sem dinheiro ou com dívida',
    signs: 'Saldo negativo ou empréstimo alto.',
    fix: [
      'Faça contratos: não exigem investimento.',
      'Venda máquinas paradas e devolva leasings que não usa.',
      'Venda o estoque que está perto do pico (veja em Vendas).',
      'Corte custos: menos ajudantes, menos máquinas alugadas.',
      'Acompanhe no Financeiro onde o dinheiro está indo.',
    ],
  },
  {
    id: 'preco-baixo',
    icon: 'price',
    tone: 'blue',
    problem: 'Preço baixo na colheita',
    signs: 'Preço de venda bem abaixo da média.',
    fix: [
      'Guarde no silo e espere o melhor mês (o app mostra qual é).',
      'Procure outro ponto de venda; os preços variam.',
      'Se não tiver silo, considere vender só o necessário e investir em armazenagem.',
    ],
  },
  {
    id: 'silo-cheio',
    icon: 'silo',
    tone: 'yellow',
    problem: 'Silo cheio',
    signs: 'Não dá para descarregar mais produção.',
    fix: [
      'Venda o que está mais perto do pico de preço.',
      'Armazene em reboques estacionados ou fardos temporariamente.',
      'Construa ou amplie silos; compare o custo com a perda de vender barato.',
    ],
  },
  {
    id: 'quebrada',
    icon: 'broken',
    tone: 'red',
    problem: 'Máquina muito danificada',
    signs: 'Máquina lenta, fumaça, falhas ou dano alto na oficina.',
    fix: [
      'Leve à oficina e repare.',
      'Se o reparo estiver caro, compare com vender e comprar outra.',
      'Atualize as horas e a revisão na Frota do app.',
    ],
    prevent: 'Evite passar em campos com pedras e repare antes do desgaste passar de 30–40%.',
  },
  {
    id: 'animal-doente',
    icon: 'sick',
    tone: 'red',
    problem: 'Animais com saúde ou produção baixa',
    signs: 'Saúde em queda, produtividade baixa.',
    fix: [
      'Confira comida (variada), água e palha.',
      'Limpe o esterco e esvazie o chorume.',
      'Reduza a lotação se estiver acima da capacidade.',
      'Atualize saúde e produtividade na tela Animais.',
    ],
  },
  {
    id: 'ajudante-parado',
    icon: 'worker',
    tone: 'blue',
    problem: 'Ajudante (IA) parou no meio do campo',
    signs: 'Aviso de trabalho interrompido.',
    fix: [
      'Veja o motivo: falta de combustível, semente, adubo ou reboque cheio.',
      'Reabasteça e mande continuar.',
      'Campos muito irregulares confundem o ajudante: termine as bordas você mesmo.',
    ],
  },
  {
    id: 'arroz-agua',
    icon: 'water',
    tone: 'blue',
    problem: 'Arroz sem água',
    signs: 'Campo de arroz com nível de água baixo.',
    fix: [
      'Encha o campo de arroz pelo controle de água do campo.',
      'Mantenha o nível durante o crescimento.',
      'Drene só perto da colheita, se o jogo pedir.',
    ],
  },
];

/** Dicas curtas para "Dica do dia" no Painel. */
export const QUICK_TIPS: string[] = [
  'Recolha as pedras depois de arar: elas sobem com o preparo do solo.',
  'O máximo de adubação são 2 níveis. A terceira passada é dinheiro jogado fora.',
  'Passe o rolo logo depois de semear para ganhar um bônus de produtividade.',
  'Calcário é aplicado em média a cada 3 colheitas. Crie uma tarefa para lembrar.',
  'Capinar cedo com capinadeira mecânica sai mais barato que herbicida.',
  'Esterco e chorume dos seus animais são adubo grátis.',
  'Semeadora com tanque de adubo faz o plantio e a 1ª adubação numa passada só.',
  'Guarde a produção no silo e venda no melhor mês: o app mostra qual é.',
  'Alugue máquinas de temporada, como colhedora de batata, em vez de comprar.',
  'Contratos são a forma mais segura de ganhar dinheiro no início.',
  'Abasteça o ajudante antes de mandar trabalhar: parado ele continua cobrando.',
  'Grave um vídeo da colheita no Diário: dá para comparar as safras depois.',
  'Triture a resteva de milho e girassol antes do preparo.',
  'Use as mesmas trilhas ao pulverizar para não amassar a lavoura.',
  'Lavoura murcha se passar do ponto: colha primeiro os campos prontos há mais tempo.',
  'Avance o mês no app sempre que o jogo virar o mês.',
  'Cadastre a potência dos tratores na Frota para saber se puxam o implemento.',
  'Palha de trigo e cevada vira cama para animais ou dinheiro em fardos.',
  'Trigo, cevada e canola plantados no outono colhem no verão seguinte.',
  'Diversifique as culturas para colher em meses diferentes.',
  'Venda máquinas paradas: perdem valor e custam manutenção.',
  'Ative as notificações em Ajustes para não perder a hora da colheita.',
  'O mapa de solo do jogo mostra calcário, aração, adubo, ervas e pedras.',
  'Quando aparecer "grande procura" num comprador, aproveite para vender.',
];

export interface TutorialSlide {
  title: string;
  text: string;
  icon: GuideIcon | 'app' | 'field' | 'calendar' | 'diary' | 'bell' | 'guide';
  route?: string;
  cta?: string;
}

/** Tutorial do AgroGestor, mostrado no primeiro acesso e em Guia > Tutorial. */
export const TUTORIAL: TutorialSlide[] = [
  { icon: 'app', title: 'Bem-vindo ao AgroGestor', text: 'Este app é o escritório da sua fazenda no Farming Simulator 25. Você joga no computador ou console e anota aqui o que acontece. Em troca, o app calcula colheitas, estoque, lucro e avisa o que fazer.' },
  { icon: 'field', title: '1. Escolha o mapa e cadastre os talhões', text: 'Em Talhões > Talhões do mapa, escolha Riverbend Springs (EUA), Zielonka (Europa) ou Hutan Pantai (Ásia) e cadastre os campos com o mesmo número do jogo. Depois marque o estado do solo: arado, calcário, adubações, ervas daninhas e pedras.', route: 'talhoes', cta: 'Abrir Talhões' },
  { icon: 'seed', title: '2. Registre cada plantio', text: 'Em Safras, informe talhão e cultura. O app calcula o mês de colheita e a produção esperada pelo tamanho do campo.', route: 'safras', cta: 'Abrir Safras' },
  { icon: 'calendar', title: '3. Avance o mês junto com o jogo', text: 'Toda vez que o mês virar no jogo, toque em "Avançar" no Painel. Assim os avisos de colheita, venda e tarefas aparecem na hora certa.', route: 'painel', cta: 'Ir ao Painel' },
  { icon: 'diary', title: '4. Diário com fotos e vídeos', text: 'Registre cada trabalho com foto ou vídeo: um vídeo colhendo, um vídeo plantando, a primeira aração. Use os modelos prontos e filtre por tipo.', route: 'diario', cta: 'Abrir Diário' },
  { icon: 'money', title: '5. Venda no melhor mês', text: 'Ao colher, informe a quantidade. O Estoque soma tudo e a tela Vendas mostra quando o preço está perto do pico.', route: 'vendas', cta: 'Abrir Vendas' },
  { icon: 'bell', title: '6. Siga os avisos', text: 'O sino reúne o que pede atenção: colheita pronta, tarefa atrasada, ervas daninhas, pedras, revisão de máquina e animais.', route: 'avisos', cta: 'Ver Avisos' },
  { icon: 'guide', title: '7. Guia e Assistente', text: 'No Guia você encontra o passo a passo do preparo do campo, os adubos certos e o que fazer em cada situação. O Assistente diz, talhão por talhão, a próxima etapa, e a aba Mapas traz pontos de venda, produções e dicas do seu mapa.', route: 'guia', cta: 'Abrir Guia' },
];

/** Modelos rápidos do Diário: título, tipo e pedido de vídeo. */
export const RECORD_TEMPLATES: { label: string; type: string; title: string; hint: string }[] = [
  { label: 'Colheita', type: 'Colheita', title: 'Colheita', hint: 'Grave a colheitadeira trabalhando.' },
  { label: 'Plantio', type: 'Plantio', title: 'Plantio', hint: 'Grave a semeadora no campo.' },
  { label: 'Aração', type: 'Aração', title: 'Aração do talhão', hint: 'Grave o arado ou o cultivador.' },
  { label: 'Calcário', type: 'Calcário', title: 'Aplicação de calcário', hint: 'Grave o distribuidor.' },
  { label: 'Adubação', type: 'Adubação', title: 'Adubação', hint: 'Grave a adubadora ou o tanque de chorume.' },
  { label: 'Pulverização', type: 'Pulverização', title: 'Pulverização contra ervas', hint: 'Grave o pulverizador.' },
  { label: 'Pedras', type: 'Pedras', title: 'Recolhendo pedras', hint: 'Grave o catador de pedras.' },
  { label: 'Venda', type: 'Venda', title: 'Entrega no comprador', hint: 'Grave a descarga no ponto de venda.' },
];
