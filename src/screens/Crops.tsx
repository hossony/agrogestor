import React, { useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../store';
import { AddBtn, DataList, Dot, FieldDef, FormSheet, Screen, SeasonStrip, T, useConfirm } from '../ui';
import { MONTHS, num, uid } from '../utils';
import { cropCells } from './common';

const COLORS = ['#D9A441', '#8FA83A', '#E57B2E', '#2F7D4A', '#9B2D4E', '#6B4A9B', '#2B78B8', '#B5653A', '#7FB7A3', '#557A6B'];

export default function Crops() {
  const { data, now, save, remove } = useStore();
  const confirm = useConfirm();
  const st = data.settings;
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const per = st.pricePer > 1 ? `por ${num(st.pricePer)} ${st.qtyUnit}` : `por ${st.qtyUnit}`;

  const form: FieldDef[] = [
    { key: 'name', label: 'Cultura', type: 'text', required: true },
    { key: 'plantMonths', label: 'Meses de plantio', type: 'months', required: true },
    { key: 'harvestMonths', label: 'Meses de colheita', type: 'months' },
    { key: 'yieldPerHa', label: `Produtividade (${st.qtyUnit}/ha)`, type: 'number', half: true },
    { key: 'seedPerHa', label: `Semente (${st.qtyUnit}/ha)`, type: 'number', half: true },
    { key: 'avgPrice', label: `Preço médio ${per}`, type: 'number', half: true },
    { key: 'bestPrice', label: `Preço no pico ${per}`, type: 'number', half: true },
    { key: 'bestMonth', label: 'Melhor mês para vender', type: 'month' },
  ];
  const blank = { name: '', plantMonths: [], harvestMonths: [], yieldPerHa: '', seedPerHa: '', avgPrice: '', bestPrice: '', bestMonth: 1 };
  const rows = data.crops.slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Screen title="Culturas" subtitle="Catálogo que alimenta o calendário, as previsões de colheita e os preços" action={<AddBtn label="Nova cultura" onPress={() => setEditing(blank)} />}>
      <DataList
        rows={rows}
        onEdit={(x) => setEditing(x)}
        onDelete={(x) => confirm({ title: `Excluir ${x.name}?`, message: 'Safras e vendas desta cultura também serão excluídas.', confirmLabel: 'Excluir cultura', onConfirm: () => remove('crops', x.id) })}
        columns={[
          { label: 'Cultura', flex: 1.7, render: (x) => (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Dot color={x.color} /><T style={{ fontWeight: '600', flexShrink: 1 }}>{x.name}</T></View>) },
          { label: 'Plantio e colheita', flex: 2.2, render: (x) => <View style={{ alignSelf: 'stretch', paddingRight: 12 }}><SeasonStrip cells={cropCells(x)} nowMonth={now.month} height={12} /></View> },
          { label: `Produtividade/ha`, align: 'right', render: (x) => (x.yieldPerHa ? num(x.yieldPerHa) : '—') },
          { label: 'Preço médio', align: 'right', render: (x) => (x.avgPrice ? `${st.currency} ${num(x.avgPrice)}` : '—') },
          { label: 'Pico', align: 'right', render: (x) => (x.avgPrice ? `${st.currency} ${num(x.bestPrice)} em ${MONTHS[x.bestMonth - 1].toLowerCase()}` : '—') },
        ]}
      />
      <FormSheet
        visible={!!editing}
        title={editing?.id ? 'Editar cultura' : 'Nova cultura'}
        fields={form}
        initial={editing ?? blank}
        submitLabel="Salvar cultura"
        onClose={() => setEditing(null)}
        onSubmit={(v) => {
          const bestPrice = Math.max(v.bestPrice || 0, v.avgPrice || 0);
          save('crops', { ...v, bestPrice, id: v.id ?? uid(), color: v.color ?? COLORS[data.crops.length % COLORS.length] });
          setEditing(null);
        }}
      />
    </Screen>
  );
}
