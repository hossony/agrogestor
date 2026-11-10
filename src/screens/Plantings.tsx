import { Wheat } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { plantingStatus, STATUS_LABEL } from '../selectors';
import { useStore } from '../store';
import { c } from '../theme';
import { Planting } from '../types';
import { AddBtn, Badge, Btn, Card, DataList, Dot, Empty, FieldDef, FormSheet, Screen, Segmented, T, useConfirm } from '../ui';
import { expectedHarvest, num, periodIndex, periodLabel, qty } from '../utils';
import { cropById, cropOptions, fieldById, fieldOptions, Nav, periodFields } from './common';

export default function Plantings({ intent }: Nav) {
  const { data, now, save, remove } = useStore();
  const confirm = useConfirm();
  const st = data.settings;
  const nowIdx = periodIndex(now.year, now.month);
  const [filter, setFilter] = useState<'campo' | 'colhidas' | 'todas'>('campo');
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [harvesting, setHarvesting] = useState<Planting | null>(null);

  const form: FieldDef[] = [
    { key: 'fieldId', label: 'Talhão', type: 'select', required: true, options: fieldOptions(data) },
    { key: 'cropId', label: 'Cultura', type: 'select', required: true, options: cropOptions(data) },
    ...periodFields('Mês do plantio'),
    { key: 'lost', label: 'Lavoura perdida', type: 'toggle', half: true, showIf: (v) => !!v.id },
    { key: 'notes', label: 'Observações', type: 'multiline' },
  ];
  const harvestForm: FieldDef[] = [
    { key: 'harvestedQty', label: `Quantidade colhida (${st.qtyUnit})`, type: 'number', required: true, hint: 'Já vem preenchida com a produtividade esperada. Ajuste para o que entrou no silo.' },
    ...periodFields('Mês da colheita'),
  ];
  const blank = { fieldId: '', cropId: '', month: now.month, year: now.year, notes: '' };

  useEffect(() => {
    if (intent === 'novo') setEditing(blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = data.plantings
    .filter((p) => (filter === 'todas' ? true : filter === 'campo' ? !p.harvested && !p.lost : p.harvested || p.lost))
    .slice()
    .sort((a, b) => periodIndex(b.year, b.month) - periodIndex(a.year, a.month));

  const expected = (p: Planting) => (fieldById(data, p.fieldId)?.areaHa ?? 0) * (cropById(data, p.cropId)?.yieldPerHa ?? 0);

  return (
    <Screen title="Safras" subtitle="Cada plantio, do campo até o silo" action={<AddBtn label="Registrar plantio" onPress={() => setEditing(blank)} />}>
      <Segmented value={filter} onChange={setFilter} options={[{ value: 'campo', label: 'No campo' }, { value: 'colhidas', label: 'Encerradas' }, { value: 'todas', label: 'Todas' }]} />
      {rows.length === 0 ? (
        <Card>
          <Empty
            title={filter === 'campo' ? 'Nenhuma lavoura no campo' : 'Nada por aqui ainda'}
            hint={data.fields.length ? 'Registre o plantio e o sistema calcula a colheita prevista e a produção esperada.' : 'Cadastre um talhão primeiro, depois registre o plantio.'}
            action={<AddBtn label="Registrar plantio" onPress={() => setEditing(blank)} />}
          />
        </Card>
      ) : (
        <DataList
          rows={rows}
          onEdit={(p) => setEditing(p)}
          onDelete={(p) => confirm({ title: 'Excluir esta safra?', message: 'A quantidade colhida sai do estoque junto com o registro.', confirmLabel: 'Excluir safra', onConfirm: () => remove('plantings', p.id) })}
          actions={(p) => (!p.harvested && !p.lost ? <Btn small kind="ghost" label="Colher" icon={<Wheat size={14} color={c.harvestInk} />} onPress={() => setHarvesting(p)} /> : null)}
          columns={[
            {
              label: 'Cultura',
              flex: 1.6,
              render: (p) => {
                const crop = cropById(data, p.cropId);
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Dot color={crop?.color ?? c.faint} />
                    <T style={{ fontWeight: '600' }}>{crop?.name ?? 'Cultura removida'}</T>
                  </View>
                );
              },
            },
            { label: 'Talhão', flex: 1.6, render: (p) => fieldById(data, p.fieldId)?.name ?? '—' },
            {
              label: 'Plantio',
              render: (p) => {
                const crop = cropById(data, p.cropId);
                const off = crop && !crop.plantMonths.includes(p.month);
                return (
                  <View style={{ gap: 3 }}>
                    <T>{periodLabel(p.year, p.month, st)}</T>
                    {off ? <Badge tone="red" label="Fora da janela" /> : null}
                  </View>
                );
              },
            },
            { label: 'Colheita', render: (p) => periodLabel(p.harvestYear, p.harvestMonth, st) },
            {
              label: 'Produção',
              align: 'right',
              flex: 1.3,
              render: (p) => {
                if (p.harvested) {
                  const area = fieldById(data, p.fieldId)?.areaHa ?? 0;
                  return `${qty(p.harvestedQty, st)}${area ? ` (${num(p.harvestedQty / area)}/ha)` : ''}`;
                }
                return expected(p) ? `~${qty(expected(p), st)}` : '—';
              },
            },
            {
              label: 'Situação',
              flex: 1.3,
              render: (p) => {
                const s = plantingStatus(p, nowIdx);
                return <Badge label={STATUS_LABEL[s]} tone={s === 'pronto' ? 'yellow' : s === 'crescendo' ? 'green' : s === 'perdido' ? 'red' : 'neutral'} />;
              },
            },
          ]}
        />
      )}

      <FormSheet
        visible={!!editing}
        title={editing?.id ? 'Editar safra' : 'Registrar plantio'}
        fields={form}
        initial={editing ?? blank}
        submitLabel={editing?.id ? 'Salvar safra' : 'Registrar plantio'}
        onClose={() => setEditing(null)}
        onSubmit={(v) => {
          const crop = cropById(data, v.cropId);
          const patch: Partial<Planting> = { ...v };
          if (!v.harvested && crop) {
            const h = expectedHarvest(crop, v.year, v.month);
            patch.harvestYear = h.year;
            patch.harvestMonth = h.month;
          }
          if (!v.id) Object.assign(patch, { harvested: false, harvestedQty: 0 });
          save('plantings', patch);
          setEditing(null);
        }}
      />
      <FormSheet
        visible={!!harvesting}
        title={`Colher ${cropById(data, harvesting?.cropId)?.name.toLowerCase() ?? ''}`}
        fields={harvestForm}
        initial={{ harvestedQty: harvesting ? Math.round(expected(harvesting)) : 0, month: now.month, year: now.year }}
        submitLabel="Registrar colheita"
        onClose={() => setHarvesting(null)}
        onSubmit={(v) => {
          if (harvesting) save('plantings', { id: harvesting.id, harvested: true, harvestedQty: v.harvestedQty, harvestMonth: v.month, harvestYear: v.year });
          setHarvesting(null);
        }}
      />
    </Screen>
  );
}

