import { AlertTriangle, Check, ChevronRight, CircleCheck, Factory, Globe, Lightbulb, Search, Shuffle, Sprout, Store, Wrench } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { GUIDE, GuideCategory, GuideTopic, QUICK_TIPS, SITUATIONS, Situation } from '../data/guide';
import { Appear, celebrate, Collapse, ProgressBar, Pressy, Pulse, Swap, useSpin } from '../motion';
import { contextTips, farmPrep, FieldPrep, PrepStep } from '../prep';
import { useStore } from '../store';
import { c, font, radius } from '../theme';
import { Badge, Btn, Card, Empty, Screen, Segmented, T, useWide } from '../ui';
import { isoToBr, todayIso } from '../utils';
import { Nav } from './common';
import { GameMap, MAPS } from '../data/maps';
import { MapFieldsSheet } from './MapFields';
import { GUIDE_ICONS, TutorialCarousel } from './Tutorial';

type Tab = 'assistente' | 'mapas' | 'guia' | 'situacoes' | 'dicas' | 'tutorial';
const TONE = { red: c.danger, yellow: c.harvest, blue: c.sell, green: c.primary };
const ALL_TOPICS = GUIDE.flatMap((g) => g.topics.map((t) => ({ ...t, cat: g })));
const TOTAL = ALL_TOPICS.length + SITUATIONS.length;
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ---------- Peças ---------- */

function Chevron({ open, color = c.faint }: { open: boolean; color?: string }) {
  const rotate = useSpin(open);
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <ChevronRight size={18} color={color} />
    </Animated.View>
  );
}

function ReadToggle({ id }: { id: string }) {
  const { data, toggleGuide } = useStore();
  const read = data.guideRead.includes(id);
  return (
    <Pressy
      accessibilityRole="checkbox"
      accessibilityState={{ checked: read }}
      onPress={() => {
        if (!read) celebrate();
        toggleGuide(id);
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 18, backgroundColor: read ? c.primary : c.surfaceAlt, borderWidth: 1, borderColor: read ? c.primary : c.line }}
    >
      <Check size={14} color={read ? '#fff' : c.muted} strokeWidth={3} />
      <Text style={{ fontFamily: font, fontSize: 13, fontWeight: '600', color: read ? '#fff' : c.ink }}>{read ? 'Aprendido' : 'Marcar como aprendido'}</Text>
    </Pressy>
  );
}

/** Passos numerados com linha do tempo. */
function Steps({ steps }: { steps: NonNullable<GuideTopic['steps']> }) {
  return (
    <View>
      {steps.map((s, i) => (
        <Appear key={s.title} index={i} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ alignItems: 'center', width: 26 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: font, color: '#fff', fontSize: 12.5, fontWeight: '700' }}>{i + 1}</Text>
            </View>
            {i < steps.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: c.primarySoft, marginVertical: 2 }} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: 14 }}>
            {s.title ? <T style={{ fontWeight: '700' }}>{s.title.replace(/^\d+\.\s*/, '')}</T> : null}
            <T style={s.title ? { color: c.muted, marginTop: 2 } : { marginTop: 3 }}>{s.text}</T>
            {s.tool ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                <Wrench size={13} color={c.harvestInk} />
                <T v="small" style={{ color: c.harvestInk, fontWeight: '600' }}>{s.tool}</T>
              </View>
            ) : null}
          </View>
        </Appear>
      ))}
    </View>
  );
}

function Tips({ tips }: { tips: string[] }) {
  return (
    <View style={{ backgroundColor: c.harvestSoft, borderRadius: radius.md, padding: 12, gap: 8 }}>
      {tips.map((t) => (
        <View key={t} style={{ flexDirection: 'row', gap: 8 }}>
          <Lightbulb size={16} color={c.harvestInk} style={{ marginTop: 2 }} />
          <T style={{ flex: 1, color: c.harvestInk }}>{t}</T>
        </View>
      ))}
    </View>
  );
}

function Warning({ text }: { text: string }) {
  return (
    <View style={{ backgroundColor: c.dangerSoft, borderRadius: radius.md, padding: 12, flexDirection: 'row', gap: 8 }}>
      <AlertTriangle size={16} color={c.danger} style={{ marginTop: 2 }} />
      <T style={{ flex: 1, color: c.danger }}>{text}</T>
    </View>
  );
}

function TopicItem({ topic, open, onToggle, first }: { topic: GuideTopic; open: boolean; onToggle: () => void; first?: boolean }) {
  const { data } = useStore();
  const read = data.guideRead.includes(topic.id);
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: c.line }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }, pressed && { opacity: 0.7 }]}>
        {read ? <CircleCheck size={18} color={c.primary} /> : <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: c.line }} />}
        <View style={{ flex: 1 }}>
          <T style={{ fontWeight: '700' }}>{topic.title}</T>
          <T v="small" numberOfLines={open ? undefined : 1}>{topic.summary}</T>
        </View>
        <Chevron open={open} />
      </Pressable>
      <Collapse open={open}>
        <View style={{ gap: 12, paddingBottom: 16, paddingLeft: 4 }}>
          {topic.steps ? <Steps steps={topic.steps} /> : null}
          {topic.warning ? <Warning text={topic.warning} /> : null}
          {topic.tips ? <Tips tips={topic.tips} /> : null}
          <ReadToggle id={topic.id} />
        </View>
      </Collapse>
    </View>
  );
}

function CategoryCard({ cat, open, onToggle, openTopic, setOpenTopic, index }: { cat: GuideCategory; open: boolean; onToggle: () => void; openTopic: string | null; setOpenTopic: (id: string | null) => void; index: number }) {
  const { data } = useStore();
  const Icon = GUIDE_ICONS[cat.icon];
  const read = cat.topics.filter((t) => data.guideRead.includes(t.id)).length;
  return (
    <Appear index={index}>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }, pressed && { backgroundColor: c.surfaceAlt }]}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: cat.color, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={24} color="#fff" />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <T v="h2">{cat.title}</T>
            <T v="small">{cat.subtitle}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, maxWidth: 160 }}><ProgressBar pct={read / cat.topics.length} color={cat.color} height={5} /></View>
              <T v="small">{read}/{cat.topics.length}</T>
            </View>
          </View>
          <Chevron open={open} />
        </Pressable>
        <Collapse open={open}>
          <View style={{ paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: c.line }}>
            {cat.topics.map((t, i) => (
              <TopicItem key={t.id} topic={t} first={i === 0} open={openTopic === t.id} onToggle={() => setOpenTopic(openTopic === t.id ? null : t.id)} />
            ))}
          </View>
        </Collapse>
      </Card>
    </Appear>
  );
}

function SituationCard({ s, open, onToggle, index }: { s: Situation; open: boolean; onToggle: () => void; index: number }) {
  const Icon = GUIDE_ICONS[s.icon];
  const { data } = useStore();
  const read = data.guideRead.includes(s.id);
  return (
    <Appear index={index}>
      <Card pad={0} style={{ overflow: 'hidden', flexDirection: 'row' }}>
        <View style={{ width: 5, backgroundColor: TONE[s.tone] }} />
        <View style={{ flex: 1 }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }, pressed && { backgroundColor: c.surfaceAlt }]}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} color={TONE[s.tone]} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '700' }}>{s.problem}</T>
              <T v="small" numberOfLines={open ? undefined : 1}>{s.signs}</T>
            </View>
            {read ? <CircleCheck size={18} color={c.primary} /> : null}
            <Chevron open={open} />
          </Pressable>
          <Collapse open={open}>
            <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 12 }}>
              <T v="label" style={{ color: c.ink }}>O que fazer</T>
              <Steps steps={s.fix.map((f) => ({ title: '', text: f }))} />
              {s.prevent ? <Tips tips={[`Para não acontecer de novo: ${s.prevent}`]} /> : null}
              <ReadToggle id={s.id} />
            </View>
          </Collapse>
        </View>
      </Card>
    </Appear>
  );
}

/* ---------- Assistente de preparo ---------- */

function StepRow({ step, onDone, onHelp, blocked }: { step: PrepStep; onDone: () => void; onHelp: () => void; blocked?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line, opacity: step.done ? 0.6 : 1 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, marginTop: 1, backgroundColor: step.done ? c.primary : 'transparent', borderWidth: 2, borderColor: step.done ? c.primary : c.faint, alignItems: 'center', justifyContent: 'center' }}>
        {step.done ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T style={[{ fontWeight: '700' }, step.done && { textDecorationLine: 'line-through' }]}>{step.title}</T>
        {!step.done ? (
          <>
            <T v="small">{step.why}</T>
            <T style={{ color: c.muted }}>{step.how}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <Badge tone="yellow" label={step.tool} />
              <Btn small kind="ghost" label="Como fazer" onPress={onHelp} />
              {!blocked ? <Btn small label="Concluir etapa" icon={<Check size={14} color="#fff" />} onPress={onDone} /> : <T v="small">Faça depois da colheita</T>}
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

function FieldPrepCard({ p, open, onToggle, onHelp, index, go }: { p: FieldPrep; open: boolean; onToggle: () => void; onHelp: (id: string) => void; index: number; go: Nav['go'] }) {
  const { save, now } = useStore();
  const pct = p.done / p.steps.length;
  const complete = !p.next;
  const finish = (step: PrepStep) => {
    save('fields', { id: p.field.id, ...step.patch });
    save('records', { title: `${step.title} em ${p.field.name}`, type: step.workType, fieldId: p.field.id, date: todayIso(), year: now.year, month: now.month, notes: `Concluído pelo Assistente de preparo. Máquina: ${step.tool}.` });
    celebrate();
  };
  return (
    <Appear index={index}>
      <Card pad={0} style={{ overflow: 'hidden', borderColor: complete ? c.primary : c.line }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={({ pressed }) => [{ padding: 14, gap: 8 }, pressed && { backgroundColor: c.surfaceAlt }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <T v="h2">{p.field.name}</T>
              <T v="small">{p.field.areaHa.toString().replace('.', ',')} ha · {p.planted ? 'com lavoura' : 'livre'}</T>
            </View>
            {complete ? (
              <Pulse amount={0.06}>
                <Badge tone="green" label="Solo pronto" />
              </Pulse>
            ) : (
              <Badge tone="yellow" label={`Próximo: ${p.next!.title}`} />
            )}
            <Chevron open={open} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}><ProgressBar pct={pct} color={complete ? c.primary : c.harvest} /></View>
            <T v="small" style={{ fontWeight: '700' }}>{p.done}/{p.steps.length}</T>
          </View>
        </Pressable>
        <Collapse open={open}>
          <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
            {p.steps.map((s) => (
              <StepRow key={s.key} step={s} blocked={s.key === 'arar' && p.planted} onDone={() => finish(s)} onHelp={() => onHelp(s.guide)} />
            ))}
            {complete && !p.planted ? (
              <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12, gap: 8 }}>
                <T style={{ fontWeight: '700' }}>Pronto para plantar!</T>
                {p.canPlant.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {p.canPlant.slice(0, 8).map((x) => <Badge key={x.id} tone="green" label={x.name} />)}
                  </View>
                ) : (
                  <T v="small">Nenhuma cultura do catálogo pode ser plantada neste mês. Veja o Calendário.</T>
                )}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn small label="Registrar plantio" icon={<Sprout size={14} color="#fff" />} onPress={() => go('safras', 'novo')} />
                  <Btn small kind="ghost" label="Calendário" onPress={() => go('calendario')} />
                </View>
              </View>
            ) : null}
          </View>
        </Collapse>
      </Card>
    </Appear>
  );
}

/* ---------- Mapas ---------- */

function Chips({ items, icon }: { items: string[]; icon: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {items.map((x) => (
        <View key={x} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.line }}>
          {icon}
          <Text style={{ fontFamily: font, fontSize: 12.5, color: c.ink }}>{x}</Text>
        </View>
      ))}
    </View>
  );
}

function MapCard({ m, open, selected, onToggle, onSelect, onImport, index }: { m: GameMap; open: boolean; selected: boolean; onToggle: () => void; onSelect: () => void; onImport: () => void; index: number }) {
  return (
    <Appear index={index}>
      <Card pad={0} style={{ overflow: 'hidden', borderColor: selected ? m.color : c.line, borderWidth: selected ? 2 : 1 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }, pressed && { backgroundColor: c.surfaceAlt }]}>
          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: m.color, alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={20} color="#fff" />
            <Text style={{ fontFamily: font, color: '#fff', fontSize: 10, fontWeight: '800', marginTop: 1 }}>{m.tag}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <T v="h2">{m.name}</T>
              {selected ? <Pulse amount={0.05}><Badge tone="green" label="Seu mapa" /></Pulse> : null}
            </View>
            <T v="small">{m.region}</T>
            <T v="small" numberOfLines={open ? undefined : 1} style={{ color: c.ink }}>{m.summary}</T>
          </View>
          <Chevron open={open} />
        </Pressable>
        <Collapse open={open}>
          <View style={{ paddingHorizontal: 14, paddingBottom: 16, gap: 14 }}>
            <View>
              {m.facts.map(([k, v]) => (
                <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
                  <T style={{ color: c.muted }}>{k}</T>
                  <T style={{ fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{v}</T>
                </View>
              ))}
            </View>
            {m.startLots.length ? (
              <View style={{ gap: 6 }}>
                <T v="label" style={{ color: c.ink }}>Lotes iniciais</T>
                {m.startLots.map((l) => (
                  <View key={l.no} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Badge tone={l.rice ? 'blue' : 'green'} label={`Lote ${l.no}`} />
                    <T v="small" style={{ flex: 1 }}>{[l.areaHa ? `${String(l.areaHa).replace('.', ',')} ha` : null, l.note].filter(Boolean).join(' · ')}</T>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={{ gap: 6 }}>
              <T v="label" style={{ color: c.ink }}>Pontos de venda</T>
              <Chips items={m.sellPoints} icon={<Store size={12} color={c.sell} />} />
            </View>
            <View style={{ gap: 6 }}>
              <T v="label" style={{ color: c.ink }}>Produções</T>
              <Chips items={m.productions} icon={<Factory size={12} color={c.harvestInk} />} />
            </View>
            <View style={{ gap: 6 }}>
              <T v="label" style={{ color: c.ink }}>Dicas deste mapa</T>
              <Tips tips={m.tips} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {!selected ? <Btn small label="Este é o meu mapa" onPress={onSelect} /> : null}
              <Btn small kind={selected ? 'primary' : 'ghost'} label="Cadastrar talhões deste mapa" onPress={onImport} />
            </View>
          </View>
        </Collapse>
      </Card>
    </Appear>
  );
}

/* ---------- Tela ---------- */

export default function Guide({ go, intent }: Nav) {
  const { data, now, setSettings } = useStore();
  const wide = useWide();
  const [tab, setTab] = useState<Tab>('assistente');
  const [openCat, setOpenCat] = useState<string | null>('preparo');
  const [openTopic, setOpenTopic] = useState<string | null>('preparo-ciclo');
  const [openSit, setOpenSit] = useState<string | null>(null);
  const [openField, setOpenField] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openMap, setOpenMap] = useState<string | null>(data.settings.map ?? 'riverbend');
  const [importing, setImporting] = useState(false);
  const [tipAt, setTipAt] = useState(() => (now.year * 12 + now.month) % QUICK_TIPS.length);

  const prep = useMemo(() => farmPrep(data, now.month), [data, now.month]);
  const ctx = useMemo(() => contextTips(data, now.month), [data, now.month]);
  const read = data.guideRead.length;

  /** Abre o tópico ou a situação com esse id, onde estiver. */
  const openGuide = (id: string) => {
    setQuery('');
    if (id.startsWith('mapa:')) {
      setTab('mapas');
      setOpenMap(id.slice(5));
      return;
    }
    const sit = SITUATIONS.find((s) => s.id === id);
    if (sit) {
      setTab('situacoes');
      setOpenSit(id);
      return;
    }
    const topic = ALL_TOPICS.find((t) => t.id === id);
    if (topic) {
      setTab('guia');
      setOpenCat(topic.cat.id);
      setOpenTopic(id);
    }
  };

  useEffect(() => {
    if (!intent) return;
    if (['tutorial', 'dicas', 'situacoes', 'guia', 'assistente', 'mapas'].includes(intent)) setTab(intent as Tab);
    else if (intent.startsWith('ver:')) openGuide(intent.slice(4));
    else if (intent.startsWith('talhao:')) {
      setTab('assistente');
      setOpenField(intent.slice(7));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = norm(query.trim());
  const results = q
    ? [
        ...ALL_TOPICS.filter((t) => norm([t.title, t.summary, ...(t.steps ?? []).map((s) => `${s.title} ${s.text} ${s.tool ?? ''}`), ...(t.tips ?? []), t.warning ?? ''].join(' ')).includes(q)).map((t) => ({ id: t.id, title: t.title, sub: `${t.cat.title} · ${t.summary}` })),
        ...SITUATIONS.filter((s) => norm([s.problem, s.signs, ...s.fix, s.prevent ?? ''].join(' ')).includes(q)).map((s) => ({ id: s.id, title: s.problem, sub: `O que fazer se… · ${s.signs}` })),
        ...MAPS.filter((m) => norm([m.name, m.region, m.summary, ...m.tips, ...m.sellPoints, ...m.productions].join(' ')).includes(q)).map((m) => ({ id: `mapa:${m.id}`, title: m.name, sub: `Mapa · ${m.region}` })),
      ]
    : [];

  const pending = prep.filter((p) => p.next).length;

  return (
    <Screen title="Guia e dicas" subtitle={`Como jogar, preparo do campo, adubos e o que fazer em cada situação`}>
      <Card pad={14} style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <T style={{ fontWeight: '700', flex: 1 }}>Seu progresso no guia</T>
          <T v="small" style={{ fontWeight: '700' }}>{read} de {TOTAL} aprendidos</T>
        </View>
        <ProgressBar pct={read / TOTAL} color={c.harvest} height={10} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 10, backgroundColor: c.surface }}>
          <Search size={16} color={c.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar: pedras, chorume, ervas, calcário…"
            placeholderTextColor={c.faint}
            style={[{ flex: 1, fontFamily: font, fontSize: 14.5, color: c.ink, paddingVertical: 10 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
          />
          {query ? <Btn small kind="ghost" label="Limpar" onPress={() => setQuery('')} /> : null}
        </View>
      </Card>

      {q ? (
        <Card pad={0}>
          {results.length === 0 ? <Empty title="Nada encontrado" hint="Tente outra palavra, como adubo, colheita, arroz ou contrato." /> : null}
          {results.map((r, i) => (
            <Appear key={r.id} index={i}>
              <Pressable accessibilityRole="button" onPress={() => openGuide(r.id)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }, pressed && { backgroundColor: c.surfaceAlt }]}>
                <View style={{ flex: 1 }}>
                  <T style={{ fontWeight: '700' }}>{r.title}</T>
                  <T v="small" numberOfLines={2}>{r.sub}</T>
                </View>
                <ChevronRight size={16} color={c.faint} />
              </Pressable>
            </Appear>
          ))}
        </Card>
      ) : (
        <>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'assistente', label: pending ? `Assistente (${pending})` : 'Assistente' },
              { value: 'mapas', label: 'Mapas' },
              { value: 'guia', label: 'Passo a passo' },
              { value: 'situacoes', label: 'O que fazer se…' },
              { value: 'dicas', label: 'Dicas' },
              { value: 'tutorial', label: 'Tutorial do app' },
            ]}
          />

          {tab === 'assistente' ? (
            <View style={{ gap: 12 }}>
              <T v="small" style={{ fontSize: 13.5 }}>Etapas que faltam em cada talhão, na ordem certa. Ao concluir, o talhão é atualizado e o trabalho vai para o Diário — depois você pode anexar um vídeo nele.</T>
              {prep.length === 0 ? (
                <Card><Empty title="Nenhum talhão cadastrado" hint="Cadastre seus campos com o estado do solo para o assistente dizer o que fazer em cada um." action={<Btn label="Cadastrar talhão" onPress={() => go('talhoes')} />} /></Card>
              ) : (
                <View style={{ flexDirection: wide ? 'row' : 'column', flexWrap: 'wrap', gap: 12 }}>
                  {prep
                    .slice()
                    .sort((a, b) => a.done - b.done)
                    .map((p, i) => (
                      <View key={p.field.id} style={wide ? { width: '49%', flexGrow: 1 } : undefined}>
                        <FieldPrepCard p={p} index={i} go={go} open={openField === p.field.id} onToggle={() => setOpenField(openField === p.field.id ? null : p.field.id)} onHelp={openGuide} />
                      </View>
                    ))}
                </View>
              )}
            </View>
          ) : null}

          {tab === 'guia' ? (
            <View style={{ gap: 12 }}>
              {GUIDE.map((cat, i) => (
                <CategoryCard key={cat.id} cat={cat} index={i} open={openCat === cat.id} onToggle={() => setOpenCat(openCat === cat.id ? null : cat.id)} openTopic={openTopic} setOpenTopic={setOpenTopic} />
              ))}
            </View>
          ) : null}

          {tab === 'situacoes' ? (
            <View style={{ gap: 10 }}>
              <T v="small" style={{ fontSize: 13.5 }}>Apareceu um problema no jogo? Toque na situação para ver o passo a passo.</T>
              {SITUATIONS.map((s, i) => (
                <SituationCard key={s.id} s={s} index={i} open={openSit === s.id} onToggle={() => setOpenSit(openSit === s.id ? null : s.id)} />
              ))}
            </View>
          ) : null}

          {tab === 'dicas' ? (
            <View style={{ gap: 12 }}>
              <View style={{ backgroundColor: c.sidebar, borderRadius: 18, padding: 18, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pulse><Lightbulb size={20} color={c.harvest} /></Pulse>
                  <Text style={{ fontFamily: font, color: c.harvest, fontWeight: '700', fontSize: 13, flex: 1 }}>DICA {tipAt + 1} DE {QUICK_TIPS.length}</Text>
                  <Pressy accessibilityRole="button" accessibilityLabel="Outra dica" onPress={() => setTipAt((tipAt + 1 + Math.floor(Math.random() * (QUICK_TIPS.length - 1))) % QUICK_TIPS.length)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.sidebarActive, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16 }}>
                    <Shuffle size={14} color="#fff" />
                    <Text style={{ fontFamily: font, color: '#fff', fontWeight: '600', fontSize: 13 }}>Outra</Text>
                  </Pressy>
                </View>
                <Swap k={tipAt}>
                  <Text style={{ fontFamily: font, color: '#fff', fontSize: 18, fontWeight: '600', lineHeight: 25 }}>{QUICK_TIPS[tipAt]}</Text>
                </Swap>
              </View>

              {ctx.length ? (
                <Card pad={14} style={{ gap: 4 }}>
                  <T v="h2">Para a sua fazenda agora</T>
                  {ctx.slice(0, 8).map((t, i) => (
                    <Appear key={t.text} index={i}>
                      <Pressable accessibilityRole="button" onPress={() => { setTab('assistente'); setOpenField(t.field ?? null); }} style={({ pressed }) => [{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }, pressed && { opacity: 0.6 }]}>
                        <Sprout size={16} color={c.primary} style={{ marginTop: 2 }} />
                        <T style={{ flex: 1 }}>{t.text}</T>
                        <ChevronRight size={16} color={c.faint} />
                      </Pressable>
                    </Appear>
                  ))}
                </Card>
              ) : null}

              <Card pad={14} style={{ gap: 4 }}>
                <T v="h2">Todas as dicas rápidas</T>
                {QUICK_TIPS.map((t, i) => (
                  <Appear key={t} index={i}>
                    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: c.line }}>
                      <Text style={{ fontFamily: font, color: c.harvestInk, fontWeight: '700', width: 22 }}>{i + 1}</Text>
                      <T style={{ flex: 1 }}>{t}</T>
                    </View>
                  </Appear>
                ))}
              </Card>
            </View>
          ) : null}

          {tab === 'mapas' ? (
            <View style={{ gap: 12 }}>
              <T v="small" style={{ fontSize: 13.5 }}>Os três mapas que vêm com o Farming Simulator 25. Escolha o seu para ver dicas específicas no Painel e cadastrar os talhões com o número do jogo.</T>
              {MAPS.map((m, i) => (
                <MapCard
                  key={m.id}
                  m={m}
                  index={i}
                  open={openMap === m.id}
                  selected={data.settings.map === m.id}
                  onToggle={() => setOpenMap(openMap === m.id ? null : m.id)}
                  onSelect={() => {
                    setSettings({ map: m.id });
                    celebrate();
                  }}
                  onImport={() => {
                    setSettings({ map: m.id });
                    setImporting(true);
                  }}
                />
              ))}
              <T v="small">Dados reunidos de guias da comunidade e da wiki do jogo. Atualizações do jogo podem mudar números de lotes e pontos de venda: confira no mapa do seu jogo salvo.</T>
              <MapFieldsSheet visible={importing} onClose={() => setImporting(false)} />
            </View>
          ) : null}

          {tab === 'tutorial' ? (
            <View style={{ gap: 12 }}>
              <Card pad={20}>
                <TutorialCarousel go={go} />
              </Card>
              <Btn kind="ghost" label="Mostrar as boas-vindas ao abrir o app" onPress={() => setSettings({ tutorialSeen: false })} />
              <T v="small">Os efeitos de pedras, ervas daninhas, calcário e aração só existem no jogo se estiverem ligados nas configurações do jogo salvo.</T>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
