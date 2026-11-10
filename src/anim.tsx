import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleProp, TextStyle } from 'react-native';
import { T } from './ui';

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.().then((v) => (reduceMotion = v)).catch(() => {});

/** Vai de 0 a 1 com desaceleração sempre que `key` muda. Alimenta contadores e gráficos. */
export function useProgress(key: unknown = 0, duration = 900): number {
  const [p, setP] = useState(reduceMotion ? 1 : 0);
  const frame = useRef<number | null>(null);
  useEffect(() => {
    if (reduceMotion) {
      setP(1);
      return;
    }
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setP(1 - Math.pow(1 - t, 3));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [key, duration]);
  return p;
}

/** Número que sobe do valor anterior até o novo. */
export function CountUp({ value, format, style, v = 'figure' }: { value: number; format: (n: number) => string; style?: StyleProp<TextStyle>; v?: 'figure' | 'title' | 'h2' | 'body' }) {
  const from = useRef(0);
  const p = useProgress(value, 1000);
  const shown = from.current + (value - from.current) * p;
  useEffect(() => {
    if (p === 1) from.current = value;
  }, [p, value]);
  return <T v={v} style={style}>{format(p === 1 ? value : shown)}</T>;
}
