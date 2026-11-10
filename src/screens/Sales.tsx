import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { cropStock, saleTotal, sellAdvice } from '../selectors';
import { useStore } from '../store';
import { c } from '../theme';
import { Crop } from '../types';
import { AddBtn, Badge, Btn, Card, DataList, Dot, Empty, FieldDef, FormSheet, Screen, T, useConfirm } from '../ui';
import { MONTHS, MONTHS_FULL, money, num, periodIndex, periodLabel, priceAt, qty } from '../utils';
import { cropById, cropOptions, Nav, periodFields } from './common';

function PriceCurve({ crop, nowMonth }: { crop: Crop; nowMonth: number }) {
  const prices = MONTHS.map((_, i) => priceAt(crop, i + 1));
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 46 }}>
      {prices.map((p, i) => {
        const t = max > min ? (p - min) / (max - min) : 0.5;
        const isNow = i + 1 === nowMonth;
        const isBest = i + 1 === crop.bestMonth;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ width: '100%', height: 8 + t * 26, borderRadius: 3, backgroundColor: isBest ? c.sell : isNow ? c.ink : '#C9D6E2' }} />
            <T v="small" style={{ fontSize: 10, lineHeight: 12, color: isNow || isBest ? c.ink : c.faint, fontWeight: isNow ? '800' : '500' }}>{MONTHS[i][0]}</T>
          </View>
        );
      })}
    </View>
  );
}

export default function Sales({ intent }: Nav) {
  const { data, now, save, remove } = useStore();
  const confirm = useConfirm();
  const st = data.settings;
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const advice = sellAdvice(data, now.month);
  const stock = cropStock(data);
  const perLabel = st.pricePer > 1 ? `por ${num(st.pricePer)} ${st.qtyUnit}` : `por ${st.qtyUnit}`;

  const form: FieldDef[] = [
    { key: 'cropId', label: 'Produto', type: 'select', required: true, options: cropOptions(data, true) },
    { key: 'qty', label: `Quantidade (${st.qtyUnit})`, type: 'number', required: true, half: true },
    { key: 'unitPrice', label: `Preço ${perLabel} (${st.currency})`, type: 'number', required: true, half: true },
    { key: 'buyer', label: 'Comprador ou ponto de venda', type: 'text', placeholder: 'Ex.: Cooperativa' },
    ...periodFields('Mês da venda'),
  ];
  const blank = { cropId: '', qty: '', unitPrice: '', buyer: '', month: now.month, year: now.year };

  useEffect(() => {
    if (intent === 'novo') setEditing(blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = data.sales.slice().sort((a, b) => periodIndex(b.year, b.month) - periodIndex(a.year, a.month));
  const yearTotal = data.sales.filter((s) => s.year === now.year).reduce((a, s) => a + saleTotal(s.qty, s.unitPrice, st.pricePer), 0);

  return (
    <Screen title="Vendas" subtitle={`${money(yearTotal, st)} vendidos neste ano do jogo`} action={<AddBtn label="Registrar venda" onPress={() => setEditing(blank)} />}>
      {advice.length ? (
        <View style={{ gap: 10 }}>
          <T v="h2">Quando vender o que está no silo</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {advice.map((a) => (
              <Card key={a.crop.id} style={{ flexGrow: 1, flexBasis: 300, maxWidth: 560 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                    <Dot color={a.crop.color} />
                    <T v="h2">{a.crop.name}</T>
                  </View>
                  <Badge tone={a.sellNow ? 'blue' : 'neutral'} label={a.sellNow ? 'Vender agora' : `Segurar até ${MONTHS_FULL[a.bestMonth - 1].toLowerCase()}`} />
                </View>
                <T v="small" style={{ marginTop: 4 }}>
                  {qty(a.balance, st)} em estoque. Hoje rende cerca de {money(a.valueNow, st)}
                  {a.sellNow ? ', perto do melhor preço do ano.' : `; em ${MONTHS_FULL[a.bestMonth - 1].toLowerCase()}, cerca de ${money(a.valueBest, st)} (+${num(a.gainPct)}%).`}
                </T>
                <View style={{ marginTop: 12 }}><PriceCurve crop={a.crop} nowMonth={now.month} /></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 8, flexWrap: 'wrap' }}>
                  <T v="small">Preço estimado: {st.currency} {num(a.priceNow)} {perLabel}</T>
                  <Btn small kind={a.sellNow ? 'primary' : 'ghost'} label="Registrar venda" onPress={() => setEditing({ ...blank, cropId: a.crop.id, qty: Math.round(a.balance), unitPrice: Math.round(a.priceNow) })} />
                </View>
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      <T v="h2" style={{ marginTop: 4 }}>Vendas registradas</T>
      {rows.length === 0 ? (
        <Card><Empty title="Nenhuma venda registrada" hint="Cada venda baixa o estoque do produto e entra como receita no financeiro." action={<AddBtn label="Registrar venda" onPress={() => setEditing(blank)} />} /></Card>
      ) : (
        <DataList
          rows={rows}
          onEdit={(s) => setEditing(s)}
          onDelete={(s) => confirm({ title: 'Excluir esta venda?', message: 'A quantidade volta para o estoque e a receita sai do financeiro.', confirmLabel: 'Excluir venda', onConfirm: () => remove('sales', s.id) })}
          columns={[
            { label: 'Produto', flex: 1.4, render: (s) => cropById(data, s.cropId)?.name ?? '—' },
            { label: 'Quando', render: (s) => periodLabel(s.year, s.month, st) },
            { label: 'Comprador', flex: 1.3, render: (s) => s.buyer || '—' },
            { label: 'Quantidade', align: 'right', render: (s) => qty(s.qty, st) },
            { label: `Preço ${perLabel}`, align: 'right', render: (s) => `${st.currency} ${num(s.unitPrice)}` },
            { label: 'Total', align: 'right', render: (s) => <T style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{money(saleTotal(s.qty, s.unitPrice, st.pricePer), st)}</T> },
          ]}
        />
      )}

      <FormSheet
        visible={!!editing}
        title={editing?.id ? 'Editar venda' : 'Registrar venda'}
        fields={form}
        initial={editing ?? blank}
        submitLabel={editing?.id ? 'Salvar venda' : 'Registrar venda'}
        onClose={() => setEditing(null)}
        onSubmit={(v) => {
          const available = (stock.find((x) => x.crop.id === v.cropId)?.balance ?? 0) + (editing?.id ? Number(editing.qty) || 0 : 0);
          const commit = () => {
            save('sales', v);
            setEditing(null);
          };
          if (v.qty > available + 0.5)
            confirm({ title: 'Venda maior que o estoque', message: `Há ${qty(Math.max(0, available), st)} deste produto no estoque. Registrar mesmo assim deixa o saldo negativo.`, confirmLabel: 'Registrar mesmo assim', danger: false, onConfirm: commit });
          else commit();
        }}
      />
    </Screen>
  );
}
