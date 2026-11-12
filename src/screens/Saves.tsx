import { ChevronLeft, ChevronRight, Globe, LogOut, Pencil, Plus, Puzzle, Sprout, Tractor, Trash2, Wheat, PawPrint } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SaveMeta } from '../accounts';
import { MapId, MAPS, mapById } from '../data/maps';
import { kitSummary, MODE_TIPS, START_MODES } from '../data/presets';
import { Appear, ProgressBar, Pressy } from '../motion';
import { useStore } from '../store';
import { c, font, radius } from '../theme';
import { Badge, Btn, Card, FormSheet, T, useConfirm, useWide } from '../ui';
import { MONTHS, num, parseNum } from '../utils';

type ModeId = (typeof START_MODES)[number]['id'];
const MODE_NAME: Record<string, string> = { novo: 'Novo fazendeiro', gerente: 'Gerente de fazenda', zero: 'Começo do zero', exemplo: 'Exemplo', importado: 'Importado' };
const mapColor = (id: string) => mapById(id)?.color ?? '#7A6A9B';

const input = { fontFamily: font, fontSize: 15, color: c.ink, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: c.surface } as const;

function Choice({ on, onPress, color, title, subtitle, icon, children, label }: { on: boolean; onPress: () => void; color: string; title: string; subtitle: string; icon: React.ReactNode; children?: React.ReactNode; label: string }) {
  return (
    <Pressy accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} scaleTo={0.98} style={{ borderRadius: radius.lg, borderWidth: on ? 2 : 1, borderColor: on ? color : c.line, backgroundColor: on ? c.surface : c.surface, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
        <View style={{ flex: 1 }}>
          <T v="h2">{title}</T>
          <T v="small">{subtitle}</T>
        </View>
        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? color : c.faint, alignItems: 'center', justifyContent: 'center' }}>
          {on ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: color }} /> : null}
        </View>
      </View>
      {children}
    </Pressy>
  );
}

/** Criação de save em 4 passos: mapa, modo, fazenda e resumo. */
function NewSaveWizard({ onCancel }: { onCancel: () => void }) {
  const { newSave } = useStore();
  const wide = useWide();
  const [step, setStep] = useState(0);
  const [map, setMap] = useState<MapId>('riverbend');
  const [mapName, setMapName] = useState('');
  const [mode, setMode] = useState<ModeId>('novo');
  const [farmName, setFarmName] = useState('');
  const [saveName, setSaveName] = useState('');
  const [money, setMoney] = useState(String(START_MODES[0].money));
  const [loan, setLoan] = useState('0');
  const [month, setMonth] = useState(8);
  const [currency, setCurrency] = useState('$');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pickMode = (m: ModeId) => {
    setMode(m);
    const def = START_MODES.find((x) => x.id === m)!;
    setMoney(String(def.money));
    setLoan(String(def.loan));
  };

  const steps = ['Mapa', 'Modo de início', 'Sua fazenda', 'Resumo'];
  const canNext = () => {
    if (step === 0 && map === 'outro' && !mapName.trim()) return 'Digite o nome do mapa (mod) que você usa.';
    if (step === 2) {
      if (!farmName.trim()) return 'Dê um nome para a sua fazenda.';
      if (isNaN(parseNum(money)) || parseNum(money) < 0) return 'Informe o dinheiro inicial só com números.';
      if (isNaN(parseNum(loan || '0')) || parseNum(loan || '0') < 0) return 'Informe o empréstimo só com números (ou 0).';
    }
    return null;
  };
  const next = () => {
    const problem = canNext();
    if (problem) return setError(problem);
    setError('');
    setStep((s) => s + 1);
  };
  const create = async () => {
    setBusy(true);
    try {
      await newSave({ farmName, map, mapName, mode, money: parseNum(money), loan: parseNum(loan || '0'), startMonth: month, currency: currency.trim() || '$' }, saveName);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível criar o save.');
      setBusy(false);
    }
  };

  const kit = kitSummary(map, mode);
  const gameMap = mapById(map);
  const modeInfo = START_MODES.find((m) => m.id === mode)!;

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T v="title" style={{ fontSize: 22 }}>Novo save</T>
          <T v="small" style={{ fontWeight: '700' }}>Passo {step + 1} de {steps.length}: {steps[step]}</T>
        </View>
        <ProgressBar pct={(step + 1) / steps.length} color={c.harvest} />
      </View>

      {step === 0 ? (
        <View style={{ gap: 10 }}>
          <T v="small" style={{ fontSize: 13.5 }}>Em qual mapa é o seu jogo salvo? Nos mapas oficiais o app já carrega a fazenda inicial do jogo.</T>
          {MAPS.map((m, i) => (
            <Appear key={m.id} index={i}>
              <Choice label={m.name} on={map === m.id} onPress={() => setMap(m.id)} color={m.color} title={m.name} subtitle={m.region} icon={<Globe size={20} color="#fff" />}>
                {map === m.id ? <T v="small" style={{ color: c.ink }}>{m.summary}</T> : null}
              </Choice>
            </Appear>
          ))}
          <Appear index={3}>
            <Choice label="Outro mapa ou mod" on={map === 'outro'} onPress={() => setMap('outro')} color="#7A6A9B" title="Outro mapa ou mod" subtitle="Mapas da comunidade (PC). Você cadastra talhões e máquinas." icon={<Puzzle size={20} color="#fff" />}>
              {map === 'outro' ? <TextInput accessibilityLabel="Nome do mapa" value={mapName} onChangeText={setMapName} placeholder="Nome do mapa, ex.: Calmsden Farm" placeholderTextColor={c.faint} style={input} /> : null}
            </Choice>
          </Appear>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: 10 }}>
          <T v="small" style={{ fontSize: 13.5 }}>Escolha o mesmo modo que você escolheu ao criar o jogo salvo no FS25.</T>
          {START_MODES.map((m, i) => (
            <Appear key={m.id} index={i}>
              <Choice label={m.name} on={mode === m.id} onPress={() => pickMode(m.id)} color={[c.primary, c.sell, c.danger][i]} title={m.name} subtitle={m.summary} icon={[<Sprout key="a" size={20} color="#fff" />, <Tractor key="b" size={20} color="#fff" />, <Wheat key="c" size={20} color="#fff" />][i]} />
            </Appear>
          ))}
          {map === 'outro' && mode === 'novo' ? <T v="small" style={{ color: c.harvestInk }}>Em mapas de mod o app não conhece a fazenda inicial: o save começa vazio e você cadastra o que veio.</T> : null}
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <T v="label" style={{ color: c.ink }}>Nome da fazenda</T>
              <TextInput accessibilityLabel="Nome da fazenda" value={farmName} onChangeText={(t) => { setFarmName(t); setError(''); }} placeholder="Ex.: Fazenda Boa Vista" placeholderTextColor={c.faint} style={input} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <T v="label" style={{ color: c.ink }}>Nome do save (opcional)</T>
              <TextInput accessibilityLabel="Nome do save" value={saveName} onChangeText={setSaveName} placeholder="Ex.: Carreira no PS5" placeholderTextColor={c.faint} style={input} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 2, gap: 6 }}>
              <T v="label" style={{ color: c.ink }}>Dinheiro inicial</T>
              <TextInput accessibilityLabel="Dinheiro inicial" value={money} onChangeText={(t) => { setMoney(t); setError(''); }} keyboardType="decimal-pad" style={input} />
            </View>
            <View style={{ flex: 2, gap: 6 }}>
              <T v="label" style={{ color: c.ink }}>Empréstimo</T>
              <TextInput accessibilityLabel="Empréstimo" value={loan} onChangeText={(t) => { setLoan(t); setError(''); }} keyboardType="decimal-pad" style={input} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <T v="label" style={{ color: c.ink }}>Moeda</T>
              <TextInput accessibilityLabel="Moeda" value={currency} onChangeText={setCurrency} style={input} />
            </View>
          </View>
          <T v="small">Valor sugerido para {modeInfo.name}: {currency} {num(modeInfo.money)}{modeInfo.loan ? ` com ${currency} ${num(modeInfo.loan)} de empréstimo` : ''}. Use o valor que você escolheu na tela de criação do jogo.</T>
          <View style={{ gap: 6 }}>
            <T v="label" style={{ color: c.ink }}>Mês em que o jogo começa</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {MONTHS.map((m, i) => (
                <Pressable key={m} accessibilityRole="radio" accessibilityState={{ checked: month === i + 1 }} onPress={() => setMonth(i + 1)} style={{ minWidth: 50, alignItems: 'center', paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: month === i + 1 ? c.primary : c.line, backgroundColor: month === i + 1 ? c.primary : c.surface }}>
                  <Text style={{ fontFamily: font, fontSize: 13, fontWeight: '600', color: month === i + 1 ? '#fff' : c.ink }}>{m}</Text>
                </Pressable>
              ))}
            </View>
            <T v="small">O padrão do jogo é agosto. Se você mudou o mês na criação do jogo, escolha o mesmo aqui.</T>
          </View>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: 12 }}>
          <Card pad={16} style={{ gap: 10, borderColor: mapColor(map), borderWidth: 2 }}>
            <T v="h2" style={{ fontSize: 18 }}>{farmName.trim()}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Badge tone="blue" label={map === 'outro' ? mapName.trim() : gameMap!.name} />
              <Badge tone="green" label={modeInfo.name} />
              <Badge tone="yellow" label={`Começa em ${MONTHS[month - 1]}`} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[
                ['Dinheiro', `${currency} ${num(parseNum(money))}`],
                ['Empréstimo', `${currency} ${num(parseNum(loan || '0'))}`],
                ['Talhões', String(kit.fields)],
                ['Prontos p/ colher', String(kit.ready)],
                ['Máquinas', String(kit.machines)],
                ['Animais', String(kit.animals)],
              ].map(([k, v]) => (
                <View key={k} style={{ minWidth: 120, flexGrow: 1, backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 10 }}>
                  <T v="small">{k}</T>
                  <T style={{ fontWeight: '700', fontSize: 17 }}>{v}</T>
                </View>
              ))}
            </View>
          </Card>
          {kit.kit ? (
            <Card pad={16} style={{ gap: 10 }}>
              <T v="h2">O que vem na fazenda inicial</T>
              {kit.kit.fields.map((f, i) => (
                <View key={`${f.lot}-${i}`} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Badge tone={f.status === 'pronto' ? 'yellow' : f.rice ? 'blue' : 'green'} label={f.name} />
                  <T v="small" style={{ flex: 1 }}>{f.note}{f.areaHa ? ` ${num(f.areaHa, 2)} ha.` : ''}</T>
                </View>
              ))}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {kit.kit.machines.map((m) => (
                  <View key={m.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.line }}>
                    <Tractor size={12} color={c.muted} />
                    <Text style={{ fontFamily: font, fontSize: 12.5, color: c.ink }}>{m.name}</Text>
                  </View>
                ))}
                {kit.kit.animals.map((a) => (
                  <View key={a.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, backgroundColor: c.harvestSoft }}>
                    <PawPrint size={12} color={c.harvestInk} />
                    <Text style={{ fontFamily: font, fontSize: 12.5, color: c.harvestInk }}>{a.name}</Text>
                  </View>
                ))}
              </View>
              {kit.extras.length ? <T v="small">Também vem: {kit.extras.join(', ')}.</T> : null}
              <T v="small" style={{ color: c.harvestInk }}>Onde o jogo não informa um número exato (área de alguns lotes, quantidade de animais, valor das máquinas), o item vem marcado para você conferir e completar.</T>
            </Card>
          ) : (
            <Card pad={16}><T>{map === 'outro' ? 'Mapa de mod: o save começa vazio. Cadastre os talhões em Talhões e as máquinas em Frota.' : 'Neste modo o jogo não dá terra, máquinas nem animais: o save começa vazio, só com o dinheiro.'}</T></Card>
          )}
          <Card pad={16} style={{ gap: 6, backgroundColor: c.harvestSoft, borderColor: '#EBD796' }}>
            <T style={{ fontWeight: '700', color: c.harvestInk }}>Dicas para este início</T>
            {[...MODE_TIPS[mode].slice(0, 2), ...(gameMap?.tips.slice(0, 2) ?? [])].map((t) => <T key={t} v="small" style={{ color: c.harvestInk }}>• {t}</T>)}
          </Card>
        </View>
      ) : null}

      {error ? <T style={{ color: c.danger }}>{error}</T> : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Btn kind="ghost" label={step === 0 ? 'Cancelar' : 'Voltar'} icon={step === 0 ? undefined : <ChevronLeft size={15} color={c.ink} />} onPress={() => (step === 0 ? onCancel() : (setError(''), setStep(step - 1)))} />
        {step < steps.length - 1 ? (
          <Btn label="Continuar" icon={<ChevronRight size={15} color="#fff" />} onPress={next} />
        ) : busy ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <Btn label="Criar save e começar" onPress={create} />
        )}
      </View>
    </View>
  );
}

function SaveCard({ s, index, onOpen, onRename, onDelete }: { s: SaveMeta; index: number; onOpen: () => void; onRename: () => void; onDelete: () => void }) {
  const date = new Date(s.updatedAt);
  return (
    <Appear index={index}>
      <Pressy accessibilityRole="button" accessibilityLabel={`Abrir save ${s.name}`} onPress={onOpen} scaleTo={0.98}>
        <Card pad={0} style={{ overflow: 'hidden', flexDirection: 'row' }}>
          <View style={{ width: 6, backgroundColor: mapColor(s.map) }} />
          <View style={{ flex: 1, padding: 14, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <T v="h2">{s.name}</T>
                <T v="small">{s.farmName !== s.name ? `${s.farmName} · ` : ''}atualizado em {date.toLocaleDateString('pt-BR')}</T>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Renomear ${s.name}`} onPress={onRename} hitSlop={6} style={{ padding: 8 }}><Pencil size={16} color={c.muted} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Excluir ${s.name}`} onPress={onDelete} hitSlop={6} style={{ padding: 8 }}><Trash2 size={16} color={c.danger} /></Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Badge tone="blue" label={s.mapName || mapById(s.map)?.name || 'Outro mapa'} />
              <Badge tone="green" label={MODE_NAME[s.mode] ?? s.mode} />
            </View>
          </View>
        </Card>
      </Pressy>
    </Appear>
  );
}

/** Lista de saves da conta (como os jogos salvos do FS25). */
export default function Saves() {
  const { user, saves, openSave, deleteSave, renameSave, logout, newSave } = useStore();
  const confirm = useConfirm();
  const wide = useWide();
  const [creating, setCreating] = useState(saves.length === 0);
  const [renaming, setRenaming] = useState<SaveMeta | null>(null);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ backgroundColor: c.sidebar, paddingHorizontal: 18, paddingTop: Platform.OS === 'web' ? 14 : 44, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: c.harvest, alignItems: 'center', justifyContent: 'center' }}><Wheat size={20} color={c.sidebar} /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font, color: '#fff', fontSize: 17, fontWeight: '700' }}>Olá, {user?.name.split(' ')[0]}</Text>
          <Text style={{ fontFamily: font, color: c.sidebarInk, fontSize: 12.5 }}>@{user?.username}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Sair da conta" onPress={logout} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.sidebarActive }}>
          <LogOut size={16} color="#fff" />
          <Text style={{ fontFamily: font, color: '#fff', fontWeight: '600', fontSize: 13 }}>Sair</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: wide ? 28 : 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center', gap: 14 }}>
          {creating ? (
            <NewSaveWizard onCancel={() => setCreating(false)} />
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <View>
                  <T v="title">Seus saves</T>
                  <T v="small" style={{ fontSize: 13.5 }}>Um save para cada jogo salvo do FS25.</T>
                </View>
                <Btn label="Novo save" icon={<Plus size={16} color="#fff" />} onPress={() => setCreating(true)} />
              </View>
              {saves.map((s, i) => (
                <SaveCard
                  key={s.id}
                  s={s}
                  index={i}
                  onOpen={() => openSave(s.id)}
                  onRename={() => setRenaming(s)}
                  onDelete={() => confirm({ title: `Excluir o save "${s.name}"?`, message: 'Talhões, safras, finanças e o diário deste save serão apagados deste aparelho. Isso não pode ser desfeito.', confirmLabel: 'Excluir save', onConfirm: () => deleteSave(s.id) })}
                />
              ))}
              {saves.length === 0 ? <Card><T style={{ textAlign: 'center', color: c.muted }}>Nenhum save ainda. Crie o primeiro.</T></Card> : null}
              <Btn kind="ghost" label="Explorar com uma fazenda de exemplo" onPress={() => newSave({ example: true })} />
            </>
          )}
        </View>
      </ScrollView>
      <FormSheet
        visible={!!renaming}
        title="Renomear save"
        fields={[{ key: 'name', label: 'Nome do save', type: 'text', required: true }]}
        initial={{ name: renaming?.name ?? '' }}
        submitLabel="Salvar"
        onClose={() => setRenaming(null)}
        onSubmit={async (v) => {
          if (renaming) await renameSave(renaming.id, v.name);
          setRenaming(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}
