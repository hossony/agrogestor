import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Pressy } from '../motion';
import { c, font } from '../theme';

/** Plataformas em que a pessoa joga (opcional). Mesmos ícones do site. */
export const PLATFORMS = [
  { id: 'ps', label: 'PlayStation', color: '#0070D1' },
  { id: 'xbox', label: 'Xbox', color: '#107C10' },
  { id: 'pc', label: 'PC', color: '#3A4750' },
] as const;

export const platformLabel = (id?: string | null) => PLATFORMS.find((p) => p.id === id)?.label ?? '';

export function PlatformIcon({ id, size = 18, color }: { id?: string | null; size?: number; color?: string }) {
  const p = PLATFORMS.find((x) => x.id === id);
  if (!p) return null;
  const s = color ?? p.color;
  const common = { stroke: s, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel={p.label}>
      {p.id === 'ps' ? (
        <>
          <Path d="M7 3.5l3.2 5.5H3.8z" {...common} />
          <Circle cx="17" cy="7" r="3.2" {...common} />
          <Path d="M4 15l5 5M9 15l-5 5" {...common} />
          <Rect x="14" y="14.5" width="6" height="6" rx="0.8" {...common} />
        </>
      ) : p.id === 'xbox' ? (
        <>
          <Circle cx="12" cy="12" r="9.5" {...common} />
          <Path d="M6.5 6.8c3 1.6 7.6 6.6 10.4 11M17.5 6.8c-3 1.6-7.6 6.6-10.4 11" {...common} />
        </>
      ) : (
        <>
          <Rect x="2.5" y="4" width="19" height="12.5" rx="2" {...common} />
          <Path d="M8 20.5h8M12 16.5v4" {...common} />
        </>
      )}
    </Svg>
  );
}

/** Três botões grandes com o ícone; tocar de novo desmarca (é opcional). */
export function PlatformPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
      {PLATFORMS.map((p) => {
        const on = value === p.id;
        return (
          <Pressy key={p.id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={p.label} onPress={() => onChange(on ? null : p.id)} scaleTo={0.95} style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: on ? p.color : c.line, backgroundColor: on ? p.color : c.surface }}>
            <PlatformIcon id={p.id} size={26} color={on ? '#fff' : p.color} />
            <Text style={{ fontFamily: font, fontWeight: '700', fontSize: 12.5, color: on ? '#fff' : c.ink }}>{p.label}</Text>
          </Pressy>
        );
      })}
    </View>
  );
}

/** Bolinha verde/cinza de online sobre o avatar. */
export function OnlineDot({ on, size = 12 }: { on: boolean; size?: number }) {
  return <View style={{ position: 'absolute', right: -1, bottom: -1, width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: c.surface, backgroundColor: on ? '#23a55a' : c.faint }} />;
}
