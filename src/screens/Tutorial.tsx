import {
  Beaker, Bell, BookImage, CalendarRange, ChevronLeft, ChevronRight, Coins, Droplets, Film, FlaskConical, Footprints, GraduationCap, HeartPulse, Leaf,
  Map as MapIcon, Mountain, Rocket, Shovel, Sprout, Sun, Tractor, TrendingDown, TrendingUp, UserCog, Warehouse, Wheat, Wrench, PawPrint, X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, PanResponder, Platform, Pressable, Text, View } from 'react-native';
import { GuideIcon, TUTORIAL, TutorialSlide } from '../data/guide';
import { reducedMotion, Sway } from '../motion';
import { c, font } from '../theme';
import { Btn, IconBtn, T, useWide } from '../ui';
import { Route } from './common';

type IconType = React.ComponentType<{ size?: number; color?: string }>;
export const GUIDE_ICONS: Record<GuideIcon | TutorialSlide['icon'], IconType> = {
  start: Rocket, soil: Shovel, fert: FlaskConical, seed: Sprout, harvest: Wheat, money: Coins, machine: Tractor, animal: PawPrint,
  stone: Mountain, weed: Leaf, lime: Beaker, plow: Shovel, wither: Sun, damage: Footprints, debt: TrendingDown, price: TrendingUp,
  broken: Wrench, sick: HeartPulse, silo: Warehouse, worker: UserCog, water: Droplets, video: Film,
  app: Wheat, field: MapIcon, calendar: CalendarRange, diary: BookImage, bell: Bell, guide: GraduationCap,
};

const native = Platform.OS !== 'web';

/** Ilustração animada do slide: ícone balançando com sementes orbitando. */
function Illustration({ icon, k }: { icon: TutorialSlide['icon']; k: number }) {
  const Icon = GUIDE_ICONS[icon];
  const pop = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion()) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, useNativeDriver: native, speed: 9, bounciness: 12 }).start();
  }, [k, pop]);
  useEffect(() => {
    if (reducedMotion()) return;
    const loop = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [orbit]);
  const seeds = [c.harvest, '#7DBB5A', c.sell, '#E57B2E'];
  return (
    <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 150, height: 150, transform: [{ rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        {seeds.map((col, i) => {
          const a = (i / seeds.length) * Math.PI * 2;
          return <View key={i} style={{ position: 'absolute', left: 75 + Math.cos(a) * 66 - 6, top: 75 + Math.sin(a) * 66 - 6, width: 12, height: 12, borderRadius: 6, backgroundColor: col }} />;
        })}
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: c.primarySoft }}>
          <Sway deg={7}>
            <Icon size={46} color="#fff" />
          </Sway>
        </View>
      </Animated.View>
    </View>
  );
}

/** Pontinhos de progresso; o atual cresce. */
function Dots({ n, at, onPick }: { n: number; at: number; onPick: (i: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: n }, (_, i) => (
        <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Passo ${i + 1}`} onPress={() => onPick(i)} hitSlop={6}>
          <View style={{ width: i === at ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === at ? c.primary : i < at ? c.primarySoft : c.line }} />
        </Pressable>
      ))}
    </View>
  );
}

/** Tutorial do app em slides. Arrasta para o lado no celular; setas no desktop. */
export function TutorialCarousel({ onFinish, go, compact }: { onFinish?: () => void; go?: (r: Route) => void; compact?: boolean }) {
  const [at, setAt] = useState(0);
  const slide = TUTORIAL[at];
  const last = at === TUTORIAL.length - 1;
  const fade = useRef(new Animated.Value(1)).current;
  const dir = useRef(1);

  const move = (to: number) => {
    if (to < 0 || to >= TUTORIAL.length || to === at) return;
    dir.current = to > at ? 1 : -1;
    if (reducedMotion()) return setAt(to);
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: native }).start(() => {
      setAt(to);
      Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
    });
  };
  const atRef = useRef(at);
  atRef.current = at;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) moveRef.current(atRef.current + 1);
        else if (g.dx > 50) moveRef.current(atRef.current - 1);
      },
    }),
  ).current;
  const moveRef = useRef(move);
  moveRef.current = move;

  return (
    <View style={{ gap: 16 }} {...pan.panHandlers}>
      <Animated.View
        style={{
          alignItems: 'center',
          gap: 12,
          minHeight: compact ? 0 : 330,
          opacity: fade,
          transform: [{ translateX: fade.interpolate({ inputRange: [0, 1], outputRange: [24 * dir.current, 0] }) }],
        }}
      >
        <Illustration icon={slide.icon} k={at} />
        <T v="small" style={{ fontWeight: '700', color: c.primary }}>{at === 0 ? 'Tutorial' : `Passo ${at} de ${TUTORIAL.length - 1}`}</T>
        <T v="title" style={{ fontSize: 22, textAlign: 'center' }}>{slide.title}</T>
        <T style={{ textAlign: 'center', color: c.muted, maxWidth: 460 }}>{slide.text}</T>
        {slide.route && go ? <Btn small kind="ghost" label={slide.cta ?? 'Abrir'} onPress={() => go(slide.route as Route)} /> : null}
      </Animated.View>
      <Dots n={TUTORIAL.length} at={at} onPick={move} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Btn kind="ghost" small label="Voltar" icon={<ChevronLeft size={15} color={c.ink} />} onPress={() => move(at - 1)} disabled={at === 0} />
        {last ? (
          onFinish ? <Btn small label="Começar a jogar" onPress={onFinish} /> : <Btn small kind="ghost" label="Recomeçar" onPress={() => move(0)} />
        ) : (
          <Pressable accessibilityRole="button" onPress={() => move(at + 1)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, opacity: pressed ? 0.8 : 1 })}>
            <Text style={{ fontFamily: font, color: '#fff', fontWeight: '600', fontSize: 13 }}>Próximo</Text>
            <ChevronRight size={15} color="#fff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Boas-vindas no primeiro acesso. */
export function TutorialModal({ visible, onClose, go }: { visible: boolean; onClose: () => void; go: (r: Route) => void }) {
  const wide = useWide();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(12,28,19,0.6)', alignItems: 'center', justifyContent: wide ? 'center' : 'flex-end', padding: wide ? 16 : 0 }}>
        <View style={{ backgroundColor: c.surface, borderRadius: 18, width: wide ? 560 : '100%', borderBottomLeftRadius: wide ? 18 : 0, borderBottomRightRadius: wide ? 18 : 0, padding: 20, paddingBottom: wide ? 20 : 30 }}>
          <View style={{ position: 'absolute', right: 10, top: 10, zIndex: 2 }}>
            <IconBtn label="Pular tutorial" onPress={onClose}><X size={20} color={c.muted} /></IconBtn>
          </View>
          <TutorialCarousel
            onFinish={onClose}
            go={(r) => {
              onClose();
              go(r);
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
