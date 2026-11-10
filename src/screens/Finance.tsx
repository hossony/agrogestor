import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { CountUp } from '../anim';
import { AreaChart, ChartLegend, Donut, FlowChart, PALETTE } from '../charts';
import { cropProfit, saleTotal, yearFlow } from '../selectors';
import { useStore } from '../store';
import { c } from '../theme';
import { AddBtn, Badge, Card, DataList, Dot, Empty, FieldDef, FormSheet, IconBtn, Legend, Screen, Section, Stat, T, useConfirm, useWide } from '../ui';
import { money, periodIndex, periodLabel, yearLabel } from '../utils';
import { cropById, cropOptions, fieldOptions, Nav, periodFields } from './common';

const CATEGORIES = ['Sementes', 'Fertilizante', 'Calcário', 'Herbicida', 'Insumos', 'Combustível', 'Manutenção', 'Máquinas', 'Arrendamento', 'Mão de obra', 'Animais', 'Contratos', 'Subsídios', 'Empréstimo', 'Outros'];

export default function Finance({ intent }: Nav) {
  const { data, now, save, remove } = useStore();
  const confirm = useConfirm();
  const wide = useWide();
  const st = data.settings;
  const [year, setYear] = useState(now.year);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);

  const flow = yearFlow(data, year);
  const income = flow.reduce((a, f) => a + f.income, 0);
  const expense = flow.reduce((a, f) => a + f.expense, 0);
  const salesIncome = data.sales.filter((s) => s.year === year).reduce((a, s) => a + saleTotal(s.qty, s.unitPrice, st.pricePer), 0);

  const byCat = new Map<string, number>();
  data.transactions.filter((t) => t.year === year && t.type === 'despesa').forEach((t) => byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount));
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const profit = cropProfit(data, year);

  const form: FieldDef[] = [
    { key: 'type', label: 'Tipo', type: 'choice', options: [{ value: 'despesa', label: 'Despesa' }, { value: 'receita', label: 'Receita' }] },
    { key: 'description', label: 'Descrição', type: 'text', required: true, placeholder: 'Ex.: Diesel para a colheita' },
    { key: 'amount', label: `Valor (${st.currency})`, type: 'number', required: true, half: true },
    { key: 'category', label: 'Categoria', type: 'select', required: true, half: true, options: CATEGORIES.map((x) => ({ value: x, label: x })) },
    { key: 'cropId', label: 'Cultura ligada (opcional)', type: 'select', half: true, options: [{ value: '', label: 'Nenhuma' }, ...cropOptions(data)], hint: 'Entra no resultado por cultura.' },
    { key: 'fieldId', label: 'Talhão ligado (opcional)', type: 'select', half: true, options: [{ value: '', label: 'Nenhum' }, ...fieldOptions(data)] },
    ...periodFields(),
  ];
  const blank = { type: 'despesa', description: '', amount: '', category: '', cropId: '', fieldId: '', month: now.month, year: now.year };
  useEffect(() => {
    if (intent === 'novo') setEditing(blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  let run = 0;
  const balance = flow.map((f) => (run += f.income - f.expense));
  const slices = cats.slice(0, 6).map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }));
  const rest = cats.slice(6).reduce((a, x) => a + x[1], 0);
  if (rest) slices.push({ label: 'Demais categorias', value: rest, color: c.faint });

  const rows = data.transactions.filter((t) => t.year === year).sort((a, b) => periodIndex(b.year, b.month) - periodIndex(a.year, a.month));

  return (
    <Screen title="Financeiro" subtitle="Receitas, despesas e resultado por cultura" action={<AddBtn label="Novo lançamento" onPress={() => setEditing(blank)} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <IconBtn label="Ano anterior" onPress={() => setYear((y) => y - 1)}><ChevronLeft size={18} color={c.ink} /></IconBtn>
        <T v="h2" style={{ minWidth: 70, textAlign: 'center', textTransform: 'capitalize' }}>{yearLabel(year, st)}</T>
        <IconBtn label="Próximo ano" onPress={() => setYear((y) => y + 1)}><ChevronRight size={18} color={c.ink} /></IconBtn>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Stat label="Receitas" value={<CountUp key={`r${year}`} value={income} format={(n) => money(n, st)} />} note={`${money(salesIncome, st)} em vendas de produção`} />
        <Stat label="Despesas" value={<CountUp key={`d${year}`} value={expense} format={(n) => money(n, st)} />} />
        <Stat label="Resultado" value={<CountUp key={`s${year}`} value={income - expense} format={(n) => money(n, st)} style={{ color: income - expense >= 0 ? c.primary : c.danger }} />} note={income > 0 ? `margem de ${Math.round(((income - expense) / income) * 100)}%` : undefined} />
      </View>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        <Section title="Mês a mês" style={{ flex: 1, alignSelf: 'stretch' }}>
          <FlowChart data={flow} nowMonth={year === now.year ? now.month : undefined} />
          <View style={{ marginTop: 12 }}><Legend items={[{ color: c.primary, label: 'Receitas' }, { color: '#C98A7E', label: 'Despesas' }]} /></View>
        </Section>
        <Section title="Saldo acumulado" style={{ flex: 1, alignSelf: 'stretch' }}>
          <AreaChart values={balance} height={150} color={run >= 0 ? c.primary : c.danger} nowIndex={year === now.year ? now.month - 1 : undefined} />
          <T v="small" style={{ marginTop: 10 }}>Soma de receitas menos despesas, mês após mês.</T>
        </Section>
      </View>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        <Section title="Para onde foi o dinheiro" style={{ flex: 1, alignSelf: 'stretch' }}>
          {cats.length === 0 ? (
            <T v="small" style={{ paddingVertical: 10 }}>Sem despesas neste ano.</T>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20, paddingTop: 6 }}>
              <Donut data={slices} center={money(expense, st)} caption="em despesas" />
              <ChartLegend items={slices.map((x) => ({ color: x.color, label: x.label, value: `${Math.round((x.value / (expense || 1)) * 100)}%` }))} />
            </View>
          )}
        </Section>
        <Section title="Resultado por cultura" style={{ flex: 1, alignSelf: 'stretch' }}>
          {profit.length === 0 ? <T v="small" style={{ paddingVertical: 10 }}>Venda produção ou ligue despesas a uma cultura para ver o resultado de cada uma.</T> : null}
          {profit.map((p) => (
            <View key={p.crop.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: c.line, gap: 8 }}>
              <View style={{ flexShrink: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Dot color={p.crop.color} />
                  <T style={{ fontWeight: '600' }}>{p.crop.name}</T>
                </View>
                <T v="small">Vendeu {money(p.revenue, st)}, custou {money(p.cost, st)}</T>
              </View>
              <T style={{ fontWeight: '700', fontVariant: ['tabular-nums'], color: p.profit >= 0 ? c.primary : c.danger }}>{money(p.profit, st)}</T>
            </View>
          ))}
        </Section>
      </View>

      <T v="h2" style={{ marginTop: 4 }}>Lançamentos</T>
      <T v="small" style={{ marginTop: -10 }}>As vendas de produção entram como receita automaticamente e são editadas em Vendas.</T>
      {rows.length === 0 ? (
        <Card><Empty title="Nenhum lançamento neste ano" hint="Lance compras, manutenção, arrendamento e receitas extras, como contratos." action={<AddBtn label="Novo lançamento" onPress={() => setEditing(blank)} />} /></Card>
      ) : (
        <DataList
          rows={rows}
          onEdit={(t) => setEditing({ ...t, cropId: t.cropId ?? '', fieldId: t.fieldId ?? '' })}
          onDelete={(t) => confirm({ title: 'Excluir este lançamento?', message: `${t.description}, ${money(t.amount, st)}.`, confirmLabel: 'Excluir lançamento', onConfirm: () => remove('transactions', t.id) })}
          columns={[
            { label: 'Descrição', flex: 2.2, render: (t) => t.description },
            { label: 'Quando', render: (t) => periodLabel(t.year, t.month, st) },
            { label: 'Categoria', flex: 1.2, render: (t) => <Badge label={t.category} /> },
            { label: 'Cultura', flex: 1.2, render: (t) => cropById(data, t.cropId)?.name ?? '—' },
            { label: 'Valor', align: 'right', render: (t) => <T style={{ fontWeight: '700', fontVariant: ['tabular-nums'], color: t.type === 'receita' ? c.primary : c.danger }}>{t.type === 'receita' ? '+' : '-'}{money(t.amount, st)}</T> },
          ]}
        />
      )}

      <FormSheet
        visible={!!editing}
        title={editing?.id ? 'Editar lançamento' : 'Novo lançamento'}
        fields={form}
        initial={editing ?? blank}
        submitLabel="Salvar lançamento"
        onClose={() => setEditing(null)}
        onSubmit={(v) => {
          save('transactions', { ...v, cropId: v.cropId || undefined, fieldId: v.fieldId || undefined });
          setEditing(null);
        }}
      />
    </Screen>
  );
}
