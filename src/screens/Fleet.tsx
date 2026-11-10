import { Tractor } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { CountUp } from '../anim';
import { Meter } from '../charts';
import { deleteImage } from '../media';
import { useStore } from '../store';
import { c } from '../theme';
import { Machine } from '../types';
import { AddBtn, Badge, Card, DetailSheet, Empty, FieldDef, FormSheet, Photo, Screen, Segmented, Stat, T, useConfirm, useWide } from '../ui';
import { money, num } from '../utils';

const CATS = ['Trator', 'Colheitadeira', 'Veículo', 'Caminhão', 'Carreta', 'Implemento', 'Ferramenta', 'Outros'];
const PLURAL: Record<string, string> = { Trator: 'Tratores', Colheitadeira: 'Colheitadeiras', Veículo: 'Veículos', Caminhão: 'Caminhões', Carreta: 'Carretas', Implemento: 'Implementos', Ferramenta: 'Ferramentas', Outros: 'Outros' };
const MOTOR = ['Trator', 'Colheitadeira', 'Veículo', 'Caminhão'];
const OWN = { proprio: 'Próprio', alugado: 'Alugado', leasing: 'Leasing' };

const dec = (v?: number, d = 0) => (v ? num(v, d) : '');

export default function Fleet() {
  const { data, save, remove } = useStore();
  const confirm = useConfirm();
  const wide = useWide();
  const { width } = useWindowDimensions();
  const st = data.settings;
  const [cat, setCat] = useState('todos');
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const motor = (v: Record<string, any>) => MOTOR.includes(v.category);
  const tool = (v: Record<string, any>) => v.category === 'Ferramenta';
  const form: FieldDef[] = [
    { key: 'photo', label: 'Imagem', type: 'photo' },
    { key: 'name', label: 'Nome ou modelo', type: 'text', required: true, placeholder: 'Ex.: Fendt 942 Vario' },
    { key: 'brand', label: 'Marca', type: 'text', half: true, placeholder: 'Ex.: Fendt' },
    { key: 'category', label: 'Categoria', type: 'select', required: true, half: true, options: CATS.map((x) => ({ value: x, label: x })) },
    { key: 'ownership', label: 'Posse', type: 'choice', options: [{ value: 'proprio', label: 'Próprio' }, { value: 'alugado', label: 'Alugado' }, { value: 'leasing', label: 'Leasing' }] },
    { key: 'value', label: `Preço (${st.currency})`, type: 'number', half: true },
    { key: 'upkeep', label: `Manutenção por dia (${st.currency})`, type: 'number', half: true },
    { key: 'powerCv', label: 'Potência (cv)', type: 'number', half: true, showIf: motor },
    { key: 'speedKmh', label: 'Velocidade máxima (km/h)', type: 'number', half: true, showIf: (v) => !tool(v) },
    { key: 'tankL', label: 'Tanque de combustível (L)', type: 'number', half: true, showIf: motor },
    { key: 'requiredCv', label: 'Potência exigida (cv)', type: 'number', half: true, showIf: (v) => !motor(v) && !tool(v) },
    { key: 'widthM', label: 'Largura de trabalho (m)', type: 'number', half: true, showIf: (v) => !tool(v) && v.category !== 'Veículo' && v.category !== 'Trator' },
    { key: 'capacityL', label: 'Capacidade (L)', type: 'number', half: true, showIf: (v) => !tool(v) && v.category !== 'Trator' },
    { key: 'hours', label: 'Horas de uso', type: 'number', half: true },
    { key: 'serviceAt', label: 'Próxima revisão (horas)', type: 'number', half: true, hint: 'Gera um aviso quando as horas chegam perto.' },
    { key: 'notes', label: 'Observações', type: 'multiline', placeholder: 'Configuração comprada, pneus, cor, para que usa…' },
  ];
  const blank = { name: '', brand: '', category: '', ownership: 'proprio', value: '', upkeep: '', powerCv: '', speedKmh: '', tankL: '', requiredCv: '', widthM: '', capacityL: '', hours: '', serviceAt: '', notes: '' };

  const cats = CATS.filter((x) => data.machines.some((m) => m.category === x));
  const rows = data.machines.filter((m) => cat === 'todos' || m.category === cat);
  const owned = data.machines.filter((m) => m.ownership === 'proprio');
  const totalValue = owned.reduce((a, m) => a + m.value, 0);
  const upkeep = data.machines.reduce((a, m) => a + (m.upkeep ?? 0), 0);
  const power = data.machines.filter((m) => m.category === 'Trator').reduce((a, m) => Math.max(a, m.powerCv ?? 0), 0);
  const open = data.machines.find((m) => m.id === openId) ?? null;
  const cols = wide ? Math.max(2, Math.floor((Math.min(width - 232, 1180) - 56) / 270)) : 1;

  const spec = (m: Machine) => [m.powerCv ? `${num(m.powerCv)} cv` : m.requiredCv ? `exige ${num(m.requiredCv)} cv` : '', m.widthM ? `${num(m.widthM, 1)} m` : '', m.capacityL ? `${num(m.capacityL)} L` : ''].filter(Boolean).join(', ');
  const del = (m: Machine) =>
    confirm({ title: `Excluir ${m.name}?`, message: 'O item sai da frota e a imagem é apagada.', confirmLabel: 'Excluir da frota', onConfirm: () => { deleteImage(m.photo); remove('machines', m.id); setOpenId(null); } });

  return (
    <Screen title="Frota" subtitle="Tratores, veículos, implementos e ferramentas" action={<AddBtn label="Cadastrar" onPress={() => setEditing(blank)} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Stat label="Patrimônio próprio" value={<CountUp value={totalValue} format={(n) => money(n, st)} />} note={`${owned.length} de ${data.machines.length} itens`} />
        <Stat label="Manutenção por dia" value={<CountUp value={upkeep} format={(n) => money(n, st)} />} note="soma de toda a frota" />
        <Stat label="Maior trator" value={<CountUp value={power} format={(n) => `${num(n)} cv`} />} note="limite para os implementos" />
      </View>

      {cats.length > 1 ? <Segmented value={cat} onChange={setCat} options={[{ value: 'todos', label: 'Todos' }, ...cats.map((x) => ({ value: x, label: PLURAL[x] }))]} /> : null}

      {rows.length === 0 ? (
        <Card><Empty title="Nada cadastrado aqui" hint="Cadastre cada trator, veículo, implemento e ferramenta com imagem e especificações do jogo." action={<AddBtn label="Cadastrar" onPress={() => setEditing(blank)} />} /></Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
          {rows.map((m) => {
            const pct = m.serviceAt ? m.hours / m.serviceAt : 0;
            return (
              <View key={m.id} style={{ width: `${100 / cols}%`, padding: 6 }}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${m.name}`} onPress={() => setOpenId(m.id)} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
                  <Card pad={0} style={{ overflow: 'hidden', flexDirection: wide ? 'column' : 'row' }}>
                    <Photo uri={m.photo} style={wide ? { width: '100%', aspectRatio: 16 / 9 } : { width: 108, height: 108 }} fallback={<Tractor size={wide ? 36 : 28} color={c.primaryDark} />} />
                    <View style={{ flex: 1, padding: 12, gap: 3, justifyContent: 'center' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                        <T style={{ fontWeight: '700', fontSize: 15, flex: 1 }} numberOfLines={1}>{m.name}</T>
                        <Badge tone={m.ownership === 'proprio' ? 'green' : 'blue'} label={OWN[m.ownership]} />
                      </View>
                      <T v="small" numberOfLines={1}>{[m.category, m.brand].filter(Boolean).join(', ')}</T>
                      {spec(m) ? <T v="small" style={{ color: c.ink }} numberOfLines={1}>{spec(m)}</T> : null}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                        <T style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{money(m.value, st)}</T>
                        {pct >= 0.9 ? <Badge tone={pct >= 1 ? 'red' : 'yellow'} label={pct >= 1 ? 'Revisão vencida' : 'Revisão chegando'} /> : null}
                      </View>
                    </View>
                  </Card>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <DetailSheet
        visible={!!open}
        title={open?.name ?? ''}
        subtitle={[open?.category, open?.brand].filter(Boolean).join(', ')}
        photo={open?.photo}
        fallback={<Tractor size={48} color={c.primaryDark} />}
        rows={[
          ['Posse', open ? OWN[open.ownership] : ''],
          ['Preço', open ? money(open.value, st) : ''],
          ['Manutenção por dia', open?.upkeep ? money(open.upkeep, st) : ''],
          ['Potência', open?.powerCv ? `${dec(open.powerCv)} cv` : ''],
          ['Potência exigida', open?.requiredCv ? `${dec(open.requiredCv)} cv` : ''],
          ['Velocidade máxima', open?.speedKmh ? `${dec(open.speedKmh)} km/h` : ''],
          ['Largura de trabalho', open?.widthM ? `${dec(open.widthM, 1)} m` : ''],
          ['Capacidade', open?.capacityL ? `${dec(open.capacityL)} L` : ''],
          ['Tanque de combustível', open?.tankL ? `${dec(open.tankL)} L` : ''],
          ['Horas de uso', open ? `${num(open.hours)} h` : ''],
          ['Observações', open?.notes],
        ]}
        onEdit={() => { if (open) { setOpenId(null); setEditing(open); } }}
        onDelete={() => open && del(open)}
        onClose={() => setOpenId(null)}
      >
        {open?.serviceAt ? (
          <View style={{ marginTop: 12, gap: 6 }}>
            <T v="small">Revisão: {num(open.hours)} de {num(open.serviceAt)} horas</T>
            <Meter pct={open.hours / open.serviceAt} color={open.hours >= open.serviceAt ? c.danger : open.hours >= open.serviceAt * 0.9 ? c.harvest : c.primary} height={8} />
          </View>
        ) : null}
      </DetailSheet>
      <FormSheet
        visible={!!editing}
        title={editing?.id ? 'Editar item da frota' : 'Cadastrar na frota'}
        fields={form}
        initial={editing ?? blank}
        submitLabel="Salvar na frota"
        onClose={() => setEditing(null)}
        onSubmit={(v) => {
          const before = data.machines.find((m) => m.id === v.id);
          if (before?.photo && before.photo !== v.photo) deleteImage(before.photo);
          save('machines', v);
          setEditing(null);
        }}
      />
    </Screen>
  );
}
