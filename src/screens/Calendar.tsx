import React, { useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../store';
import { c } from '../theme';
import { Card, Dot, Empty, Legend, Screen, SeasonHeader, SeasonStrip, Segmented, T, useWide } from '../ui';
import { MONTHS, MONTHS_FULL, num, priceAt, priceFactor } from '../utils';
import { cropCells } from './common';

type Filter = 'todas' | 'plantar' | 'colher' | 'vender';

export default function Calendar() {
  const { data, now } = useStore();
  const wide = useWide();
  const st = data.settings;
  const [filter, setFilter] = useState<Filter>('todas');

  const crops = data.crops
    .filter((x) => {
      if (filter === 'plantar') return x.plantMonths.includes(now.month);
      if (filter === 'colher') return x.harvestMonths.includes(now.month);
      if (filter === 'vender') return x.avgPrice > 0 && x.bestMonth === now.month;
      return true;
    })
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const nameW = wide ? 220 : 0;

  return (
    <Screen title="Calendário agrícola" subtitle={`Janelas de plantio, colheita e preço. Mês atual: ${MONTHS_FULL[now.month - 1].toLowerCase()}`}>
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'todas', label: 'Todas' },
          { value: 'plantar', label: 'Plantar agora' },
          { value: 'colher', label: 'Colher agora' },
          { value: 'vender', label: 'Melhor preço agora' },
        ]}
      />
      <Card>
        <Legend
          items={[
            { color: c.primary, label: 'Plantio' },
            { color: c.harvest, label: 'Colheita' },
            { color: c.sell, label: 'Preço (mais forte = mais alto)' },
            { color: c.ink, label: 'Mês atual' },
          ]}
        />
        {wide ? (
          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            <View style={{ width: nameW }} />
            <View style={{ flex: 1 }}><SeasonHeader nowMonth={now.month} /></View>
            <View style={{ width: 170 }} />
          </View>
        ) : null}
        {crops.length === 0 ? <Empty title="Nenhuma cultura neste filtro" hint="Troque o filtro ou avance o mês para ver outras janelas." /> : null}
        {crops.map((crop) => {
          const max = Math.max(...MONTHS.map((_, i) => priceFactor(crop, i + 1)));
          const min = Math.min(...MONTHS.map((_, i) => priceFactor(crop, i + 1)));
          return (
            <View key={crop.id} style={{ flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'stretch', paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line, marginTop: wide ? 0 : 4, gap: wide ? 0 : 6 }}>
              <View style={{ width: wide ? nameW : undefined, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }}>
                <Dot color={crop.color} />
                <T style={{ fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{crop.name}</T>
              </View>
              <View style={{ flex: wide ? 1 : undefined }}>
                {!wide ? <View style={{ marginBottom: 3 }}><SeasonHeader nowMonth={now.month} /></View> : null}
                <SeasonStrip cells={cropCells(crop)} nowMonth={now.month} height={14} />
                {crop.avgPrice > 0 ? (
                  <View style={{ flexDirection: 'row', gap: 2, marginTop: 1 }}>
                    {MONTHS.map((_, i) => {
                      const f = priceFactor(crop, i + 1);
                      const t = max > min ? (f - min) / (max - min) : 0.5;
                      return <View key={i} style={{ flex: 1, height: 6, borderRadius: 2, backgroundColor: c.sell, opacity: 0.1 + t * 0.9 }} />;
                    })}
                  </View>
                ) : null}
              </View>
              <View style={{ width: wide ? 170 : undefined, alignItems: wide ? 'flex-end' : 'flex-start' }}>
                {crop.avgPrice > 0 ? (
                  <T v="small" style={{ textAlign: wide ? 'right' : 'left' }}>
                    Pico em {MONTHS[crop.bestMonth - 1].toLowerCase()}: {st.currency} {num(priceAt(crop, crop.bestMonth))}
                  </T>
                ) : (
                  <T v="small">Cultura de cobertura</T>
                )}
              </View>
            </View>
          );
        })}
      </Card>
      <T v="small">
        As janelas e os preços vêm do catálogo de culturas (padrão do Farming Simulator 25, hemisfério norte). Para outra região ou para a vida real, ajuste cada cultura em Culturas.
      </T>
    </Screen>
  );
}
