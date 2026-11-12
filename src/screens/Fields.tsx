import React, { useState } from 'react';
import { View } from 'react-native';
import { activePlantings } from '../selectors';
import { useStore } from '../store';
import { Field } from '../types';
import { AddBtn, Badge, Btn, Card, DataList, Empty, FieldDef, FormSheet, Screen, useConfirm } from '../ui';
import { GraduationCap } from 'lucide-react-native';
import { c } from '../theme';
import { num } from '../utils';
import { cropById, Nav } from './common';

const form: FieldDef[] = [
  { key: 'name', label: 'Nome do talhão', type: 'text', required: true, placeholder: 'Ex.: Talhão 7 (Represa)' },
  { key: 'areaHa', label: 'Área (ha)', type: 'number', required: true, half: true },
  { key: 'ownership', label: 'Posse', type: 'choice', half: true, options: [{ value: 'proprio', label: 'Próprio' }, { value: 'arrendado', label: 'Arrendado' }] },
  { key: 'plowed', label: 'Solo arado', type: 'toggle', half: true },
  { key: 'limed', label: 'Calcário em dia', type: 'toggle', half: true },
  { key: 'fertLevel', label: 'Adubações feitas', type: 'choice', half: true, options: [{ value: '0', label: '0' }, { value: '1', label: '1' }, { value: '2', label: '2' }] },
  { key: 'weeds', label: 'Tem ervas daninhas', type: 'toggle', half: true },
  { key: 'stones', label: 'Tem pedras', type: 'toggle', half: true, hint: 'Aparecem depois de arar ou cultivar.' },
  { key: 'notes', label: 'Observações', type: 'multiline' },
];

const blank = { name: '', areaHa: '', ownership: 'proprio', plowed: true, limed: false, fertLevel: '0', weeds: false, stones: false, notes: '' };

export default function Fields({ go }: Nav) {
  const { data, save, remove } = useStore();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const active = activePlantings(data);

  const pending = (f: Field) => {
    const out: string[] = [];
    if (!f.plowed) out.push('Arar');
    if (!f.limed) out.push('Calcário');
    if (f.fertLevel < 2) out.push(`Adubar (${f.fertLevel}/2)`);
    if (f.weeds) out.push('Ervas daninhas');
    if (f.stones) out.push('Pedras');
    return out;
  };

  return (
    <Screen
      title="Talhões"
      subtitle={`${data.fields.length} talhões, ${num(data.fields.reduce((a, f) => a + f.areaHa, 0), 1)} ha no total`}
      action={<AddBtn label="Novo talhão" onPress={() => setEditing(blank)} />}
    >
      {data.fields.length === 0 ? (
        <Card><Empty title="Nenhum talhão cadastrado" hint="Cadastre cada área da fazenda com o tamanho em hectares. As safras e as tarefas são ligadas aos talhões." action={<AddBtn label="Novo talhão" onPress={() => setEditing(blank)} />} /></Card>
      ) : (
        <DataList
          rows={data.fields}
          actions={(f) => (pending(f).length ? <Btn small kind="ghost" label="Assistente" icon={<GraduationCap size={14} color={c.ink} />} onPress={() => go('guia', `talhao:${f.id}`)} /> : null)}
          onEdit={(f) => setEditing({ ...f, fertLevel: String(f.fertLevel) })}
          onDelete={(f) => confirm({ title: `Excluir ${f.name}?`, message: 'As safras registradas neste talhão também serão excluídas.', confirmLabel: 'Excluir talhão', onConfirm: () => remove('fields', f.id) })}
          columns={[
            { label: 'Talhão', flex: 2, render: (f) => f.name },
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
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>{list.map((x) => <Badge key={x} tone={x === 'Ervas daninhas' || x === 'Pedras' ? 'red' : 'yellow'} label={x} />)}</View>
                ) : (
                  <Badge tone="green" label="Solo em ordem" />
                );
              },
            },
          ]}
        />
      )}
      <FormSheet
        visible={!!editing}
        title={editing?.id ? 'Editar talhão' : 'Novo talhão'}
        fields={form}
        initial={editing ?? blank}
        submitLabel="Salvar talhão"
        onClose={() => setEditing(null)}
        onSubmit={(v) => {
          save('fields', { ...v, fertLevel: Number(v.fertLevel) } as Field);
          setEditing(null);
        }}
      />
    </Screen>
  );
}
