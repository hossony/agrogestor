import { Gamepad2, Heart, MessageCircle, MoreHorizontal, Share2, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Appear, Pressy } from '../motion';
import { c, font, radius } from '../theme';
import { Badge, Btn, Card, T } from '../ui';
import { VideoPlayer } from '../video';
import { Conn, mediaUrl, request } from './api';
import { farmTotals, type FarmSnapshot } from './farm';
import { useCommunity } from './store';
import { categoryOf, Media, Post, timeAgo, UserLite } from './types';

const nativeDriver = Platform.OS !== 'web';
export const num = (v: number, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const money = (v: number, cur = '$') => `${v < 0 ? '-' : ''}${cur} ${num(Math.abs(v))}`;
const compact = (v: number) => (Math.abs(v) >= 1e6 ? `${num(v / 1e6, 1)} mi` : Math.abs(v) >= 1e4 ? `${num(v / 1e3)} mil` : num(v));

/* ---------- Avatar ---------- */

export function Avatar({ user, size = 40 }: { user: { name: string; avatar_url: string | null } | null; size?: number }) {
  const { conn } = useCommunity();
  const uri = conn ? mediaUrl(conn, user?.avatar_url) : null;
  const initials = (user?.name ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.primarySoft }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: font, color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

/* ---------- Chips e abas ---------- */

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressy accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress} scaleTo={0.94} style={{ paddingVertical: 7, paddingHorizontal: 13, borderRadius: 99, borderWidth: 1, borderColor: on ? c.primary : c.line, backgroundColor: on ? c.primary : c.surface }}>
      <Text style={{ fontFamily: font, fontSize: 13, fontWeight: '700', color: on ? '#fff' : c.muted }}>{label}</Text>
    </Pressy>
  );
}

/** Abas com a pílula deslizando suavemente (ease-in-out) entre as opções. */
export function Tabs<V extends string>({ value, options, onChange }: { value: V; options: { value: V; label: string; badge?: number }[]; onChange: (v: V) => void }) {
  const [widths, setWidths] = useState<number[]>([]);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useRef(new Animated.Value(0)).current;
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (widths.length !== options.length) return;
    const left = widths.slice(0, idx).reduce((a, b) => a + b, 0);
    Animated.parallel([
      Animated.timing(x, { toValue: left, duration: 320, easing: Easing.bezier(0.45, 0, 0.55, 1), useNativeDriver: false }),
      Animated.timing(w, { toValue: widths[idx], duration: 320, easing: Easing.bezier(0.45, 0, 0.55, 1), useNativeDriver: false }),
    ]).start();
  }, [idx, widths, options.length, x, w]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 0 }}>
      <View style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: c.line }}>
        <Animated.View style={{ position: 'absolute', top: 4, bottom: 4, left: 4, width: w, transform: [{ translateX: x }], backgroundColor: c.surface, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 }} />
        {options.map((o, i) => (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: i === idx }}
            onPress={() => onChange(o.value)}
            onLayout={(e) => {
              const width = e.nativeEvent.layout.width;
              setWidths((prev) => {
                const next = [...prev];
                next[i] = width;
                return next;
              });
            }}
            style={{ paddingVertical: 8, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Text style={{ fontFamily: font, fontSize: 13.5, fontWeight: '700', color: i === idx ? c.ink : c.muted }}>{o.label}</Text>
            {o.badge ? (
              <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#FF5A1F', paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: font, color: '#fff', fontSize: 10.5, fontWeight: '800' }}>{o.badge > 99 ? '99+' : o.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

/* ---------- Reações ---------- */

function Burst({ emoji, k }: { emoji: string; k: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  }, [k, v]);
  if (!k) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 14, top: 8 }}>
      {Array.from({ length: 6 }, (_, i) => {
        const a = ((-90 + (i - 2.5) * 24) * Math.PI) / 180;
        const d = 26 + (i % 3) * 9;
        return (
          <Animated.Text
            key={i}
            style={{
              position: 'absolute',
              fontSize: 11 + (i % 3) * 3,
              opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0] }),
              transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * d] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * d] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.1] }) }],
            }}
          >
            {emoji}
          </Animated.Text>
        );
      })}
    </View>
  );
}

function ReactBtn({ on, count, kind, onPress }: { on: boolean; count: number; kind: 'fire' | 'like'; onPress: () => void }) {
  const pop = useRef(new Animated.Value(1)).current;
  const [burst, setBurst] = useState(0);
  const color = kind === 'fire' ? '#FF5A1F' : '#E0245E';
  const soft = kind === 'fire' ? '#FFE6DA' : '#FDE1EA';
  const press = () => {
    if (!on) {
      setBurst(Date.now());
      pop.setValue(0.4);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: nativeDriver }).start();
    }
    onPress();
  };
  return (
    <Pressy accessibilityRole="button" accessibilityLabel={kind === 'fire' ? 'Foguinho' : 'Curtir'} accessibilityState={{ selected: on }} onPress={press} scaleTo={0.88} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: on ? soft : 'transparent' }}>
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        {kind === 'fire' ? <Text style={{ fontSize: 17, opacity: on ? 1 : 0.55 }}>🔥</Text> : <Heart size={18} color={on ? color : c.muted} fill={on ? color : 'transparent'} />}
      </Animated.View>
      <Text style={{ fontFamily: font, fontWeight: '700', fontSize: 14, color: on ? color : c.muted, fontVariant: ['tabular-nums'] }}>{count}</Text>
      <Burst emoji={kind === 'fire' ? '🔥' : '❤️'} k={burst} />
    </Pressy>
  );
}

/* ---------- Mídia ---------- */

export function MediaGrid({ media, conn }: { media: Media[]; conn: Conn }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!media.length) return null;
  const single = media.length === 1;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 10 }}>
      {media.map((m) => {
        const uri = mediaUrl(conn, m.url)!;
        const ratio = single && m.w && m.h ? Math.max(0.6, Math.min(1.9, m.w / m.h)) : single ? 4 / 3 : 1;
        const style = { width: single ? '100%' : media.length === 2 || media.length === 4 ? '49.6%' : '32.9%', aspectRatio: ratio } as const;
        if (m.type === 'video') return <VideoPlayer key={m.url} uri={uri} style={[style, { aspectRatio: single ? Math.max(ratio, 1) : 1 }]} />;
        return (
          <Pressable key={m.url} style={style} onPress={() => setOpen(uri)} accessibilityLabel="Abrir imagem">
            <Image source={{ uri }} style={{ width: '100%', height: '100%', backgroundColor: c.surfaceAlt }} resizeMode="cover" />
          </Pressable>
        );
      })}
      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' }} onPress={() => setOpen(null)}>
          {open ? <Image source={{ uri: open }} style={{ width: '100%', height: '85%' }} resizeMode="contain" /> : null}
          <View style={{ position: 'absolute', top: 40, right: 20 }}>
            <X size={26} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ---------- Postagem ---------- */

export function PostCard({ post, onOpenPost, onOpenUser, onDeleted, index = 0 }: { post: Post; onOpenPost?: (p: Post) => void; onOpenUser: (code: string) => void; onDeleted?: () => void; index?: number }) {
  const { conn } = useCommunity();
  const [p, setP] = useState(post);
  const [menu, setMenu] = useState(false);
  useEffect(() => setP(post), [post]);
  if (!conn) return null;
  const cat = categoryOf(p.category);

  const react = async (kind: 'like' | 'fire') => {
    const key = kind === 'like' ? 'liked' : 'fired';
    const col = kind === 'like' ? 'like_count' : 'fire_count';
    const on = !p[key];
    const prev = p;
    setP({ ...p, [key]: on, [col]: Math.max(0, p[col] + (on ? 1 : -1)) });
    try {
      const r = await request<{ on: boolean; like_count: number; fire_count: number }>(conn, `/api/posts/${p.id}/react`, { body: { kind } });
      setP((cur) => ({ ...cur, [key]: r.on, like_count: r.like_count, fire_count: r.fire_count }));
    } catch {
      setP(prev);
    }
  };

  const short = p.body.length < 90 && !p.media.length;
  return (
    <Appear index={index}>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 0 }}>
          <Pressable onPress={() => onOpenUser(p.author.code)}>
            <Avatar user={p.author} size={42} />
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => onOpenUser(p.author.code)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <T v="h2" numberOfLines={1} style={{ fontSize: 15, flexShrink: 1 }}>
                {p.author.name}
              </T>
              {p.fire_count >= 5 ? <Badge label="🔥 Em alta" tone="red" /> : null}
            </View>
            <T v="small" numberOfLines={1}>
              @{p.author.username} · {timeAgo(p.created_at)} · {cat.emoji} {cat.label}
            </T>
          </Pressable>
          {p.mine ? (
            <Pressable accessibilityLabel="Opções" hitSlop={8} onPress={() => setMenu((m) => !m)}>
              <MoreHorizontal size={20} color={c.muted} />
            </Pressable>
          ) : null}
        </View>
        {menu ? (
          <View style={{ alignItems: 'flex-end', paddingHorizontal: 14, paddingTop: 6 }}>
            <Btn
              small
              kind="danger"
              label="Apagar postagem"
              icon={<Trash2 size={14} color="#fff" />}
              onPress={async () => {
                setMenu(false);
                await request(conn, `/api/posts/${p.id}`, { method: 'DELETE' }).catch(() => {});
                onDeleted?.();
              }}
            />
          </View>
        ) : null}
        {p.body ? (
          <Pressable disabled={!onOpenPost} onPress={() => onOpenPost?.(p)} style={{ paddingHorizontal: 14, paddingTop: 10 }}>
            <Text style={{ fontFamily: font, color: c.ink, fontSize: short ? 18 : 15, fontWeight: short ? '600' : '400', lineHeight: short ? 25 : 22 }}>{p.body}</Text>
          </Pressable>
        ) : null}
        <MediaGrid media={p.media} conn={conn} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, padding: 8 }}>
          <ReactBtn kind="fire" on={p.fired} count={p.fire_count} onPress={() => react('fire')} />
          <ReactBtn kind="like" on={p.liked} count={p.like_count} onPress={() => react('like')} />
          <Pressy accessibilityRole="button" accessibilityLabel="Comentários" disabled={!onOpenPost} onPress={() => onOpenPost?.(p)} scaleTo={0.9} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12 }}>
            <MessageCircle size={18} color={c.muted} />
            <Text style={{ fontFamily: font, fontWeight: '700', color: c.muted }}>{p.comment_count}</Text>
          </Pressy>
          <View style={{ flex: 1 }} />
          <Pressable accessibilityLabel="Compartilhar" hitSlop={8} style={{ padding: 8 }} onPress={() => Share.share({ message: `${conn.url}/post/${p.id}` }).catch(() => {})}>
            <Share2 size={17} color={c.muted} />
          </Pressable>
        </View>
      </Card>
    </Appear>
  );
}

/* ---------- Folha (sobe de baixo) ---------- */

export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(12,28,19,0.55)' }} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: insets.bottom + 18, gap: 12, maxHeight: '90%' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.line, marginTop: -6 }} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Input(props: React.ComponentProps<typeof TextInput> & { label?: string }) {
  const { label, style, ...rest } = props;
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6, flexGrow: 1 }}>
      {label ? <T v="label">{label}</T> : null}
      <TextInput
        placeholderTextColor={c.faint}
        {...rest}
        onFocus={(e) => {
          setFocus(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          rest.onBlur?.(e);
        }}
        style={[{ fontFamily: font, borderWidth: 1, borderColor: focus ? c.primary : c.line, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, fontSize: 15, color: c.ink, backgroundColor: c.surface }, style]}
      />
    </View>
  );
}

/* ---------- Convite para jogar ---------- */

const GAMES = ['Farming Simulator 25', 'Farming Simulator 22', 'Farming Simulator 19'];

export function InviteSheet({ friend, onClose }: { friend: UserLite | null; onClose: () => void }) {
  const { conn } = useCommunity();
  const [game, setGame] = useState(GAMES[0]);
  const [server, setServer] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState('');
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!friend) return;
    setState('idle');
    setError('');
    setMessage('');
  }, [friend]);

  const send = async () => {
    if (!friend || !conn) return;
    setState('busy');
    setError('');
    try {
      await request(conn, '/api/invites', { body: { to: friend.id, game, server, password, message } });
      setState('sent');
      spin.setValue(0);
      Animated.spring(spin, { toValue: 1, friction: 5, useNativeDriver: nativeDriver }).start();
      setTimeout(onClose, 1500);
    } catch (e) {
      setError((e as Error).message);
      setState('idle');
    }
  };

  return (
    <Sheet visible={!!friend} onClose={onClose}>
      {state === 'sent' ? (
        <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
          <Animated.Text style={{ fontSize: 56, transform: [{ scale: spin }, { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '0deg'] }) }] }}>🚜</Animated.Text>
          <T v="title" style={{ fontSize: 22 }}>
            Convite enviado!
          </T>
          <T v="small">{friend?.name} vai receber o aviso agora.</T>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar user={friend} size={48} />
            <View style={{ flex: 1 }}>
              <T v="h2" style={{ fontSize: 18 }}>
                Chamar {friend?.name.split(' ')[0]} para jogar
              </T>
              <T v="small">Ele recebe o aviso na tela e no celular.</T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {GAMES.map((g) => (
              <Chip key={g} label={g.replace('Farming Simulator', 'FS')} on={game === g} onPress={() => setGame(g)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 2 }}>
              <Input label="Servidor (opcional)" value={server} onChangeText={setServer} placeholder="Nome da partida" maxLength={80} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Senha" value={password} onChangeText={setPassword} placeholder="opcional" maxLength={40} />
            </View>
          </View>
          <Input label="Recado (opcional)" value={message} onChangeText={setMessage} placeholder="Bora colher o trigo antes da chuva!" maxLength={200} />
          {error ? <T style={{ color: c.danger, fontWeight: '600' }}>{error}</T> : null}
          <Pressy accessibilityRole="button" disabled={state === 'busy'} onPress={send} style={{ backgroundColor: c.harvest, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, opacity: state === 'busy' ? 0.6 : 1 }}>
            <Gamepad2 size={19} color="#2a1f00" />
            <Text style={{ fontFamily: font, fontWeight: '800', fontSize: 15, color: '#2a1f00' }}>{state === 'busy' ? 'Enviando…' : 'Chamar para jogar'}</Text>
          </Pressy>
        </>
      )}
    </Sheet>
  );
}

/* ---------- Fazenda (patrimônio) ---------- */

function Count({ value, format, color }: { value: number; format: (v: number) => string; color: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const v = new Animated.Value(0);
    const id = v.addListener(({ value: x }) => setShown(x));
    Animated.timing(v, { toValue: value, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [value]);
  return <Text style={{ fontFamily: font, fontSize: 21, fontWeight: '800', letterSpacing: -0.4, color }}>{format(shown)}</Text>;
}

const SPECIES: Record<string, string> = { vaca: '🐄', vacas: '🐄', gado: '🐄', ovelha: '🐑', ovelhas: '🐑', porco: '🐖', porcos: '🐖', galinha: '🐔', galinhas: '🐔', cabra: '🐐', cabras: '🐐', cavalo: '🐎', cavalos: '🐎', búfalo: '🐃', búfalos: '🐃', abelha: '🐝', abelhas: '🐝' };
const MACHINE: [RegExp, string][] = [
  [/trator/i, '🚜'],
  [/colheitadeira|colhedora/i, '🌾'],
  [/caminh|carreta|reboque/i, '🚚'],
  [/plantadeira|semeadora/i, '🌱'],
  [/pulveriz|adub|fertil/i, '💧'],
];

export function FarmView({ farm, updatedAt }: { farm: FarmSnapshot; updatedAt?: string | null }) {
  const t = farmTotals(farm);
  const cur = farm.currency;
  const [tab, setTab] = useState<'campos' | 'maquinas' | 'animais' | 'silo'>('campos');
  const stats = [
    { k: 'Patrimônio', v: t.worth, f: (v: number) => money(v, cur), hero: true },
    { k: 'Dinheiro', v: farm.cash, f: (v: number) => money(v, cur) },
    { k: 'Área', v: t.area, f: (v: number) => `${num(v, 1)} ha` },
    { k: 'Máquinas', v: t.machines, f: (v: number) => `${cur} ${compact(v)}` },
    { k: 'Animais', v: t.heads, f: (v: number) => num(v) },
  ];
  const row = (key: string, left: React.ReactNode, title: string, sub: string, right: React.ReactNode) => (
    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: c.line }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>{left}</View>
      <View style={{ flex: 1 }}>
        <T style={{ fontWeight: '700' }} numberOfLines={1}>
          {title}
        </T>
        <T v="small" numberOfLines={1}>
          {sub}
        </T>
      </View>
      {right}
    </View>
  );
  return (
    <View style={{ gap: 12 }}>
      <View>
        <T v="h2" style={{ fontSize: 18 }}>
          🏡 {farm.farmName}
        </T>
        <T v="small">
          {farm.map}
          {farm.period ? ` · ${farm.period}` : ''}
          {updatedAt ? ` · atualizado em ${new Date(updatedAt).toLocaleDateString('pt-BR')}` : ''}
        </T>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {stats.map((s, i) => (
          <Appear key={s.k} index={i} style={{ flexGrow: 1, flexBasis: s.hero ? '100%' : '45%' }}>
            <View style={{ padding: 14, borderRadius: radius.lg, backgroundColor: s.hero ? c.primary : c.surface, borderWidth: s.hero ? 0 : 1, borderColor: c.line }}>
              <Text style={{ fontFamily: font, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.6, color: s.hero ? 'rgba(255,255,255,0.8)' : c.muted }}>{s.k.toUpperCase()}</Text>
              <Count value={s.v} format={s.f} color={s.hero ? '#fff' : c.ink} />
            </View>
          </Appear>
        ))}
      </View>
      {farm.loan > 0 ? <T v="small">Empréstimo de {money(farm.loan, cur)} já descontado do patrimônio.</T> : null}
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'campos', label: `🌾 Campos (${farm.fields.length})` },
          { value: 'maquinas', label: `🚜 Máquinas (${farm.machines.length})` },
          { value: 'animais', label: `🐄 Animais (${farm.animals.length})` },
          { value: 'silo', label: `🏚️ Silo (${farm.stock.length})` },
        ]}
      />
      <Card pad={14} style={{ paddingTop: 2 }}>
        {tab === 'campos' &&
          (farm.fields.length
            ? farm.fields.map((f, i) =>
                row(
                  `f${i}`,
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: f.color || c.faint }} />,
                  `${f.name}${f.mapNo ? ` · lote ${f.mapNo}` : ''}`,
                  f.crop ? `${f.crop}${f.harvest ? ` · colheita em ${f.harvest}` : ''}` : 'Sem lavoura no momento',
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <T style={{ fontWeight: '700' }}>{f.areaHa ? `${num(f.areaHa, 2)} ha` : 'área a conferir'}</T>
                    <Badge label={f.owned ? 'próprio' : 'arrendado'} tone={f.owned ? 'green' : 'blue'} />
                  </View>,
                ),
              )
            : <T v="small" style={{ paddingTop: 12 }}>Nenhum campo cadastrado.</T>)}
        {tab === 'maquinas' &&
          (farm.machines.length
            ? farm.machines.map((m, i) =>
                row(
                  `m${i}`,
                  m.photo ? <Image source={{ uri: m.photo }} style={{ width: 40, height: 40, borderRadius: 12 }} /> : <Text style={{ fontSize: 20 }}>{MACHINE.find(([r]) => r.test(m.category))?.[1] ?? '🛠️'}</Text>,
                  m.name,
                  [m.brand, m.category, m.powerCv ? `${m.powerCv} cv` : null, `${num(m.hours)} h`].filter(Boolean).join(' · '),
                  <T style={{ fontWeight: '700' }}>{money(m.value, cur)}</T>,
                ),
              )
            : <T v="small" style={{ paddingTop: 12 }}>Nenhuma máquina cadastrada.</T>)}
        {tab === 'animais' &&
          (farm.animals.length
            ? farm.animals.map((a, i) =>
                row(
                  `a${i}`,
                  <Text style={{ fontSize: 20 }}>{SPECIES[a.species.toLowerCase().split(' ')[0]] ?? '🐾'}</Text>,
                  a.name,
                  `${a.count} de ${a.capacity || '?'} · ${a.species} · saúde ${a.health}%`,
                  <T style={{ fontWeight: '700' }}>{money(a.value, cur)}</T>,
                ),
              )
            : <T v="small" style={{ paddingTop: 12 }}>Nenhum animal cadastrado.</T>)}
        {tab === 'silo' &&
          (farm.stock.length
            ? farm.stock.map((s, i) => row(`s${i}`, <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: s.color || c.harvest }} />, s.name, 'no silo', <T style={{ fontWeight: '700' }}>{`${num(s.qty)} ${farm.qtyUnit}`}</T>))
            : <T v="small" style={{ paddingTop: 12 }}>Silo vazio.</T>)}
      </Card>
    </View>
  );
}
