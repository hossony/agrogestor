import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, PressableProps, StyleProp, View, ViewStyle } from 'react-native';
import { c } from './theme';

/**
 * Animações reutilizáveis. Funcionam igual no celular (driver nativo) e no
 * desktop/navegador, e ficam paradas quando o sistema pede menos movimento.
 */

const native = Platform.OS !== 'web';
let reduce = false;
AccessibilityInfo.isReduceMotionEnabled?.().then((v) => (reduce = v)).catch(() => {});
export const reducedMotion = () => reduce;

/** Entra com fade e deslize. `index` escalona listas (efeito cascata). */
export function Appear({ children, index = 0, from = 14, style, axis = 'y' }: { children: React.ReactNode; index?: number; from?: number; style?: StyleProp<ViewStyle>; axis?: 'x' | 'y' }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.timing(v, { toValue: 1, duration: 380, delay: Math.min(index, 12) * 55, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [v, index]);
  const shift = v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] });
  return <Animated.View style={[style, { opacity: v, transform: [axis === 'y' ? { translateY: shift } : { translateX: shift }] }]}>{children}</Animated.View>;
}

const APressable = Animated.createAnimatedComponent(Pressable);

/** Botão que afunda levemente ao toque e volta com mola. */
export function Pressy({ children, style, scaleTo = 0.96, ...rest }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number; children: React.ReactNode }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (value: number) => Animated.spring(s, { toValue: value, useNativeDriver: native, speed: 40, bounciness: value === 1 ? 10 : 0 }).start();
  return (
    <APressable
      {...rest}
      onPressIn={(e: any) => {
        to(scaleTo);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e: any) => {
        to(1);
        rest.onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale: s }] }]}
    >
      {children}
    </APressable>
  );
}

/** Pulsa continuamente (chama atenção para algo novo ou importante). */
export function Pulse({ children, style, amount = 0.08, period = 1400 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; amount?: number; period?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(v, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, period]);
  return <Animated.View style={[style, { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + amount] }) }] }]}>{children}</Animated.View>;
}

/** Balanço suave, como planta ao vento. */
export function Sway({ children, style, deg = 6 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; deg?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(v, { toValue: -1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(v, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[style, { transform: [{ rotate: v.interpolate({ inputRange: [-1, 1], outputRange: [`-${deg}deg`, `${deg}deg`] }) }] }]}>{children}</Animated.View>;
}

/** Barra de progresso que cresce até o valor. */
export function ProgressBar({ pct, color = c.primary, height = 8, track = c.surfaceAlt }: { pct: number; color?: string; height?: number; track?: string }) {
  const v = useRef(new Animated.Value(0)).current;
  const target = Math.max(0, Math.min(1, pct));
  useEffect(() => {
    if (reduce) {
      v.setValue(target);
      return;
    }
    Animated.timing(v, { toValue: target, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [v, target]);
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: color, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

/** Seta que gira quando o acordeão abre. */
export function useSpin(open: boolean) {
  const v = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: open ? 1 : 0, duration: reduce ? 0 : 220, useNativeDriver: native }).start();
  }, [v, open]);
  return v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
}

/** Conteúdo que abre e fecha com fade e deslize. */
export function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(open ? 1 : 0)).current;
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) setMounted(true);
    Animated.timing(v, { toValue: open ? 1 : 0, duration: reduce ? 0 : 240, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
  }, [v, open]);
  if (!mounted) return null;
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }}>{children}</Animated.View>;
}

const BURST = ['#E9A800', '#1E6B3E', '#7DBB5A', '#2B78B8', '#F0B429', '#BF3B2B'];

/**
 * Explosão de confete/folhas. Muda `trigger` (ex.: um contador) para disparar.
 * Fica por cima do conteúdo sem bloquear toques.
 */
export function Celebrate({ trigger, size = 140 }: { trigger: number; size?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  const [seed, setSeed] = useState(0);
  useEffect(() => {
    if (!trigger || reduce) return;
    setSeed(trigger);
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  }, [trigger, v]);
  if (!seed) return null;
  const parts = Array.from({ length: 14 }, (_, i) => {
    const ang = (i / 14) * Math.PI * 2 + (seed % 7) * 0.3;
    const dist = size * (0.35 + ((i * 37 + seed) % 10) / 22);
    return { dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist - size * 0.15, color: BURST[i % BURST.length], round: i % 3 === 0 };
  });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
      {parts.map((p, i) => (
        <Animated.View
          key={`${seed}-${i}`}
          style={{
            position: 'absolute',
            width: p.round ? 9 : 7,
            height: p.round ? 9 : 13,
            borderRadius: p.round ? 5 : 2,
            backgroundColor: p.color,
            opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, p.dy, p.dy + 30] }) },
              { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 260}deg`] }) },
              { scale: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1.1, 0.8] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/** Troca de conteúdo com fade cruzado quando `k` muda (ex.: dica do dia). */
export function Swap({ k, children, style }: { k: string | number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(1)).current;
  const [shown, setShown] = useState<{ k: string | number; node: React.ReactNode }>({ k, node: children });
  useEffect(() => {
    if (k === shown.k) {
      setShown({ k, node: children });
      return;
    }
    if (reduce) {
      setShown({ k, node: children });
      return;
    }
    Animated.timing(v, { toValue: 0, duration: 150, useNativeDriver: native }).start(() => {
      setShown({ k, node: children });
      Animated.spring(v, { toValue: 1, useNativeDriver: native, speed: 14, bounciness: 6 }).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, children]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>{shown.node}</Animated.View>;
}

/* ---------- Comemoração global ---------- */

const listeners = new Set<(n: number) => void>();
let burst = 0;
/** Dispara a comemoração no centro da tela (ex.: tarefa concluída). */
export function celebrate() {
  burst += 1;
  listeners.forEach((fn) => fn(burst));
}

/** Coloque uma vez no topo do app; mostra as comemorações disparadas. */
export function CelebrateHost() {
  const [n, setN] = useState(0);
  useEffect(() => {
    listeners.add(setN);
    return () => {
      listeners.delete(setN);
    };
  }, []);
  return <Celebrate trigger={n} size={180} />;
}
