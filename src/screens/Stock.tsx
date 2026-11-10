import React, { useState } from 'react';
import { View } from 'react-native';
import { cropStock, inputStock } from '../selectors';
import { useStore } from '../store';
import { c } from '../theme';
import { StockMove } from '../types';
import { AddBtn, Card, DataList, Dot, Empty, FieldDef, FormSheet, Screen, Section, T, useConfirm, useWide } from '../ui';
import { money, num, periodIndex, periodLabel, priceAt, qty } from '../utils';
import { cropById, cropOptions, periodFields } from './common';

export default function Stock() {
  const { data, now, save, remove } = useStore();
  const confirm = useConfirm();
  const wide = useWide();
  const st = data.settings;
  const [editing, setEditing] = useState<Record<string, any> | null>(null);

  const crops = cropStock(data);
  const inputs = inputStock(data);
  const maxCrop = Math.max(1, ...crops.map((x) => x.balance));
  const total = crops.reduce((a, x) => a + (Math.max(0, x.balance) * priceAt(x.crop, now.month)) / (st.pricePer || 1), 0);

  const form: FieldDef[] = [
    { key: 'kind', label: 'Tipo', type: 'choice', options: [{ value: 'insumo', label: 'Insumo' }, { value: 'producao', label: 'Ajuste de produção' }] },
    { key: 'item', label: 'Insumo', type: 'text', required: true, placeholder: 'Ex.: Fertilizante sólido', showIf: (v) => v.kind === 'insumo' },
    { key: 'cropId', label: 'Produto', type: 'select', required: true, options: cropOptions(data, true), showIf: (v) => v.kind === 'producao' },
    { key: 'dir', label: 'Movimento', type: 'choice', half: true, options: [{ value: 'in', label: 'Entrada' }, { value: 'out', label: 'Saída' }] },
    { key: 'amount', label: 'Quantidade', type: 'number', required: true, half: true },
    { key: 'unit', label: 'Unidade', type: 'text', half: true, placeholder: 'L, kg, sc…', showIf: (v) => v.kind === 'insumo' },
    { key: 'cost', label: `Valor pago (${st.currency})`, type: 'number', half: true, hint: 'Se preencher, vira uma despesa no financeiro.', showIf: (v) => v.kind === 'insumo' && v.dir === 'in' && !v.id },
    { key: 'note', label: 'Motivo', type: 'text', placeholder: 'Ex.: Compra, aplicação no Talhão 2, perda' },
    ...periodFields(),
  ];
  const blank = { kind: 'insumo', item: '', cropId: '', dir: 'in', amount: '', unit: st.qtyUnit, cost: '', note: '', month: now.month, year: now.year };

  const moves = data.stockMoves.slice().sort((a, b) => periodIndex(b.year, b.month) - periodIndex(a.year, a.month));

  return (
    <Screen title="Estoque" subtitle={`Produção guardada vale cerca de ${money(total, st)} a preço de hoje`} action={<AddBtn label="Lançar movimento" onPress={() => setEditing(blank)} />}>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        <Section title="Produção no silo" style={{ flex: 3, alignSelf: 'stretch' }}>
          {crops.length === 0 ? <T v="small" style={{ paddingVertical: 10 }}>Vazio. O que você colher em Safras entra aqui sozinho.</T> : null}
          {crops.map((x) => (
            <View key={x.crop.id} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                  <Dot color={x.crop.color} />
                  <T style={{ fontWeight: '600' }}>{x.crop.name}</T>
                </View>
                <T style={{ fontWeight: '700', fontVariant: ['tabular-nums'], color: x.balance < 0 ? c.danger : c.ink }}>{qty(x.balance, st)}</T>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, marginTop: 6 }}>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: x.crop.color, width: `${Math.max(0, Math.min(100, (x.balance / maxCrop) * 100))}%` }} />
              </View>
              <T v="small" style={{ marginTop: 4 }}>
                Colhido {num(x.harvested)}, vendido {num(x.sold)}{x.adjust ? `, ajustes ${num(x.adjust)}` : ''}
              </T>
            </View>
          ))}
        </Section>
        <Section title="Insumos" style={{ flex: 2, alignSelf: 'stretch' }}>
          {inputs.length === 0 ? <T v="small" style={{ paddingVertical: 10 }}>Lance compras de sementes, adubo, calcário e diesel para acompanhar o saldo.</T> : null}
          {inputs.map((x) => (
            <View key={x.item} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line, gap: 8 }}>
              <T style={{ flexShrink: 1 }}>{x.item}</T>
              <T style={{ fontWeight: '700', fontVariant: ['tabular-nums'], color: x.balance < 0 ? c.danger : c.ink }}>{num(x.balance)} {x.unit}</T>
            </View>
          ))}
        </Section>
      </View>

      <T v="h2" style={{ marginTop: 4 }}>Movimentos lançados</T>
      {moves.length === 0 ? (
        <Card><Empty title="Nenhum movimento manual" hint="Colheitas e vendas já movimentam o estoque. Use os lançamentos para insumos, perdas e correções." /></Card>
      ) : (
        <DataList
          rows={moves}
          onEdit={(m) => setEditing({ ...m, cropId: m.kind === 'producao' ? m.item : '', item: m.kind === 'insumo' ? m.item : '', dir: m.qty >= 0 ? 'in' : 'out', amount: Math.abs(m.qty) })}
          onDelete={(m) => confirm({ title: 'Excluir este movimento?', message: 'O saldo do item é recalculado sem ele.', confirmLabel: 'Excluir movimento', onConfirm: () => remove('stockMoves', m.id) })}
          columns={[
            { label: 'Item', flex: 1.5, render: (m) => (m.kind === 'producao' ? cropById(data, m.item)?.name ?? '—' : m.item) },
            { label: 'Quando', render: (m) => periodLabel(m.year, m.month, st) },
            { label: 'Motivo', flex: 2, render: (m) => m.note || '—' },
            { label: 'Quantidade', align: 'right', render: (m) => <T style={{ fontWeight: '700', fontVariant: ['tabular-nums'], color: m.qty < 0 ? c.danger : c.primary }}>{m.qty > 0 ? '+' : ''}{num(m.qty)} {m.kind === 'producao' ? st.qtyUnit : m.unit ?? ''}</T> },
          ]}
        />
      )}

      <FormSheet
        visible={!!editing}
        title={editing?.id ? 'Editar movimento' : 'Lançar movimento'}
        fields={form}
        initial={editing ?? blank}
        submitLabel="Salvar movimento"
        onClose={() => setEditing(null)}
        onSubmit={(v) => {
          const move: Partial<StockMove> = {
            id: v.id,
            kind: v.kind,
            item: v.kind === 'producao' ? v.cropId : String(v.item).trim(),
            qty: v.dir === 'out' ? -Math.abs(v.amount) : Math.abs(v.amount),
            unit: v.kind === 'insumo' ? v.unit : undefined,
            note: v.note,
            year: v.year,
            month: v.month,
          };
          save('stockMoves', move);
          if (!v.id && v.kind === 'insumo' && v.dir === 'in' && v.cost > 0)
            save('transactions', { type: 'despesa', category: 'Insumos', description: `${move.item}${v.note ? `: ${v.note}` : ''}`, amount: v.cost, year: v.year, month: v.month });
          setEditing(null);
        }}
      />
    </Screen>
  );
}
