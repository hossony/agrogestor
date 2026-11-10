import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useProgress } from './anim';
import { c, font } from './theme';
import { T } from './ui';
import { MONTHS } from './utils';

export const PALETTE = ['#1E6B3E', '#E9A800', '#2B78B8', '#B5653A', '#6B4A9B', '#7FB7A3', '#C98A7E', '#8FA83A', '#557A6B', '#9B2D4E'];

/** Rosca: cada fatia entra girando. */
export function Donut({ data, size = 150, stroke = 22, center, caption }: { data: { label: string; value: number; color: string }[]; size?: number; stroke?: number; center: string; caption: string }) {
  const p = useProgress(data.map((d) => d.value).join(','), 1100);
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  let acc = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.surfaceAlt} strokeWidth={stroke} fill="none" />
        {data.map((d) => {
          const frac = (d.value / total) * p;
          const offset = (acc / total) * p * len;
          acc += d.value;
          return <Circle key={d.label} cx={size / 2} cy={size / 2} r={r} stroke={d.color} strokeWidth={stroke} fill="none" strokeDasharray={`${Math.max(0, frac * len - 1.5)} ${len}`} strokeDashoffset={-offset} />;
        })}
      </Svg>
      <Text style={{ fontFamily: font, fontSize: 17, fontWeight: '700', color: c.ink, fontVariant: ['tabular-nums'] }}>{center}</Text>
      <Text style={{ fontFamily: font, fontSize: 11.5, color: c.muted }}>{caption}</Text>
    </View>
  );
}

/** Anel de progresso com o valor no meio. */
export function Ring({ pct, size = 64, stroke = 7, color = c.primary, track = c.surfaceAlt, children }: { pct: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode }) {
  const p = useProgress(pct, 1000);
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${Math.max(0, Math.min(1, pct)) * p * len} ${len}`} />
      </Svg>
      {children}
    </View>
  );
}

/** Linha com área preenchida que cresce de baixo para cima. */
export function AreaChart({ values, height = 120, color = c.primary, nowIndex, labels = true, baseline = true }: { values: number[]; height?: number; color?: string; nowIndex?: number; labels?: boolean; baseline?: boolean }) {
  const [w, setW] = useState(0);
  const p = useProgress(values.join(','), 1100);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pad = 6;
  const x = (i: number) => (values.length > 1 ? (i / (values.length - 1)) * (w - pad * 2) + pad : w / 2);
  const y = (v: number) => pad + (1 - (v * p - min) / span) * (height - pad * 2);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const zero = y(0);
  const id = `g${color.replace('#', '')}`;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          <Path d={`${line} L${x(values.length - 1).toFixed(1)},${zero.toFixed(1)} L${x(0).toFixed(1)},${zero.toFixed(1)} Z`} fill={`url(#${id})`} />
          {baseline ? <Path d={`M${pad},${zero.toFixed(1)} L${w - pad},${zero.toFixed(1)}`} stroke={color} strokeOpacity={0.25} strokeWidth={1} strokeDasharray="3 4" /> : null}
          <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {nowIndex !== undefined && values[nowIndex] !== undefined ? <Circle cx={x(nowIndex)} cy={y(values[nowIndex])} r={4.5} fill={color} stroke="#fff" strokeWidth={2} /> : null}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
      {labels ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 4 }}>
          {MONTHS.map((m, i) => (
            <Text key={m} style={{ fontFamily: font, fontSize: 10.5, color: nowIndex === i ? c.ink : c.faint, fontWeight: nowIndex === i ? '800' : '500' }}>{m[0]}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Barras em pares (entradas x saídas) que sobem ao abrir a tela. */
export function FlowChart({ data, nowMonth, height = 150 }: { data: { month: number; income: number; expense: number }[]; nowMonth?: number; height?: number }) {
  const p = useProgress(data.map((d) => d.income - d.expense).join(','), 900);
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const bar = (v: number, color: string) => <View style={{ flex: 1, maxWidth: 16, height: Math.max(v ? 2 : 0, (v / max) * (height - 6) * p), backgroundColor: color, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 4, borderBottomWidth: 1, borderBottomColor: c.line }}>
        {data.map((d) => (
          <View key={d.month} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height }}>
            {bar(d.income, c.primary)}
            {bar(d.expense, '#C98A7E')}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
        {data.map((d) => (
          <View key={d.month} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: font, fontSize: 11, color: nowMonth === d.month ? c.ink : c.faint, fontWeight: nowMonth === d.month ? '800' : '500' }}>{MONTHS[d.month - 1][0]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Barra horizontal que enche até a fração dada. */
export function Meter({ pct, color = c.primary, height = 6 }: { pct: number; color?: string; height?: number }) {
  const p = useProgress(pct, 800);
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ height, borderRadius: height / 2, backgroundColor: color, width: `${Math.max(0, Math.min(1, pct)) * p * 100}%` }} />
    </View>
  );
}

export function ChartLegend({ items }: { items: { color: string; label: string; value?: string }[] }) {
  return (
    <View style={{ gap: 7, flex: 1, minWidth: 150 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: it.color }} />
          <T v="small" style={{ flex: 1, color: c.ink }} numberOfLines={1}>{it.label}</T>
          {it.value ? <T v="small" style={{ fontVariant: ['tabular-nums'], fontWeight: '600', color: c.ink }}>{it.value}</T> : null}
        </View>
      ))}
    </View>
  );
}
