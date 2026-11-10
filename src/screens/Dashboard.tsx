import { ArrowRight, Camera, ChevronRight, HandCoins, Sprout, Wheat } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { farmAlerts } from '../alerts';
import { CountUp } from '../anim';
import { AreaChart, FlowChart, Ring } from '../charts';
import { emptyData } from '../data/demo';
import { activePlantings, plantingStatus, sellAdvice, yearFlow } from '../selectors';
import { useStore } from '../store';
import { c, font } from '../theme';
import { Badge, Btn, Card, Dot, Legend, Photo, Screen, SeasonHeader, SeasonStrip, Section, T, useConfirm, useWide } from '../ui';
import { inYear, isoToBr, MONTHS_FULL, money, num, ofYear, periodIndex, yearLabel } from '../utils';
import { cropById, fieldById, Nav, plantingCells } from './common';

const TONE = { yellow: c.harvest, blue: c.sell, green: c.primary, red: c.danger };

function Tile({ label, children, note, onPress }: { label: string; children: React.ReactNode; note?: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [{ flexGrow: 1, flexBasis: 150, opacity: pressed ? 0.75 : 1 }]}>
      <Card style={{ flex: 1 }} pad={14}>
        <T v="label">{label}</T>
        <View style={{ marginTop: 6 }}>{children}</View>
        {note ? <T v="small" style={{ marginTop: 2 }}>{note}</T> : null}
      </Card>
    </Pressable>
  );
}

function Quick({ label, icon, onPress }: { label: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [{ flex: 1, alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 }]}>
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <Text style={{ fontFamily: font, fontSize: 12.5, fontWeight: '600', color: c.ink }}>{label}</Text>
    </Pressable>
  );
}

export default function Dashboard({ go }: Nav) {
  const { data, now, advanceMonth, replaceAll } = useStore();
  const confirm = useConfirm();
  const wide = useWide();
  const st = data.settings;
  const nowIdx = periodIndex(now.year, now.month);

  const active = activePlantings(data);
  const totalArea = data.fields.reduce((a, f) => a + f.areaHa, 0);
  const plantedIds = new Set(active.map((p) => p.fieldId));
  const plantedArea = data.fields.filter((f) => plantedIds.has(f.id)).reduce((a, f) => a + f.areaHa, 0);
  const flow = yearFlow(data, now.year);
  const income = flow.reduce((a, f) => a + f.income, 0);
  const expense = flow.reduce((a, f) => a + f.expense, 0);
  let run = 0;
  const balance = flow.map((f, i) => (i < now.month ? (run += f.income - f.expense) : run));
  const stockValue = sellAdvice(data, now.month).reduce((a, x) => a + x.valueNow, 0);
  const openTasks = data.tasks.filter((t) => !t.done);
  const lateTasks = openTasks.filter((t) => periodIndex(t.year, t.month) < nowIdx).length;
  const fleetValue = data.machines.filter((m) => m.ownership === 'proprio').reduce((a, m) => a + m.value, 0);
  const alerts = farmAlerts(data, now);
  const recent = data.records.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const nextMonth = MONTHS_FULL[now.month % 12].toLowerCase();

  return (
    <Screen
      title={st.farmName}
      subtitle={`${MONTHS_FULL[now.month - 1]}, ${yearLabel(now.year, st)}`}
      action={<Btn kind="ghost" small={!wide} label={`Avançar para ${nextMonth}`} icon={<ArrowRight size={16} color={c.ink} />} onPress={advanceMonth} />}
    >
      {st.demo ? (
        <Card style={{ backgroundColor: c.harvestSoft, borderColor: '#EBD796', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }} pad={14}>
          <T style={{ flex: 1, minWidth: 220, color: c.harvestInk }}>Estes são dados de exemplo. Quando quiser, apague tudo e cadastre a sua fazenda do jogo.</T>
          <Btn small kind="ghost" label="Começar do zero" onPress={() => confirm({ title: 'Começar do zero?', message: 'Os dados de exemplo serão apagados. O catálogo de culturas continua disponível.', confirmLabel: 'Apagar exemplo', onConfirm: () => replaceAll({ ...emptyData(), settings: { ...emptyData().settings, systemNotifications: st.systemNotifications } }) })} />
        </Card>
      ) : null}

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }}>
        <Pressable accessibilityRole="button" onPress={() => go('financeiro')} style={{ flex: wide ? 5 : undefined }}>
          <View style={{ backgroundColor: c.sidebar, borderRadius: 18, padding: 18, overflow: 'hidden' }}>
            <Text style={{ fontFamily: font, color: c.sidebarInk, fontSize: 13, fontWeight: '600' }}>Resultado {ofYear(now.year, st)}</Text>
            <CountUp value={income - expense} format={(n) => money(n, st)} style={{ color: '#fff', fontSize: 36, letterSpacing: -1, marginTop: 2 }} />
            <View style={{ flexDirection: 'row', gap: 18, marginTop: 6, marginBottom: 10 }}>
              <Text style={{ fontFamily: font, color: c.sidebarInk, fontSize: 13 }}>Receitas <Text style={{ color: '#fff', fontWeight: '700' }}>{money(income, st)}</Text></Text>
              <Text style={{ fontFamily: font, color: c.sidebarInk, fontSize: 13 }}>Despesas <Text style={{ color: '#fff', fontWeight: '700' }}>{money(expense, st)}</Text></Text>
            </View>
            <AreaChart values={balance} height={wide ? 110 : 84} color={c.harvest} nowIndex={now.month - 1} labels={false} />
            <Text style={{ fontFamily: font, color: '#7F9887', fontSize: 11.5, marginTop: 2 }}>Saldo acumulado, de janeiro até {MONTHS_FULL[now.month - 1].toLowerCase()}</Text>
          </View>
        </Pressable>
        <View style={{ flex: wide ? 4 : undefined, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Tile label="Área plantada" onPress={() => go('talhoes')} note={`de ${num(totalArea, 1)} ha`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ring pct={totalArea ? plantedArea / totalArea : 0} size={46} stroke={6}>
                <Text style={{ fontFamily: font, fontSize: 11, fontWeight: '700', color: c.ink }}>{totalArea ? Math.round((plantedArea / totalArea) * 100) : 0}%</Text>
              </Ring>
              <CountUp value={plantedArea} format={(n) => `${num(n, 1)} ha`} style={{ fontSize: 21 }} />
            </View>
          </Tile>
          <Tile label="Estoque a preço de hoje" onPress={() => go('estoque')} note="produção no silo">
            <CountUp value={stockValue} format={(n) => money(n, st)} style={{ fontSize: 21 }} />
          </Tile>
          <Tile label="Tarefas abertas" onPress={() => go('tarefas')} note={lateTasks ? `${lateTasks} ${lateTasks === 1 ? 'atrasada' : 'atrasadas'}` : 'nenhuma atrasada'}>
            <CountUp value={openTasks.length} format={(n) => String(Math.round(n))} style={[{ fontSize: 21 }, lateTasks ? { color: c.danger } : null]} />
          </Tile>
          <Tile label="Frota própria" onPress={() => go('frota')} note={`${data.machines.length} máquinas e implementos`}>
            <CountUp value={fleetValue} format={(n) => money(n, st)} style={{ fontSize: 21 }} />
          </Tile>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, maxWidth: 520, alignSelf: wide ? 'flex-start' : 'stretch', width: wide ? 520 : undefined }}>
        <Quick label="Plantar" icon={<Sprout size={22} color={c.primary} />} onPress={() => go('safras', 'novo')} />
        <Quick label="Colher" icon={<Wheat size={22} color={c.harvestInk} />} onPress={() => go('safras')} />
        <Quick label="Vender" icon={<HandCoins size={22} color={c.sell} />} onPress={() => go('vendas', 'novo')} />
        <Quick label="Registrar" icon={<Camera size={22} color={c.ink} />} onPress={() => go('diario', 'novo')} />
      </View>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        <Section title="Lavouras em andamento" style={{ flex: 3, alignSelf: 'stretch' }} right={<Btn small kind="ghost" label="Ver safras" onPress={() => go('safras')} />}>
          {active.length === 0 ? (
            <T v="small" style={{ paddingVertical: 12 }}>Nenhuma lavoura no campo. Toque em Plantar para registrar a primeira.</T>
          ) : (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: wide ? 190 : 112 }} />
                <View style={{ flex: 1 }}><SeasonHeader nowMonth={now.month} /></View>
                {wide ? <View style={{ width: 140 }} /> : null}
              </View>
              {active.map((p) => {
                const crop = cropById(data, p.cropId);
                const status = plantingStatus(p, nowIdx);
                return (
                  <View key={p.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={{ width: wide ? 190 : 112 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Dot color={status === 'pronto' ? c.harvest : crop?.color ?? c.faint} />
                        <T style={{ fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{crop?.name}</T>
                      </View>
                      <T v="small" numberOfLines={1}>{fieldById(data, p.fieldId)?.name}</T>
                    </View>
                    <View style={{ flex: 1 }}><SeasonStrip cells={plantingCells(p, now.year)} nowMonth={now.month} /></View>
                    {wide ? <View style={{ width: 140, alignItems: 'flex-end' }}><Badge label={status === 'pronto' ? 'Pronto para colher' : 'Crescendo'} tone={status === 'pronto' ? 'yellow' : 'green'} /></View> : null}
                  </View>
                );
              })}
              <Legend items={[{ color: c.primary, label: 'Plantio' }, { color: c.primarySoft, label: 'Crescimento' }, { color: c.harvest, label: 'Colheita prevista' }, { color: c.ink, label: 'Mês atual' }]} />
            </View>
          )}
        </Section>

        <Section title="Avisos" style={{ flex: 2, alignSelf: 'stretch' }} right={alerts.length ? <Btn small kind="ghost" label={`Ver os ${alerts.length}`} onPress={() => go('avisos')} /> : undefined}>
          {alerts.length === 0 ? <T v="small" style={{ paddingVertical: 12 }}>Tudo em dia. Nada pede atenção agora.</T> : null}
          {alerts.slice(0, 5).map((a) => (
            <Pressable key={a.id} accessibilityRole="button" onPress={() => go(a.route)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }, pressed && { opacity: 0.6 }]}>
              <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: TONE[a.tone] }} />
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: '600' }}>{a.title}</T>
                <T v="small">{a.detail}</T>
              </View>
              <ChevronRight size={16} color={c.faint} />
            </Pressable>
          ))}
        </Section>
      </View>

      {recent.length ? (
        <Section title="Últimos registros" right={<Btn small kind="ghost" label="Abrir diário" onPress={() => go('diario')} />}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {recent.map((r) => (
              <Pressable key={r.id} accessibilityRole="button" onPress={() => go('diario')} style={{ width: 150 }}>
                <Photo uri={r.photo} style={{ width: 150, height: 104, borderRadius: 10 }} fallback={<Camera size={22} color={c.primaryDark} />} />
                <T style={{ fontWeight: '600', marginTop: 6, fontSize: 13.5 }} numberOfLines={1}>{r.title}</T>
                <T v="small">{isoToBr(r.date)}</T>
              </Pressable>
            ))}
          </ScrollView>
        </Section>
      ) : null}

      <Section title={`Entradas e saídas ${inYear(now.year, st)}`} right={<Btn small kind="ghost" label="Abrir financeiro" onPress={() => go('financeiro')} />}>
        <FlowChart data={flow} nowMonth={now.month} />
        <View style={{ marginTop: 12 }}><Legend items={[{ color: c.primary, label: `Receitas: ${money(income, st)}` }, { color: '#C98A7E', label: `Despesas: ${money(expense, st)}` }]} /></View>
      </Section>
    </Screen>
  );
}
