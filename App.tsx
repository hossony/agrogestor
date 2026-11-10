import { StatusBar } from 'expo-status-bar';
import { Bell, BookImage, CalendarRange, Camera, HandCoins, LayoutDashboard, ListChecks, Map as MapIcon, Menu, PawPrint, Plus, Settings as SettingsIcon, Sprout, Tractor, Wallet, Warehouse, Wheat } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { farmAlerts } from './src/alerts';
import { systemNotify } from './src/notify';
import Animals from './src/screens/Animals';
import Calendar from './src/screens/Calendar';
import { Nav, Route } from './src/screens/common';
import Crops from './src/screens/Crops';
import Dashboard from './src/screens/Dashboard';
import Fields from './src/screens/Fields';
import Finance from './src/screens/Finance';
import Fleet from './src/screens/Fleet';
import Login from './src/screens/Login';
import Notifications from './src/screens/Notifications';
import Plantings from './src/screens/Plantings';
import Records from './src/screens/Records';
import Sales from './src/screens/Sales';
import Settings from './src/screens/Settings';
import Stock from './src/screens/Stock';
import Tasks from './src/screens/Tasks';
import { StoreProvider, useStore } from './src/store';
import { c, font } from './src/theme';
import { ConfirmProvider, useWide } from './src/ui';
import { MONTHS_FULL, yearLabel } from './src/utils';

type IconType = React.ComponentType<{ size?: number; color?: string }>;
const ROUTES: { key: Route; label: string; icon: IconType; group: string }[] = [
  { key: 'painel', label: 'Painel', icon: LayoutDashboard, group: 'Fazenda' },
  { key: 'avisos', label: 'Avisos', icon: Bell, group: 'Fazenda' },
  { key: 'talhoes', label: 'Talhões', icon: MapIcon, group: 'Fazenda' },
  { key: 'safras', label: 'Safras', icon: Sprout, group: 'Fazenda' },
  { key: 'calendario', label: 'Calendário', icon: CalendarRange, group: 'Fazenda' },
  { key: 'tarefas', label: 'Tarefas', icon: ListChecks, group: 'Fazenda' },
  { key: 'diario', label: 'Diário', icon: BookImage, group: 'Fazenda' },
  { key: 'estoque', label: 'Estoque', icon: Warehouse, group: 'Comercial' },
  { key: 'vendas', label: 'Vendas', icon: HandCoins, group: 'Comercial' },
  { key: 'financeiro', label: 'Financeiro', icon: Wallet, group: 'Comercial' },
  { key: 'frota', label: 'Frota', icon: Tractor, group: 'Patrimônio' },
  { key: 'animais', label: 'Animais', icon: PawPrint, group: 'Patrimônio' },
  { key: 'culturas', label: 'Culturas', icon: Wheat, group: 'Patrimônio' },
  { key: 'ajustes', label: 'Ajustes', icon: SettingsIcon, group: 'Patrimônio' },
];
const TABS: Route[] = ['painel', 'safras', 'diario'];
const QUICK: { label: string; route: Route; icon: IconType }[] = [
  { label: 'Registro com imagem', route: 'diario', icon: Camera },
  { label: 'Plantio', route: 'safras', icon: Sprout },
  { label: 'Venda', route: 'vendas', icon: HandCoins },
  { label: 'Tarefa', route: 'tarefas', icon: ListChecks },
  { label: 'Lançamento financeiro', route: 'financeiro', icon: Wallet },
];

const SCREENS: Record<Route, React.ComponentType<Nav>> = {
  painel: Dashboard,
  avisos: Notifications,
  talhoes: Fields,
  safras: Plantings,
  calendario: Calendar,
  estoque: Stock,
  vendas: Sales,
  financeiro: Finance,
  tarefas: Tasks,
  diario: Records,
  frota: Fleet,
  animais: Animals,
  culturas: Crops,
  ajustes: Settings,
};

function Brand() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: c.harvest, alignItems: 'center', justifyContent: 'center' }}>
        <Wheat size={20} color={c.sidebar} />
      </View>
      <Text style={{ fontFamily: font, color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 }}>AgroGestor</Text>
    </View>
  );
}

function CountBadge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <View style={{ minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 5, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: font, color: '#fff', fontSize: 11, fontWeight: '700' }}>{n > 9 ? '9+' : n}</Text>
    </View>
  );
}

function Sidebar({ route, go, unread }: { route: Route; go: (r: Route) => void; unread: number }) {
  const { data, now } = useStore();
  const groups = [...new Set(ROUTES.map((r) => r.group))];
  return (
    <View style={{ width: 232, backgroundColor: c.sidebar, paddingVertical: 20, paddingHorizontal: 12 }}>
      <View style={{ paddingHorizontal: 8, marginBottom: 18 }}><Brand /></View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {groups.map((g) => (
          <View key={g} style={{ marginBottom: 12 }}>
            <Text style={{ fontFamily: font, color: '#7F9887', fontSize: 12, fontWeight: '600', paddingHorizontal: 10, marginBottom: 4 }}>{g}</Text>
            {ROUTES.filter((r) => r.group === g).map((r) => {
              const on = r.key === route;
              const Icon = r.icon;
              return (
                <Pressable key={r.key} accessibilityRole="button" onPress={() => go(r.key)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 }, (on || pressed) && { backgroundColor: c.sidebarActive }]}>
                  <Icon size={18} color={on ? c.harvest : c.sidebarInk} />
                  <Text style={{ fontFamily: font, fontSize: 14.5, fontWeight: on ? '700' : '500', color: on ? '#fff' : c.sidebarInk, flex: 1 }}>{r.label}</Text>
                  {r.key === 'avisos' ? <CountBadge n={unread} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.sidebarActive }}>
        <Text style={{ fontFamily: font, color: '#fff', fontWeight: '600', fontSize: 13.5 }} numberOfLines={1}>{data.settings.farmName}</Text>
        <Text style={{ fontFamily: font, color: '#7F9887', fontSize: 12.5, marginTop: 2 }}>{MONTHS_FULL[now.month - 1]}, {yearLabel(now.year, data.settings)}</Text>
      </View>
    </View>
  );
}

function BottomBar({ route, go, openMenu, openQuick }: { route: Route; go: (r: Route) => void; openMenu: () => void; openQuick: () => void }) {
  const insets = useSafeAreaInsets();
  const item = (key: string, label: string, Icon: IconType, on: boolean, onPress: () => void) => (
    <Pressable key={key} accessibilityRole="button" onPress={onPress} style={{ flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 6, gap: 3 }}>
      <Icon size={21} color={on ? c.primary : c.muted} />
      <Text style={{ fontFamily: font, fontSize: 11.5, fontWeight: on ? '700' : '500', color: on ? c.primary : c.muted }}>{label}</Text>
    </Pressable>
  );
  const tab = (k: Route) => {
    const r = ROUTES.find((x) => x.key === k)!;
    return item(k, r.label, r.icon, route === k, () => go(k));
  };
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, paddingBottom: insets.bottom }}>
      {tab('painel')}
      {tab('safras')}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Novo registro" onPress={openQuick} style={({ pressed }) => [{ width: 54, height: 54, borderRadius: 27, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginTop: -18, borderWidth: 4, borderColor: c.bg, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
          <Plus size={26} color="#fff" />
        </Pressable>
      </View>
      {tab('diario')}
      {item('mais', 'Mais', Menu, !TABS.includes(route), openMenu)}
    </View>
  );
}

/** Faixa que desce do topo quando surgem avisos novos. */
function Toast({ text, onPress, top }: { text: string; onPress: () => void; top: number }) {
  const y = useRef(new Animated.Value(-80)).current;
  useEffect(() => {
    if (!text) return;
    const native = Platform.OS !== 'web';
    Animated.sequence([
      Animated.spring(y, { toValue: 0, useNativeDriver: native, friction: 8 }),
      Animated.delay(3800),
      Animated.timing(y, { toValue: -80, duration: 250, useNativeDriver: native }),
    ]).start();
  }, [text, y]);
  if (!text) return null;
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', top: top + 8, left: 0, right: 0, alignItems: 'center', transform: [{ translateY: y }], zIndex: 20 }}>
      <Pressable accessibilityRole="button" onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.ink, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 14, maxWidth: 420, marginHorizontal: 16 }}>
        <Bell size={17} color={c.harvest} />
        <Text style={{ fontFamily: font, color: '#fff', fontSize: 14, fontWeight: '600', flexShrink: 1 }}>{text.split('|')[0]}</Text>
      </Pressable>
    </Animated.View>
  );
}

function Shell() {
  const wide = useWide();
  const { data, now } = useStore();
  const insets = useSafeAreaInsets();
  const [nav, setNav] = useState<{ route: Route; intent?: string; n: number }>({ route: 'painel', n: 0 });
  const [menu, setMenu] = useState(false);
  const [quick, setQuick] = useState(false);
  const [toast, setToast] = useState('');
  const route = nav.route;

  const alerts = useMemo(() => farmAlerts(data, now), [data, now]);
  const unread = alerts.filter((a) => !data.readAlerts.includes(a.id)).length;

  // Avisos que apareceram depois de abrir o app viram faixa e notificação do sistema.
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = alerts.map((a) => a.id);
    if (known.current === null) {
      known.current = new Set(ids);
      return;
    }
    const fresh = alerts.filter((a) => !known.current!.has(a.id));
    ids.forEach((id) => known.current!.add(id));
    if (!fresh.length) return;
    const title = fresh.length === 1 ? fresh[0].title : `${fresh.length} avisos novos na fazenda`;
    setToast(`${title}|${Date.now()}`);
    if (data.settings.systemNotifications) systemNotify(title, fresh.length === 1 ? fresh[0].detail : fresh.slice(0, 3).map((a) => a.title).join('. '));
  }, [alerts, data.settings.systemNotifications]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route !== 'painel') {
        setNav((v) => ({ route: 'painel', n: v.n + 1 }));
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [route]);

  const go = (r: Route, intent?: string) => {
    setNav((v) => ({ route: r, intent, n: v.n + 1 }));
    setMenu(false);
    setQuick(false);
  };
  const Current = SCREENS[route];
  const screen = <Current key={nav.n} go={go} intent={nav.intent} />;

  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
        <Sidebar route={route} go={go} unread={unread} />
        <View style={{ flex: 1 }}>
          {screen}
          <Toast text={toast} top={8} onPress={() => go('avisos')} />
        </View>
      </View>
    );
  }

  const sheet = { backgroundColor: c.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 14, paddingBottom: insets.bottom + 14, marginTop: -18 };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ backgroundColor: c.sidebar, paddingTop: insets.top + 10, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brand />
        <Pressable accessibilityRole="button" accessibilityLabel={`Avisos, ${unread} novos`} onPress={() => go('avisos')} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.sidebarActive, alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={20} color="#fff" />
          <View style={{ position: 'absolute', top: -4, right: -4 }}><CountBadge n={unread} /></View>
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>{screen}</View>
      <Toast text={toast} top={insets.top + 54} onPress={() => go('avisos')} />
      <BottomBar route={route} go={go} openMenu={() => setMenu(true)} openQuick={() => setQuick(true)} />

      <Modal visible={menu} transparent animationType="slide" onRequestClose={() => setMenu(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(12,28,19,0.55)' }} onPress={() => setMenu(false)} accessibilityLabel="Fechar menu" />
        <View style={sheet}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {ROUTES.filter((r) => !TABS.includes(r.key)).map((r) => {
              const Icon = r.icon;
              const on = r.key === route;
              return (
                <Pressable key={r.key} accessibilityRole="button" onPress={() => go(r.key)} style={{ width: '25%', alignItems: 'center', paddingVertical: 12, gap: 6 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: on ? c.primary : c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={21} color={on ? '#fff' : c.primaryDark} />
                    {r.key === 'avisos' ? <View style={{ position: 'absolute', top: -5, right: -5 }}><CountBadge n={unread} /></View> : null}
                  </View>
                  <Text style={{ fontFamily: font, fontSize: 12.5, fontWeight: '600', color: c.ink }}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>

      <Modal visible={quick} transparent animationType="slide" onRequestClose={() => setQuick(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(12,28,19,0.55)' }} onPress={() => setQuick(false)} accessibilityLabel="Fechar" />
        <View style={sheet}>
          <Text style={{ fontFamily: font, fontSize: 17, fontWeight: '700', color: c.ink, paddingHorizontal: 6, paddingBottom: 6 }}>O que você quer registrar?</Text>
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <Pressable key={q.label} accessibilityRole="button" onPress={() => go(q.route, 'novo')} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 12 }, pressed && { backgroundColor: c.surfaceAlt }]}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={c.primaryDark} />
                </View>
                <Text style={{ fontFamily: font, fontSize: 15.5, fontWeight: '600', color: c.ink }}>{q.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}

function Gate() {
  const { ready, logged } = useStore();
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.sidebar }} />;
  return logged ? <Shell /> : <Login />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ConfirmProvider>
          <StatusBar style="light" />
          <Gate />
        </ConfirmProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
