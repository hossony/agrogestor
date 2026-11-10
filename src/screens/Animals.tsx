import { PawPrint } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { CountUp } from '../anim';
import { Meter } from '../charts';
import { deleteImage } from '../media';
import { useStore } from '../store';
import { c } from '../theme';
import { Animal } from '../types';
import { AddBtn, Badge, Card, DetailSheet, Empty, FieldDef, FormSheet, Photo, Screen, Stat, T, useConfirm, useWide } from '../ui';
import { money, num } from '../utils';

const SPECIES = ['Vacas', 'Búfalos', 'Ovelhas', 'Cabras', 'Porcos', 'Galinhas', 'Cavalos', 'Abelhas', 'Outros'];
const PRODUCT: Record<string, string> = { Vacas: 'Leite', Búfalos: 'Leite de búfala', Ovelhas: 'Lã', Cabras: 'Leite de cabra', Porcos: 'Venda de animais', Galinhas: 'Ovos', Cavalos: 'Venda após treino', Abelhas: 'Mel' };
const healthColor = (v: number) => (v < 60 ? c.danger : v < 80 ? c.harvest : c.primary);

export default function Animals() {
  const { data, save, remove } = useStore();
  const confirm = useConfirm();
  const wide = useWide();
  const { width } = useWindowDimensions();
  const st = data.settings;
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const form: FieldDef[] = [
    { key: 'photo', label: 'Imagem', type: 'photo' },
    { key: 'name', label: 'Nome do curral ou pasto', type: 'text', required: true, placeholder: 'Ex.: Curral das vacas' },
    { key: 'species', label: 'Animal', type: 'select', required: true, half: true, options: SPECIES.map((x) => ({ value: x, label: x })) },
    { key: 'product', label: 'O que produz', type: 'text', half: true, placeholder: 'Leite, lã, ovos…', hint: 'Em branco, usa o padrão do animal.' },
    { key: 'count', label: 'Quantidade', type: 'number', required: true, half: true },
    { key: 'capacity', label: 'Capacidade do espaço', type: 'number', half: true },
    { key: 'health', label: 'Saúde (%)', type: 'number', half: true },
    { key: 'productivity', label: 'Produtividade (%)', type: 'number', half: true },
    { key: 'value', label: `Valor do rebanho (${st.currency})`, type: 'number', half: true },
    { key: 'notes', label: 'Observações', type: 'multiline', placeholder: 'Ração, água, palha, raça…' },
  ];
  const blank = { name: '', species: '', product: '', count: '', capacity: '', health: 100, productivity: 100, value: '', notes: '' };

  const heads = data.animals.reduce((a, x) => a + x.count, 0);
  const value = data.animals.reduce((a, x) => a + x.value, 0);
  const avgHealth = heads ? data.animals.reduce((a, x) => a + x.health * x.count, 0) / heads : 0;
  const open = data.animals.find((a) => a.id === openId) ?? null;
  const cols = wide ? Math.max(2, Math.floor((Math.min(width - 232, 1180) - 56) / 300)) : 1;
  const del = (a: Animal) => confirm({ title: `Excluir ${a.name}?`, message: 'O cadastro e a imagem são apagados.', confirmLabel: 'Excluir cadastro', onConfirm: () => { deleteImage(a.photo); remove('animals', a.id); setOpenId(null); } });

  return (
    <Screen title="Animais" subtitle="Currais, pastos e galinheiros da fazenda" action={<AddBtn label="Cadastrar animais" onPress={() => setEditing(blank)} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Stat label="Cabeças" value={<CountUp value={heads} format={(n) => num(n)} />} note={`em ${data.animals.length} ${data.animals.length === 1 ? 'espaço' : 'espaços'}`} />
        <Stat label="Saúde média" value={<CountUp value={avgHealth} format={(n) => `${num(n)}%`} style={{ color: heads ? healthColor(avgHealth) : c.ink }} />} />
        <Stat label="Valor do rebanho" value={<CountUp value={value} format={(n) => money(n, st)} />} />
      </View>

      {data.animals.length === 0 ? (
        <Card><Empty title="Nenhum animal cadastrado" hint="Cadastre cada curral, pasto ou galinheiro com quantidade, capacidade, saúde e uma imagem." action={<AddBtn label="Cadastrar animais" onPress={() => setEditing(blank)} />} /></Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
          {data.animals.map((a) => (
            <View key={a.id} style={{ width: `${100 / cols}%`, padding: 6 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${a.name}`} onPress={() => setOpenId(a.id)} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
                <Card pad={0} style={{ overflow: 'hidden', flexDirection: 'row' }}>
                  <Photo uri={a.photo} style={{ width: 108, alignSelf: 'stretch', minHeight: 118 }} fallback={<PawPrint size={28} color={c.primaryDark} />} />
                  <View style={{ flex: 1, padding: 12, gap: 5 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <T style={{ fontWeight: '700', fontSize: 15, flex: 1 }} numberOfLines={1}>{a.name}</T>
                      <Badge label={a.species} tone="green" />
                    </View>
                    <T v="small">{num(a.count)}{a.capacity ? ` de ${num(a.capacity)} vagas` : ' animais'}, {(a.product || PRODUCT[a.species] || 'sem produto').toLowerCase()}</T>
                    {a.capacity ? <Meter pct={a.count / a.capacity} color={a.count >= a.capacity ? c.harvest : c.sell} /> : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <T v="small" style={{ width: 88 }}>Saúde {num(a.health)}%</T>
                      <View style={{ flex: 1 }}><Meter pct={a.health / 100} color={healthColor(a.health)} /></View>
                    </View>
                  </View>
                </Card>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <DetailSheet
        visible={!!open}
        title={open?.name ?? ''}
        subtitle={open?.species}
        photo={open?.photo}
        fallback={<PawPrint size={48} color={c.primaryDark} />}
        rows={[
          ['Quantidade', open ? num(open.count) : ''],
          ['Capacidade', open?.capacity ? num(open.capacity) : ''],
          ['Produz', open ? open.product || PRODUCT[open.species] : ''],
          ['Saúde', open ? `${num(open.health)}%` : ''],
          ['Produtividade', open ? `${num(open.productivity)}%` : ''],
          ['Valor do rebanho', open?.value ? money(open.value, st) : ''],
          ['Observações', open?.notes],
        ]}
        onEdit={() => { if (open) { setOpenId(null); setEditing(open); } }}
        onDelete={() => open && del(open)}
        onClose={() => setOpenId(null)}
      />
      <FormSheet
        visible={!!editing}
        title={editing?.id ? 'Editar animais' : 'Cadastrar animais'}
        fields={form}
        initial={editing ?? blank}
        submitLabel="Salvar cadastro"
        onClose={() => setEditing(null)}
        onSubmit={(v) => {
          const before = data.animals.find((a) => a.id === v.id);
          if (before?.photo && before.photo !== v.photo) deleteImage(before.photo);
          save('animals', { ...v, health: Math.max(0, Math.min(100, v.health)), productivity: Math.max(0, Math.min(100, v.productivity)) });
          setEditing(null);
        }}
      />
    </Screen>
  );
}
