import React, { useState } from 'react';
import { View } from 'react-native';
import { activePlantings } from '../selectors';
import { useStore } from '../store';
import { Field } from '../types';
import { AddBtn, Badge, Btn, T, Card, DataList, Empty, FieldDef, FormSheet, Screen, useConfirm } from '../ui';
import { GraduationCap } from 'lucide-react-native';
import { c } from '../theme';
import { num } from '../utils';
import { cropById, Nav } from './common';
import { MapFieldsSheet } from './MapFields';
import { mapById } from '../data/maps';

const form: FieldDef[] = [
  { key: 'name', label: 'Nome do talhão', type: 'text', required: true, placeholder: 'Ex.: Campo 7 (Represa)' },
  { key: 'mapNo', label: 'Nº do campo no mapa', type: 'number', half: true, hint: 'Como aparece no mapa do jogo.' },
  { key: 'areaHa', label: 'Área (ha)', type: 'number', required: true, half: true },
  { key: 'ownership', label: 'Posse', type: 'choice', half: true, options: [{ value: 'proprio', label: 'Próprio' }, { value: 'arrendado', label: 'Arrendado' }] },
  { key: 'plowed', label: 'Solo arado', type: 'toggle', half: true },
  { key: 'limed', label: 'Calcário em dia', type: 'toggle', half: true },
  { key: 'fertLevel', label: 'Adubações feitas', type: 'choice', half: true, options: [{ value: '0', label: '0' }, { value: '1', label: '1' }, { value: '2', label: '2' }] },
  { key: 'weeds', label: 'Tem ervas daninhas', type: 'toggle', half: true },
  { key: 'stones', label: 'Tem pedras', type: 'toggle', half: true, hint: 'Aparecem depois de arar ou cultivar.' },
  { key: 'rice', label: 'Arrozal (campo alagável)', type: 'toggle', half: true },
  { key: 'flooded', label: 'Arrozal alagado', type: 'toggle', half: true, showIf: (v) => !!v.rice },
  { key: 'notes', label: 'Observações', type: 'multiline' },
];

const blank = { name: '', areaHa: '', ownership: 'proprio', plowed: true, limed: false, fertLevel: '0', weeds: false, stones: false, rice: false, flooded: false, mapNo: '', notes: '' };

export default function Fields({ go }: Nav) {
  const { data, save, remove } = useStore();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [importing, setImporting] = useState(false);
  const gameMap = mapById(data.settings.map);
  const active = activePlantings(data);

  const pending = (f: Field) => {
    const out: string[] = [];
    if (!f.plowed) out.push('Arar');
    if (!f.limed) out.push('Calcário');
    if (f.fertLevel < 2) out.push(`Adubar (${f.fertLevel}/2)`);
    if (f.weeds) out.push('Ervas daninhas');
    if (f.stones) out.push('Pedras');
    if (f.rice && !f.flooded && !active.some((x) => x.fieldId === f.id)) out.push('Alagar');
    return out;
  };

  return (
    <Screen
      title="Talhões"
      subtitle={`${data.fields.length} talhões, ${num(data.fields.reduce((a, f) => a + f.areaHa, 0), 1)} ha no total`}
      action={
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Btn kind="ghost" label="Talhões do mapa" onPress={() => setImporting(true)} />
          <AddBtn label="Novo talhão" onPress={() => setEditing(blank)} />
        </View>
      }
    >
      {gameMap ? <T v="small">Mapa: {gameMap.name} ({gameMap.region}). Troque em Ajustes ou no Guia &gt; Mapas.</T> : null}
      {data.fields.length === 0 ? (
        <Card><Empty title="Nenhum talhão cadastrado" hint="Cadastre cada área da fazenda com o tamanho em hectares, ou use os talhões do mapa do jogo (Riverbend Springs, Zielonka ou Hutan Pantai). As safras e as tarefas são ligadas aos talhões." action={<View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}><Btn kind="ghost" label="Talhões do mapa" onPress={() => setImporting(true)} /><AddBtn label="Novo talhão" onPress={() => setEditing(blank)} /></View>} /></Card>
      ) : (
        <DataList
          rows={data.fields}
          actions={(f) => (pending(f).length ? <Btn small kind="ghost" label="Assistente" icon={<GraduationCap size={14} color={c.ink} />} onPress={() => go('guia', `talhao:${f.id}`)} /> : null)}
          onEdit={(f) => setEditing({ ...f, fertLevel: String(f.fertLevel), mapNo: f.mapNo ?? '' })}
          onDelete={(f) => confirm({ title: `Excluir ${f.name}?`, message: 'As safras registradas neste talhão também serão excluídas.', confirmLabel: 'Excluir talhão', onConfirm: () => remove('fields', f.id) })}
          columns={[
            { label: 'Talhão', flex: 2, render: (f) => (f.rice ? `${f.name} · arrozal` : f.name) },
            { label: 'Nº no mapa', render: (f) => (f.mapNo ? String(f.mapNo) : '—') },
            { label: 'Área', align: 'right', render: (f) => `${num(f.areaHa, 1)} ha` },
            { label: 'Posse', render: (f) => (f.ownership === 'proprio' ? 'Próprio' : 'Arrendado') },
            {
              label: 'No campo',
              flex: 1.4,
              render: (f) => {
                const p = active.find((x) => x.fieldId === f.id);
                return p ? <Badge tone="green" label={cropById(data, p.cropId)?.name ?? 'Plantado'} /> : <Badge label="Livre" />;
              },
            },
            {
              label: 'Pendências do solo',
              flex: 2.4,
              render: (f) => {
                const list = pending(f);
                return list.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>{list.map((x) => <Badge key={x} tone={x === 'Ervas daninhas' || x === 'Pedras' ? 'red' : x === 'Alagar' ? 'blue' : 'yellow'} label={x} />)}</View>
                ) : (
                  <Badge tone="green" label="Solo em ordem" />
                );
              },
            },
          ]}
        />
      )}
      <MapFieldsSheet visible={importing} onClose={() => setImporting(false)} />
      <FormSheet
        visible={!!editing}
        title={editing?.id ? 'Editar talhão' : 'Novo talhão'}
        fields={form}
        initial={editing ?? blank}
        submitLabel="Salvar talhão"
        onClose={() => setEditing(null)}
        onSubmit={(v) => {
          save('fields', { ...v, fertLevel: Number(v.fertLevel), mapNo: v.mapNo ? Math.round(v.mapNo) : undefined } as Field);
          setEditing(null);
        }}
      />
    </Screen>
  );
}
