import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Award, Ban, Bell, ClipboardPaste, Link2, Smile, Trophy, BellRing, Check, CheckCheck, ClipboardList, Copy, Flame, Gamepad2, ImagePlus, Lock, LogOut, Pencil, RefreshCw, Send, Sparkles, UserPlus, UserRound, Users, Video, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Animated, BackHandler, FlatList, Image, Linking, Platform, Pressable, RefreshControl, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mediaUrl, request, shrinkImage, uploadMedia } from '../community/api';
import { OnlineDot, PlatformIcon, platformLabel, PlatformPicker } from '../community/Platform';
import { BADGES, canHaveLinks, LINK_SITES, PRIVACY, type Privacy } from '../community/badges';
import type { FarmSnapshot } from '../community/farm';
import { Target, useCommunity } from '../community/store';
import { CATEGORIES, Changelog, Comment, EMOJIS, Friend, fullDate, Invite, Media, Notif, Post, RankRow, Relation, timeAgo, UserLite } from '../community/types';
import { Avatar, Badges, Chip, FarmView, Input, InviteSheet, money, num, PostCard, RichText, Sheet, Tabs } from '../community/ui';
import { Appear, Pressy } from '../motion';
import { useStore } from '../store';
import { c, font, radius } from '../theme';
import { Badge, Btn, Card, Empty, T, useWide } from '../ui';

/**
 * Comunidade dentro do app: o mesmo feed, amigos, convites e perfis do site
 * (mesmo servidor, mesmo banco). Tudo que é feito aqui aparece lá e vice-versa.
 */

type Tab = 'feed' | 'amigos' | 'jogar' | 'avisos' | 'perfil';
type View_ = { kind: 'tab' } | { kind: 'post'; id: string } | { kind: 'user'; code: string };

const nativeDriver = Platform.OS !== 'web';

function useApi<T>(path: string | null, deps: unknown[] = []) {
  const { conn } = useCommunity();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!conn || !path) return;
    setLoading(true);
    try {
      setData(await request<T>(conn, path));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn, path, ...deps]);
  useEffect(() => {
    load();
  }, [load]);
  return { data, setData, error, loading, reload: load };
}

function Spinner() {
  return (
    <View style={{ padding: 30, alignItems: 'center' }}>
      <ActivityIndicator color={c.primary} />
    </View>
  );
}

function ErrorText({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View style={{ backgroundColor: c.dangerSoft, borderRadius: 10, padding: 10 }}>
      <T style={{ color: c.danger, fontWeight: '600' }}>{text}</T>
    </View>
  );
}

/* ================= Conectar ================= */

function Connect() {
  const { url, setUrl, login, register } = useCommunity();
  const { user } = useStore();
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [platform, setPlatform] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sun = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.timing(sun, { toValue: 1, duration: 3000, useNativeDriver: nativeDriver }), Animated.timing(sun, { toValue: 0, duration: 3000, useNativeDriver: nativeDriver })])).start();
  }, [sun]);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (mode === 'entrar') await login(username, password);
      else await register(name, username, password, platform);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
      <Appear>
        <View style={{ backgroundColor: c.sidebar, borderRadius: 22, padding: 22, overflow: 'hidden' }}>
          <Animated.View style={{ position: 'absolute', right: -60, top: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: c.harvest, opacity: sun.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.45] }), transform: [{ scale: sun.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }} />
          <Text style={{ fontFamily: font, color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>Comunidade AgroGestor</Text>
          <Text style={{ fontFamily: font, color: 'rgba(255,255,255,0.8)', marginTop: 6, lineHeight: 20 }}>A mesma conta do site: feed com fotos e vídeos, foguinhos 🔥, amigos pelo ID, a fazenda deles e convites para jogar.</Text>
        </View>
      </Appear>
      <Appear index={1}>
        <Card style={{ gap: 12 }}>
          <Tabs
            value={mode}
            onChange={setMode}
            options={[
              { value: 'entrar', label: 'Já tenho conta' },
              { value: 'criar', label: 'Criar conta' },
            ]}
          />
          <Input label="Endereço do site" value={url} onChangeText={setUrl} placeholder="ex.: agrogestor.vercel.app" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          {mode === 'criar' ? <Input label="Nome" value={name} onChangeText={setName} placeholder="Como os amigos te chamam" /> : null}
          <Input label="Usuário" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="ex.: joao.trator" />
          <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry placeholder="mínimo 6 caracteres" onSubmitEditing={submit} />
          {mode === 'criar' ? (
            <View style={{ gap: 6 }}>
              <T v="label">Onde você joga? (opcional)</T>
              <PlatformPicker value={platform} onChange={setPlatform} />
            </View>
          ) : null}
          <ErrorText text={error} />
          <Btn label={busy ? 'Conectando…' : mode === 'entrar' ? 'Entrar na comunidade' : 'Criar conta e entrar'} onPress={submit} disabled={busy || !username || !password} />
          <T v="small">Esta conta é a mesma do site e é diferente da conta local do app (a que guarda os seus saves neste aparelho).</T>
        </Card>
      </Appear>
    </ScrollView>
  );
}

/* ================= Feed ================= */

type Item = { key: string; uri: string; type: Media['type']; progress: number; media?: Media };

function Composer({ visible, onClose, onPosted }: { visible: boolean; onClose: () => void; onPosted: (p: Post) => void }) {
  const { conn, me } = useCommunity();
  const [text, setText] = useState('');
  const [category, setCategory] = useState('geral');
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const uploading = items.some((i) => !i.media);

  type Asset = { uri: string; type: Media['type']; width?: number; height?: number; file?: File; mimeType?: string | null; fileName?: string | null };
  /** Reduz (se for foto) e envia; a miniatura mostra o progresso. */
  const addAsset = (a: Asset) => {
    if (!conn) return;
    const key = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { key, uri: a.uri, type: a.type, progress: 3 }]);
    (a.type === 'image' ? shrinkImage(a) : Promise.resolve({ ...a, mimeType: a.mimeType ?? undefined }))
      .then((img) => uploadMedia(conn, { uri: img.uri, type: a.type, mimeType: img.mimeType, fileName: a.fileName, file: img.file, width: img.width, height: img.height }, (pct) => setItems((l) => l.map((i) => (i.key === key ? { ...i, progress: Math.max(i.progress, pct) } : i)))))
      .then((media) => setItems((l) => l.map((i) => (i.key === key ? { ...i, media, progress: 100 } : i))))
      .catch((e: Error) => {
        setItems((l) => l.filter((i) => i.key !== key));
        setError(e.message);
      });
  };

  const pick = async (kind: 'images' | 'videos', camera = false) => {
    if (!conn) return;
    setError('');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: [kind], quality: 0.8, allowsMultipleSelection: kind === 'images' && !camera, selectionLimit: 6 - items.length, videoMaxDuration: 180 };
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Sem permissão para usar a câmera.');
    }
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    res.assets.slice(0, 6 - items.length).forEach((a) => addAsset({ uri: a.uri, type: a.type === 'video' ? 'video' : 'image', width: a.width, height: a.height, file: (a as { file?: File }).file, mimeType: a.mimeType, fileName: a.fileName }));
  };

  /** Cola a imagem copiada (print da tela, foto copiada de outro app). */
  const paste = async () => {
    setError('');
    try {
      if (!(await Clipboard.hasImageAsync())) return setError('Não há imagem copiada. Tire um print ou copie uma foto e tente de novo.');
      const img = await Clipboard.getImageAsync({ format: 'png' });
      if (!img?.data) return setError('Não foi possível ler a imagem copiada.');
      const dataUrl = img.data.startsWith('data:') ? img.data : `data:image/png;base64,${img.data}`;
      if (Platform.OS === 'web') {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `print-${Date.now()}.png`, { type: blob.type || 'image/png' });
        return addAsset({ uri: URL.createObjectURL(file), type: 'image', file, mimeType: file.type, width: img.size?.width, height: img.size?.height });
      }
      const b64 = dataUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      const out = new FileSystem.File(FileSystem.Paths.cache, `print-${Date.now()}.png`);
      out.write(bytes);
      addAsset({ uri: out.uri, type: 'image', mimeType: 'image/png', fileName: out.name, width: img.size?.width, height: img.size?.height });
    } catch {
      setError('Não foi possível colar a imagem.');
    }
  };

  const [emojis, setEmojis] = useState(false);
  const addLink = () => {
    const url = typeof prompt === 'function' ? prompt('Cole o link:') : null;
    if (url) setText((t) => `${t}${t && !/\s$/.test(t) ? ' ' : ''}${/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`} `);
  };

  const submit = async () => {
    if (!conn) return;
    setBusy(true);
    setError('');
    try {
      const post = await request<Post>(conn, '/api/posts', { body: { body: text, category, media: items.filter((i) => i.media).map((i) => i.media) } });
      setText('');
      setItems([]);
      setCategory('geral');
      onPosted(post);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Avatar user={me} size={40} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Como está a fazenda hoje? Cole um print, mostre a colheita, a máquina nova…"
          placeholderTextColor={c.faint}
          multiline
          maxLength={4000}
          autoFocus
          style={{ flex: 1, fontFamily: font, fontSize: 16, color: c.ink, minHeight: 90, textAlignVertical: 'top', paddingTop: 8 }}
        />
      </View>
      {items.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {items.map((i) => (
            <Appear key={i.key} axis="x">
              <View style={{ width: 92, height: 92, borderRadius: 12, overflow: 'hidden', backgroundColor: c.surfaceAlt }}>
                {i.type === 'image' ? <Image source={{ uri: i.uri }} style={{ width: '100%', height: '100%' }} /> : <View style={{ flex: 1, backgroundColor: c.sidebar, alignItems: 'center', justifyContent: 'center' }}><Video size={26} color="#fff" /></View>}
                <Pressable accessibilityLabel="Remover" onPress={() => setItems((l) => l.filter((x) => x.key !== i.key))} style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} color="#fff" />
                </Pressable>
                {!i.media ? (
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <View style={{ height: 4, width: `${i.progress}%`, backgroundColor: c.harvest }} />
                  </View>
                ) : null}
              </View>
            </Appear>
          ))}
        </ScrollView>
      ) : null}
      {emojis ? (
        <Appear>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 6 }}>
            {EMOJIS.map((e) => (
              <Pressy key={e} accessibilityLabel={e} onPress={() => setText((t) => t + e)} scaleTo={0.8} style={{ width: '12.5%', alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </Pressy>
            ))}
          </View>
        </Appear>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {CATEGORIES.map((cat) => (
          <Chip key={cat.id} label={`${cat.emoji} ${cat.label}`} on={category === cat.id} onPress={() => setCategory(cat.id)} />
        ))}
      </ScrollView>
      <ErrorText text={error} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10, flexWrap: 'wrap' }}>
        <Btn small kind="ghost" label="Foto" icon={<ImagePlus size={16} color={c.primary} />} onPress={() => pick('images')} disabled={items.length >= 6} />
        <Btn small kind="ghost" label="Vídeo" icon={<Video size={16} color="#FF5A1F" />} onPress={() => pick('videos')} disabled={items.length >= 6} />
        {Platform.OS !== 'web' ? <Btn small kind="ghost" label="Gravar" icon={<Video size={16} color={c.danger} />} onPress={() => pick('videos', true)} disabled={items.length >= 6} /> : null}
        <Btn small kind="ghost" label="Colar" icon={<ClipboardPaste size={16} color={c.sell} />} onPress={paste} disabled={items.length >= 6} />
        <Pressable accessibilityRole="button" accessibilityLabel="Emojis" onPress={() => setEmojis((v) => !v)} style={{ padding: 8, borderRadius: 10, backgroundColor: emojis ? c.harvestSoft : 'transparent' }}>
          <Smile size={19} color={c.harvestInk} />
        </Pressable>
        {Platform.OS === 'web' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Adicionar link" onPress={addLink} style={{ padding: 8 }}>
            <Link2 size={19} color={c.sell} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        <Btn label={uploading ? 'Enviando…' : busy ? 'Publicando…' : 'Publicar'} icon={<Send size={15} color="#fff" />} onPress={submit} disabled={busy || uploading || (!text.trim() && !items.length)} />
      </View>
    </Sheet>
  );
}

function FeedTab({ go }: { go: (v: View_) => void }) {
  const { conn, me, version } = useCommunity();
  const [sort, setSort] = useState<'hot' | 'new' | 'top'>('hot');
  const [scope, setScope] = useState<'all' | 'friends'>('all');
  const [category, setCategory] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composer, setComposer] = useState(false);
  const req = useRef(0);

  const load = useCallback(
    async (p: number) => {
      if (!conn) return;
      const id = ++req.current;
      setLoading(true);
      try {
        const qs = `sort=${sort}&scope=${scope}&page=${p}${category ? `&category=${category}` : ''}`;
        const r = await request<{ posts: Post[]; more: boolean }>(conn, `/api/posts?${qs}`);
        if (id !== req.current) return;
        setPosts((prev) => (p === 0 ? r.posts : [...prev, ...r.posts.filter((x) => !prev.some((y) => y.id === x.id))]));
        setMore(r.more);
        setPage(p);
        setError('');
      } catch (e) {
        if (id === req.current) setError((e as Error).message);
      }
      if (id === req.current) setLoading(false);
    },
    [conn, sort, scope, category],
  );
  useEffect(() => {
    load(0);
  }, [load]);
  useEffect(() => {
    if (version) load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const header = (
    <View style={{ gap: 12, marginBottom: 12 }}>
      <Pressy accessibilityRole="button" onPress={() => setComposer(true)} scaleTo={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 12 }}>
        <Avatar user={me} size={38} />
        <Text style={{ flex: 1, fontFamily: font, color: c.faint, fontSize: 15 }}>Como está a fazenda hoje?</Text>
        <ImagePlus size={20} color={c.primary} />
        <Video size={20} color="#FF5A1F" />
      </Pressy>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Tabs
          value={sort}
          onChange={setSort}
          options={[
            { value: 'hot', label: '🔥 Em alta' },
            { value: 'new', label: 'Novos' },
            { value: 'top', label: 'Top' },
          ]}
        />
        <Tabs
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'friends', label: 'Amigos' },
          ]}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Chip label="Tudo" on={!category} onPress={() => setCategory('')} />
        {CATEGORIES.map((cat) => (
          <Chip key={cat.id} label={`${cat.emoji} ${cat.label}`} on={category === cat.id} onPress={() => setCategory(cat.id)} />
        ))}
      </ScrollView>
      <ErrorText text={error} />
    </View>
  );

  return (
    <>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, maxWidth: 760, width: '100%', alignSelf: 'center' }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={header}
        renderItem={({ item, index }) => <PostCard post={item} index={index % 12} onOpenPost={(p) => go({ kind: 'post', id: p.id })} onOpenUser={(code) => go({ kind: 'user', code })} onDeleted={() => setPosts((l) => l.filter((x) => x.id !== item.id))} />}
        onEndReached={() => more && !loading && load(page + 1)}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={loading && page === 0 && posts.length > 0} onRefresh={() => load(0)} tintColor={c.primary} colors={[c.primary]} />}
        ListEmptyComponent={loading ? <Spinner /> : <Empty title={scope === 'friends' ? 'Seus amigos ainda não postaram' : 'Nada por aqui ainda'} hint={scope === 'friends' ? 'Adicione amigos pelo ID ou veja o feed de todos.' : 'Seja o primeiro: mostre a sua fazenda!'} />}
        ListFooterComponent={loading && page > 0 ? <Spinner /> : undefined}
      />
      <Composer visible={composer} onClose={() => setComposer(false)} onPosted={(p) => setPosts((l) => [p, ...l])} />
    </>
  );
}

/* ================= Postagem com comentários ================= */

function PostScreen({ id, go }: { id: string; go: (v: View_) => void }) {
  const { conn, me, version } = useCommunity();
  const { data, setData, error } = useApi<{ post: Post; comments: Comment[] }>(`/api/posts/${id}`, [version]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);

  const tree = useMemo(() => {
    const all = data?.comments ?? [];
    return all.filter((x) => !x.parent_id).map((x) => ({ c: x, replies: all.filter((r) => r.parent_id === x.id) }));
  }, [data]);

  if (error) return <Empty title="Não foi possível abrir" hint={error} />;
  if (!data || !conn) return <Spinner />;

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const cm = await request<Comment>(conn, `/api/posts/${id}/comments`, { body: { body: text, parent_id: replyTo?.id ?? null } });
      setData((d) => (d ? { post: { ...d.post, comment_count: d.post.comment_count + 1 }, comments: [...d.comments, cm] } : d));
      setText('');
      setReplyTo(null);
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(false);
  };
  const del = async (cm: Comment) => {
    const r = await request<{ removed: number }>(conn, `/api/comments/${cm.id}`, { method: 'DELETE' }).catch(() => null);
    if (!r) return;
    setData((d) => (d ? { post: { ...d.post, comment_count: Math.max(0, d.post.comment_count - r.removed) }, comments: d.comments.filter((x) => x.id !== cm.id && x.parent_id !== cm.id) } : d));
  };

  const CommentRow = ({ cm, parent }: { cm: Comment; parent: Comment }) => (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Pressable onPress={() => go({ kind: 'user', code: cm.author.code })}>
        <Avatar user={cm.author} size={32} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: c.surfaceAlt, borderRadius: 16, borderTopLeftRadius: 4, paddingVertical: 8, paddingHorizontal: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <T style={{ fontWeight: '700', fontSize: 13 }}>{cm.author.name}</T>
            <Badges ids={cm.author.badges} max={2} />
          </View>
          <RichText text={cm.body} style={{ fontSize: 14.5, lineHeight: 21 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 12, paddingTop: 4 }}>
          <T v="small">
            {timeAgo(cm.created_at)} · {fullDate(cm.created_at)}
          </T>
          <Pressable onPress={() => setReplyTo(parent)}>
            <T v="small" style={{ fontWeight: '700' }}>
              Responder
            </T>
          </Pressable>
          {cm.mine || data.post.mine || me?.badges?.includes('owner') ? (
            <Pressable onPress={() => del(cm)}>
              <T v="small" style={{ fontWeight: '700', color: c.danger }}>
                Apagar
              </T>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <PostCard key={`${data.post.id}-${data.post.comment_count}`} post={data.post} onOpenUser={(code) => go({ kind: 'user', code })} onDeleted={() => go({ kind: 'tab' })} />
        <Card style={{ gap: 14 }}>
          <T v="h2">Comentários ({data.post.comment_count})</T>
          {!tree.length ? <T v="small">Ninguém comentou ainda. Comece a conversa!</T> : null}
          {tree.map(({ c: cm, replies }, i) => (
            <Appear key={cm.id} index={i} style={{ gap: 10 }}>
              <CommentRow cm={cm} parent={cm} />
              {replies.length ? (
                <View style={{ marginLeft: 42, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: c.line, gap: 10 }}>
                  {replies.map((r) => (
                    <CommentRow key={r.id} cm={r} parent={cm} />
                  ))}
                </View>
              ) : null}
            </Appear>
          ))}
        </Card>
      </ScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.surface, padding: 10, paddingBottom: 10, gap: 6 }}>
        {replyTo ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T v="small" style={{ flex: 1 }}>
              Respondendo {replyTo.author.name}
            </T>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <X size={15} color={c.muted} />
            </Pressable>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
          <TextInput value={text} onChangeText={setText} placeholder="Escreva um comentário…" placeholderTextColor={c.faint} multiline maxLength={1500} style={{ flex: 1, fontFamily: font, fontSize: 15, color: c.ink, borderWidth: 1, borderColor: c.line, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, maxHeight: 120 }} />
          <Pressy accessibilityRole="button" accessibilityLabel="Enviar" onPress={send} disabled={busy || !text.trim()} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', opacity: busy || !text.trim() ? 0.5 : 1 }}>
            <Send size={17} color="#fff" />
          </Pressy>
        </View>
      </View>
    </View>
  );
}

/* ================= Amigos ================= */

function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <Pressy
      accessibilityRole="button"
      accessibilityLabel="Copiar ID"
      onPress={async () => {
        await Clipboard.setStringAsync(code).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.surfaceAlt, borderRadius: 99, paddingVertical: 5, paddingHorizontal: 11, alignSelf: 'flex-start' }}
    >
      <Text style={{ fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontWeight: '700', letterSpacing: 1, color: c.ink }}>{code}</Text>
      {done ? <Check size={14} color={c.primary} /> : <Copy size={14} color={c.muted} />}
    </Pressy>
  );
}

/** Ranking entre você e os amigos: patrimônio, máquinas, área e animais. */
function RankingView({ go }: { go: (v: View_) => void }) {
  const { version } = useCommunity();
  const { data, reload } = useApi<RankRow[]>('/api/leaderboard', [version]);
  const [by, setBy] = useState<'worth' | 'machines' | 'area' | 'animals'>('worth');
  const rows = useMemo(() => (data ?? []).slice().sort((a, b) => Number(a.hidden) - Number(b.hidden) || b[by] - a[by]), [data, by]);
  const MEDAL = ['🥇', '🥈', '🥉'];
  const fmt = (r: RankRow) => (by === 'worth' ? money(r.worth, r.currency) : by === 'area' ? `${num(r.area, 1)} ha` : by === 'machines' ? `${num(r.machines)} máq.` : `${num(r.animals)} animais`);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' }} refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}>
      <Tabs
        value={by}
        onChange={setBy}
        options={[
          { value: 'worth', label: '💰 Patrimônio' },
          { value: 'machines', label: '🚜 Máquinas' },
          { value: 'area', label: '🌾 Área' },
          { value: 'animals', label: '🐄 Animais' },
        ]}
      />
      {!data ? <Spinner /> : null}
      {data && rows.length <= 1 ? <Empty title="Ainda não tem ninguém para competir" hint="Adicione amigos pelo ID e publiquem as fazendas." /> : null}
      {data && rows.length ? (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <Appear key={r.id + by} index={i}>
              <Pressable onPress={() => go({ kind: 'user', code: r.code })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, backgroundColor: pressed ? c.surfaceAlt : r.me ? c.primarySoft : c.surface })}>
                <Text style={{ width: 30, textAlign: 'center', fontFamily: font, fontWeight: '900', fontSize: i < 3 && !r.hidden ? 20 : 15, color: c.muted }}>{r.hidden ? '–' : MEDAL[i] ?? `${i + 1}º`}</Text>
                <Avatar user={r} size={42} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <T style={{ fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
                      {r.name}
                      {r.me ? ' (você)' : ''}
                    </T>
                    <Badges ids={r.badges} max={2} />
                    {r.platform ? <PlatformIcon id={r.platform} size={13} /> : null}
                  </View>
                  <T v="small" numberOfLines={1}>
                    {r.hidden ? (r.me ? 'publique a sua fazenda no Perfil' : '🔒 privada ou não publicada') : `🏡 ${r.farmName}`}
                  </T>
                </View>
                {r.hidden ? <Lock size={15} color={c.faint} /> : <Text style={{ fontFamily: font, fontWeight: '800', color: c.ink, fontVariant: ['tabular-nums'] }}>{fmt(r)}</Text>}
              </Pressable>
            </Appear>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

function FriendsTab({ go, invite }: { go: (v: View_) => void; invite: (u: UserLite) => void }) {
  const [view, setView] = useState<'lista' | 'ranking'>('lista');
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <Tabs
          value={view}
          onChange={setView}
          options={[
            { value: 'lista', label: '🤝 Meus amigos' },
            { value: 'ranking', label: '🏆 Ranking' },
          ]}
        />
      </View>
      {view === 'lista' ? <FriendsList go={go} invite={invite} /> : <RankingView go={go} />}
    </View>
  );
}

function FriendsList({ go, invite }: { go: (v: View_) => void; invite: (u: UserLite) => void }) {
  const { conn, me, version, refresh } = useCommunity();
  const { data, reload } = useApi<{ friends: Friend[]; received: Friend[]; sent: Friend[] }>('/api/friends', [version]);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!conn) return null;

  const add = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await request<{ status: string; name: string }>(conn, '/api/friends', { body: { code } });
      setMsg({ ok: true, text: r.status === 'accepted' ? `Agora você e ${r.name} são amigos! 🎉` : `Pedido enviado para ${r.name}.` });
      setCode('');
      reload();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(false);
  };
  const act = async (id: string, action: 'accept' | 'decline' | 'remove') => {
    if (action === 'remove') await request(conn, `/api/friends/${id}`, { method: 'DELETE' }).catch(() => {});
    else await request(conn, `/api/friends/${id}`, { method: 'PATCH', body: { action } }).catch(() => {});
    reload();
    refresh();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}>
      <Appear>
        <Card style={{ gap: 10, backgroundColor: c.primarySoft }}>
          <T v="label">SEU ID</T>
          {me ? <CopyCode code={me.code} /> : null}
          <T v="small">Mande para os amigos te adicionarem.</T>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Input value={code} onChangeText={setCode} placeholder="ID do amigo, ex.: AG-7K3P9Q" autoCapitalize="characters" autoCorrect={false} onSubmitEditing={add} />
            </View>
            <Btn label="Adicionar" icon={<UserPlus size={16} color="#fff" />} onPress={add} disabled={busy} />
          </View>
          {msg ? (
            <Appear>
              <T style={{ color: msg.ok ? c.primaryDark : c.danger, fontWeight: '600' }}>{msg.text}</T>
            </Appear>
          ) : null}
        </Card>
      </Appear>

      {data?.received.length ? (
        <View style={{ gap: 8 }}>
          <T v="label">PEDIDOS RECEBIDOS</T>
          {data.received.map((f, i) => (
            <Appear key={f.id} index={i}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable onPress={() => go({ kind: 'user', code: f.code })}>
                  <Avatar user={f} size={44} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <T style={{ fontWeight: '700' }}>{f.name}</T>
                  <T v="small">pediu há {timeAgo(f.since)}</T>
                </View>
                <Pressy accessibilityLabel="Aceitar" onPress={() => act(f.id, 'accept')} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={18} color="#fff" />
                </Pressy>
                <Pressy accessibilityLabel="Recusar" onPress={() => act(f.id, 'decline')} style={{ width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} color={c.muted} />
                </Pressy>
              </Card>
            </Appear>
          ))}
        </View>
      ) : null}

      <T v="label">MEUS AMIGOS {data ? `(${data.friends.length})` : ''}</T>
      {!data ? <Spinner /> : null}
      {data && !data.friends.length ? (
        <Card>
          <Empty title="Nenhum amigo ainda" hint="Peça o ID de um amigo e adicione aqui em cima." />
        </Card>
      ) : null}
      {data?.friends.map((f, i) => (
        <Appear key={f.id} index={i}>
          <Card style={{ gap: 10 }}>
            <Pressable onPress={() => go({ kind: 'user', code: f.code })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View>
                <Avatar user={f} size={48} />
                <OnlineDot on={Boolean(f.online)} size={14} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <T style={{ fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
                    {f.name}
                  </T>
                  <Badges ids={f.badges} max={2} />
                  {f.platform ? <PlatformIcon id={f.platform} size={14} /> : null}
                </View>
                <T v="small" style={{ color: f.online ? '#23a55a' : c.muted, fontWeight: f.online ? '700' : '400' }}>
                  {f.online ? '● Online' : f.last_seen_at ? `visto há ${timeAgo(f.last_seen_at)}` : 'offline'}
                  {f.summary ? ` · ${money(f.summary.worth, f.summary.currency)}` : ''}
                </T>
                <T v="small">@{f.username}</T>
                {f.farm_name ? <T v="small" style={{ color: c.primary, fontWeight: '700' }}>🏡 {f.farm_name}</T> : null}
              </View>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressy accessibilityRole="button" onPress={() => invite(f)} style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: c.harvest, borderRadius: 10, paddingVertical: 9 }}>
                <Gamepad2 size={16} color="#2a1f00" />
                <Text style={{ fontFamily: font, fontWeight: '700', color: '#2a1f00' }}>Chamar para jogar</Text>
              </Pressy>
              <Btn small kind="ghost" label="Fazenda" onPress={() => go({ kind: 'user', code: f.code })} />
            </View>
          </Card>
        </Appear>
      ))}

      {data?.sent.length ? (
        <View style={{ gap: 8 }}>
          <T v="label">PEDIDOS ENVIADOS</T>
          {data.sent.map((f) => (
            <Card key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar user={f} size={36} />
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: '700' }}>{f.name}</T>
                <T v="small">aguardando · {timeAgo(f.since)}</T>
              </View>
              <Btn small kind="ghost" label="Cancelar" onPress={() => act(f.id, 'remove')} />
            </Card>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

/* ================= Jogar (convites) ================= */

function PushCard() {
  const { push, enablePush } = useCommunity();
  if (push === 'on') return null;
  const text: Record<string, string> = {
    off: 'Ligue para receber os convites no celular mesmo com o app fechado.',
    denied: 'As notificações estão bloqueadas. Libere nas configurações do Android para o AgroGestor.',
    unavailable: Platform.OS === 'web' ? 'Nesta versão os convites aparecem com o app aberto. No site, ligue em Avisos para receber no navegador.' : 'Não foi possível ligar as notificações neste aparelho.',
    'no-project': 'Este build do app ainda não tem push configurado (projectId do EAS). Os convites aparecem com o app aberto.',
  };
  return (
    <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.harvestSoft, alignItems: 'center', justifyContent: 'center' }}>
        <BellRing size={20} color={c.harvestInk} />
      </View>
      <View style={{ flex: 1 }}>
        <T style={{ fontWeight: '700' }}>Notificações no celular</T>
        <T v="small">{text[push]}</T>
      </View>
      {push === 'off' ? <Btn small label="Ligar" onPress={enablePush} /> : null}
    </Card>
  );
}

function InvitesTab({ go, invite }: { go: (v: View_) => void; invite: (u: UserLite) => void }) {
  const { conn, version, invites: pending, refresh } = useCommunity();
  const { data, setData, reload } = useApi<Invite[]>('/api/invites', [version]);
  const friends = useApi<{ friends: Friend[] }>('/api/friends');
  const [tab, setTab] = useState<'in' | 'out'>('in');
  const [busy, setBusy] = useState<string | null>(null);
  if (!conn) return null;

  const act = async (i: Invite, action: 'accept' | 'decline' | 'cancel') => {
    setBusy(i.id);
    try {
      const next = await request<Invite>(conn, `/api/invites/${i.id}`, { method: 'PATCH', body: { action } });
      setData((l) => l?.map((x) => (x.id === i.id ? next : x)) ?? l);
      refresh();
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(null);
  };
  const list = (data ?? []).filter((i) => (tab === 'in' ? i.incoming : !i.incoming));
  const expired = (i: Invite) => i.status === 'pending' && Date.now() - new Date(i.created_at).getTime() > 3 * 3600 * 1000;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' }} refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}>
      <PushCard />
      <Card style={{ gap: 10 }}>
        <T v="h2">Chamar um amigo</T>
        {friends.data && !friends.data.friends.length ? <T v="small">Você ainda não tem amigos. Adicione pelo ID na aba Amigos.</T> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {friends.data?.friends.map((f) => (
            <Pressy key={f.id} accessibilityRole="button" onPress={() => invite(f)} style={{ alignItems: 'center', gap: 4, width: 74 }}>
              <View>
                <Avatar user={f} size={54} />
                <View style={{ position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: c.harvest, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.surface }}>
                  <Gamepad2 size={12} color="#2a1f00" />
                </View>
              </View>
              <T v="small" numberOfLines={1} style={{ color: c.ink, fontWeight: '600' }}>
                {f.name.split(' ')[0]}
              </T>
            </Pressy>
          ))}
        </ScrollView>
      </Card>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'in', label: 'Recebidos', badge: pending },
          { value: 'out', label: 'Enviados' },
        ]}
      />
      {!data ? <Spinner /> : null}
      {data && !list.length ? <Empty title={tab === 'in' ? 'Nenhum convite recebido' : 'Você ainda não chamou ninguém'} hint="Os convites dos últimos 14 dias aparecem aqui." /> : null}
      {list.map((i, idx) => {
        const other = i.incoming ? i.from : i.to;
        const open = i.status === 'pending' && !expired(i);
        const st = expired(i) ? { l: 'Expirou', t: 'neutral' } : { pending: { l: i.incoming ? 'Esperando você' : 'Aguardando', t: 'yellow' }, accepted: { l: 'Aceito', t: 'green' }, declined: { l: 'Recusado', t: 'red' }, canceled: { l: 'Cancelado', t: 'neutral' } }[i.status];
        return (
          <Appear key={i.id + tab} index={idx}>
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable onPress={() => go({ kind: 'user', code: other.code })}>
                  <Avatar user={other} size={44} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <T style={{ fontWeight: '700' }}>{i.incoming ? `${other.name} chamou você` : `Você chamou ${other.name}`}</T>
                  <T v="small">
                    {i.game} · {timeAgo(i.created_at)}
                  </T>
                </View>
                <Badge label={st.l} tone={st.t as 'green'} />
              </View>
              {i.message ? <T style={{ backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 10 }}>“{i.message}”</T> : null}
              {i.server || i.password ? (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {i.server ? <Chip label={`Servidor: ${i.server}`} onPress={() => Clipboard.setStringAsync(i.server)} /> : null}
                  {i.password ? <Chip label={`Senha: ${i.password}`} onPress={() => Clipboard.setStringAsync(i.password)} /> : null}
                </View>
              ) : null}
              {open && i.incoming ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressy accessibilityRole="button" disabled={busy === i.id} onPress={() => act(i, 'accept')} style={{ flex: 1, backgroundColor: c.harvest, borderRadius: 12, paddingVertical: 11, alignItems: 'center' }}>
                    <Text style={{ fontFamily: font, fontWeight: '800', color: '#2a1f00' }}>🚜 Bora jogar!</Text>
                  </Pressy>
                  <Btn kind="ghost" label="Agora não" onPress={() => act(i, 'decline')} disabled={busy === i.id} />
                </View>
              ) : null}
              {open && !i.incoming ? <Btn small kind="ghost" label="Cancelar convite" onPress={() => act(i, 'cancel')} disabled={busy === i.id} /> : null}
            </Card>
          </Appear>
        );
      })}
    </ScrollView>
  );
}

/* ================= Avisos ================= */

const NOTIF_ICON: Record<string, string> = { like: '❤️', fire: '🔥', comment: '💬', reply: '💬', friend_request: '🤝', friend_accept: '🤝', invite: '🎮', invite_accept: '🎮', invite_decline: '🎮', follow: '👣', badge: '🎖️', repost: '🔁' };

function NotifsTab({ go, openTab }: { go: (v: View_) => void; openTab: (t: Tab) => void }) {
  const { conn, version, refresh } = useCommunity();
  const { data, reload } = useApi<{ items: Notif[] }>('/api/notifications', [version]);
  useEffect(() => {
    if (!conn || !data?.items.some((n) => !n.read)) return;
    const t = setTimeout(() => request(conn, '/api/notifications', { body: {} }).then(refresh).catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, [data, conn, refresh]);
  const open = (n: Notif) => {
    if (n.post_id) go({ kind: 'post', id: n.post_id });
    else if (n.type.startsWith('invite')) openTab('jogar');
    else if (n.type === 'friend_request') openTab('amigos');
    else if (n.type === 'badge') openTab('perfil');
    else if (n.actor) go({ kind: 'user', code: n.actor.code });
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' }} refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}>
      <PushCard />
      <View style={{ alignItems: 'flex-end' }}>
        <Btn
          small
          kind="ghost"
          label="Marcar como lidas"
          icon={<CheckCheck size={15} color={c.ink} />}
          onPress={async () => {
            if (conn) await request(conn, '/api/notifications', { body: {} }).catch(() => {});
            reload();
            refresh();
          }}
        />
      </View>
      {!data ? <Spinner /> : null}
      {data && !data.items.length ? <Empty title="Nenhum aviso ainda" hint="Quando alguém curtir, comentar ou te chamar para jogar, aparece aqui." /> : null}
      {data?.items.length ? (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          {data.items.map((n, i) => (
            <Appear key={n.id} index={i}>
              <Pressable onPress={() => open(n)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, backgroundColor: pressed ? c.surfaceAlt : n.read ? c.surface : c.primarySoft })}>
                <View>
                  <Avatar user={n.actor} size={44} />
                  <View style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 11 }}>{NOTIF_ICON[n.type] ?? '🔔'}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <T style={{ fontSize: 14 }}>{n.text}</T>
                  <T v="small">{timeAgo(n.created_at)}</T>
                </View>
                {!n.read ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF5A1F' }} /> : null}
              </Pressable>
            </Appear>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

/* ================= Perfil ================= */

interface Profile {
  user: UserLite & { bio: string; banner_url: string | null; links: Record<string, string>; privacy: string; online?: boolean; banned?: boolean };
  relation: Relation;
  stats: { posts: number; friends: number; fires: number; followers: number; reposts?: number };
  following: boolean;
  hasFarm: boolean;
  farm: FarmSnapshot | null;
  farmUpdatedAt: string | null;
  farmHidden: 'private' | 'friends' | null;
}

/** Janela do dono para conceder selos. */
function BadgeAdmin({ user, visible, onClose, onSaved }: { user: UserLite; visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { conn } = useCommunity();
  const [sel, setSel] = useState<string[]>(user.badges);
  const [busy, setBusy] = useState(false);
  useEffect(() => setSel(user.badges), [user.badges, visible]);
  const save = async () => {
    if (!conn) return;
    setBusy(true);
    try {
      await request(conn, `/api/users/${user.code}/badges`, { method: 'PATCH', body: { badges: sel } });
      onSaved();
      onClose();
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <Sheet visible={visible} onClose={onClose}>
      <T v="h2" style={{ fontSize: 18 }}>
        Selos de {user.name}
      </T>
      <T v="small">Só você (dono) vê esta janela. O selo de dono não pode ser dado a outras pessoas.</T>
      {BADGES.filter((b) => b.id !== 'owner').map((b) => {
        const on = sel.includes(b.id);
        return (
          <Pressable key={b.id} onPress={() => setSel((x) => (on ? x.filter((y) => y !== b.id) : [...x, b.id]))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: on ? c.primary : c.line, backgroundColor: on ? c.primarySoft : c.surface }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: on ? c.primary : c.line, backgroundColor: on ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{on ? <Check size={14} color="#fff" /> : null}</View>
            <View style={{ flex: 1, gap: 4 }}>
              <Badges ids={[b.id]} size="md" />
              <T v="small">{b.desc}</T>
            </View>
          </Pressable>
        );
      })}
      <Btn label={busy ? 'Salvando…' : 'Salvar selos'} icon={<Award size={15} color="#fff" />} onPress={save} disabled={busy} />
    </Sheet>
  );
}

/* ================= Novidades ================= */

export const NEWS_SEEN = 'agrogestor:novidades-vistas';
const WHERE: Record<string, { label: string; tone: 'blue' | 'yellow' | 'green' }> = { site: { label: 'Site', tone: 'blue' }, app: { label: 'App', tone: 'yellow' }, ambos: { label: 'Site e app', tone: 'green' } };

function NewsScreen() {
  const { data, error } = useApi<Changelog>('/api/changelog');
  useEffect(() => {
    if (data?.latest) AsyncStorage.setItem(NEWS_SEEN, data.latest).catch(() => {});
  }, [data]);
  if (error) return <Empty title="Não foi possível carregar" hint={error} />;
  if (!data) return <Spinner />;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      <View>
        <T v="title" style={{ fontSize: 24 }}>
          Notas de atualização
        </T>
        <T v="small">Tudo o que mudou no site e no app, versão por versão.</T>
      </View>
      {data.entries.map((e, i) => (
        <Appear key={e.version} index={i}>
          <Card style={{ gap: 10, borderLeftWidth: 4, borderLeftColor: i === 0 ? c.harvest : c.primarySoft }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <T v="h2" style={{ fontSize: 17, flexShrink: 1 }}>
                {e.title}
              </T>
              {i === 0 ? <Badge label="✨ Mais recente" tone="yellow" /> : null}
            </View>
            <T v="small">
              Versão {e.version} · {new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </T>
            {e.items.map((it, j) => (
              <View key={j} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <View style={{ marginTop: 2 }}>
                  <Badge label={WHERE[it.where]?.label ?? it.where} tone={WHERE[it.where]?.tone ?? 'neutral'} />
                </View>
                <T style={{ flex: 1, fontSize: 14 }}>{it.text}</T>
              </View>
            ))}
          </Card>
        </Appear>
      ))}
    </ScrollView>
  );
}

function SyncCard() {
  const { sync, setSyncEnabled, syncNow } = useCommunity();
  const { data } = useStore();
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={19} color={c.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <T style={{ fontWeight: '700' }}>Sincronizar “{data.settings.farmName}”</T>
          <T v="small">{sync.enabled ? `Toda mudança neste save vai para o seu perfil.${sync.last ? ` Última: ${timeAgo(sync.last)}.` : ''}` : 'Mostre esta fazenda (patrimônio, campos, máquinas e animais) para os seus amigos.'}</T>
        </View>
        <Switch value={sync.enabled} onValueChange={setSyncEnabled} trackColor={{ true: c.primary, false: c.line }} thumbColor="#fff" />
      </View>
      <ErrorText text={sync.error ?? ''} />
      {sync.enabled ? <Btn small kind="ghost" label={sync.busy ? 'Enviando…' : 'Sincronizar agora'} onPress={syncNow} disabled={sync.busy} /> : null}
    </Card>
  );
}

function EditProfile({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { conn, me, setMe } = useCommunity();
  const [form, setForm] = useState({ name: '', bio: '', avatar_url: null as string | null, banner_url: null as string | null, privacy: 'friends' as Privacy, links: {} as Record<string, string>, platform: null as string | null });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (me && visible) setForm({ name: me.name, bio: me.bio, avatar_url: me.avatar_url, banner_url: me.banner_url, privacy: me.privacy ?? 'friends', links: me.links ?? {}, platform: me.platform ?? null });
  }, [me, visible]);
  if (!conn) return null;

  const pick = async (kind: 'avatar_url' | 'banner_url') => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: Platform.OS !== 'web', aspect: kind === 'avatar_url' ? [1, 1] : [3, 1] });
    if (res.canceled) return;
    const a = res.assets[0];
    setBusy(kind);
    setError('');
    try {
      const img = await shrinkImage({ uri: a.uri, width: a.width, height: a.height, file: (a as { file?: File }).file, mimeType: a.mimeType });
      const m = await uploadMedia(conn, { uri: img.uri, type: 'image', mimeType: img.mimeType, fileName: a.fileName, file: img.file, width: img.width, height: img.height });
      setForm((f) => ({ ...f, [kind]: m.url }));
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(null);
  };
  const save = async () => {
    setBusy('save');
    setError('');
    try {
      setMe(await request(conn, '/api/me', { method: 'PATCH', body: form }));
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(null);
  };
  const banner = mediaUrl(conn, form.banner_url);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <T v="h2" style={{ fontSize: 18 }}>
        Editar perfil
      </T>
      <Pressable onPress={() => pick('banner_url')} style={{ height: 110, borderRadius: 16, overflow: 'hidden', backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
        {banner ? <Image source={{ uri: banner }} style={{ position: 'absolute', width: '100%', height: '100%' }} /> : null}
        <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 }}>
          <Text style={{ fontFamily: font, color: '#fff', fontWeight: '700' }}>{busy === 'banner_url' ? 'Enviando…' : 'Trocar banner'}</Text>
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => pick('avatar_url')}>
          <Avatar user={{ name: form.name || '?', avatar_url: form.avatar_url }} size={72} />
        </Pressable>
        <View style={{ gap: 6 }}>
          <Btn small kind="ghost" label={busy === 'avatar_url' ? 'Enviando…' : 'Trocar foto'} onPress={() => pick('avatar_url')} />
          {form.avatar_url ? <Btn small kind="ghost" label="Remover foto" onPress={() => setForm((f) => ({ ...f, avatar_url: null }))} /> : null}
        </View>
      </View>
      <Input label="Nome" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} maxLength={40} />
      <Input label="Bio" value={form.bio} onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))} maxLength={280} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} placeholder="Ex.: Produtor de soja em Riverbend, jogo todo sábado." />
      <View style={{ gap: 8 }}>
        <T v="label">ONDE VOCÊ JOGA</T>
        <PlatformPicker value={form.platform} onChange={(v) => setForm((f) => ({ ...f, platform: v }))} />
      </View>
      <View style={{ gap: 8 }}>
        <T v="label">PRIVACIDADE DA FAZENDA</T>
        {PRIVACY.map((p) => {
          const on = form.privacy === p.id;
          return (
            <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setForm((f) => ({ ...f, privacy: p.id }))} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: on ? c.primary : c.line, backgroundColor: on ? c.primarySoft : c.surface }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? c.primary : c.line, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>{on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} /> : null}</View>
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: '700' }}>{p.label}</T>
                <T v="small">{p.desc}</T>
              </View>
            </Pressable>
          );
        })}
      </View>
      {canHaveLinks(me?.badges) ? (
        <View style={{ gap: 8 }}>
          <T v="label">LINKS SOCIAIS</T>
          <T v="small">Aparecem no seu perfil. Pode colar o link completo ou só o @ do canal.</T>
          {LINK_SITES.map((sx) => (
            <Input key={sx.id} label={`${sx.emoji} ${sx.label}`} value={form.links[sx.id] ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, links: { ...f.links, [sx.id]: v } }))} placeholder={sx.prefix + (sx.id === 'site' ? 'seusite.com' : 'seucanal')} autoCapitalize="none" autoCorrect={false} maxLength={200} />
          ))}
        </View>
      ) : null}
      <ErrorText text={error} />
      <Btn label={busy === 'save' ? 'Salvando…' : 'Salvar perfil'} onPress={save} disabled={busy !== null} />
    </Sheet>
  );
}

function ProfileScreen({ code, go, invite, own }: { code: string; go: (v: View_) => void; invite: (u: UserLite) => void; own?: boolean }) {
  const { conn, me, logout, version } = useCommunity();
  const { data, setData, reload, error } = useApi<Profile>(`/api/users/${encodeURIComponent(code)}`, [version]);
  const [tab, setTab] = useState<'fazenda' | 'posts' | 'reposts'>('fazenda');
  const posts = useApi<{ posts: Post[] }>(tab === 'posts' ? `/api/posts?sort=new&author=${encodeURIComponent(code)}` : tab === 'reposts' ? `/api/posts?reposted_by=${encodeURIComponent(code)}` : null, [version, tab]);
  const [edit, setEdit] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [news, setNews] = useState(false);
  const isOwner = Boolean(me?.badges?.includes('owner'));
  const follow = async () => {
    if (!conn || !data) return;
    const next = !data.following;
    setData({ ...data, following: next, stats: { ...data.stats, followers: Math.max(0, data.stats.followers + (next ? 1 : -1)) } });
    try {
      const r = await request<{ following: boolean; followers: number }>(conn, `/api/users/${data.user.code}/follow`, { method: 'POST' });
      setData((d) => (d ? { ...d, following: r.following, stats: { ...d.stats, followers: r.followers } } : d));
    } catch (e) {
      reload();
      alert((e as Error).message);
    }
  };
  const wide = useWide();
  const zoom = useRef(new Animated.Value(1.08)).current;
  useEffect(() => {
    Animated.timing(zoom, { toValue: 1, duration: 1100, useNativeDriver: nativeDriver }).start();
  }, [zoom]);

  if (error) return <Empty title="Perfil não encontrado" hint={error} />;
  if (!data || !conn) return <Spinner />;
  const { user, relation, stats } = data;
  const banner = mediaUrl(conn, user.banner_url);
  const links = LINK_SITES.filter((sx) => user.links?.[sx.id]);
  const first = user.name.split(' ')[0];

  const friendAction = async (action: 'add' | 'accept' | 'remove') => {
    try {
      if (action === 'add') await request(conn, '/api/friends', { body: { code: user.code } });
      else if (action === 'accept') await request(conn, `/api/friends/${user.id}`, { method: 'PATCH', body: { action: 'accept' } });
      else await request(conn, `/api/friends/${user.id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: wide ? 24 : 16, paddingBottom: 32, gap: 14, maxWidth: 860, width: '100%', alignSelf: 'center' }} refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}>
      <Appear>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <View style={{ height: wide ? 190 : 130, backgroundColor: c.primary, overflow: 'hidden' }}>
            {banner ? <Animated.Image source={{ uri: banner }} style={{ width: '100%', height: '100%', transform: [{ scale: zoom }] }} /> : <View style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: c.harvest, opacity: 0.55 }} />}
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ marginTop: -46, borderRadius: 56, borderWidth: 5, borderColor: c.surface }}>
                <Avatar user={user} size={92} />
                {relation !== 'self' ? <OnlineDot on={Boolean(user.online)} size={22} /> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingTop: 8 }}>
                {relation === 'self' ? <Btn small kind="ghost" label="Editar perfil" icon={<Pencil size={14} color={c.ink} />} onPress={() => setEdit(true)} /> : null}
                {relation !== 'self' ? (
                  <Pressy accessibilityRole="button" accessibilityState={{ selected: data.following }} onPress={follow} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: data.following ? c.surface : c.primarySoft, borderWidth: 1, borderColor: data.following ? c.line : c.primarySoft, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 }}>
                    {data.following ? <Check size={15} color={c.ink} /> : <UserPlus size={15} color={c.primaryDark} />}
                    <Text style={{ fontFamily: font, fontWeight: '700', color: data.following ? c.ink : c.primaryDark }}>{data.following ? 'Seguindo' : 'Seguir'}</Text>
                  </Pressy>
                ) : null}
                {isOwner && relation !== 'self' ? <Btn small kind="ghost" label="Selos" icon={<Award size={14} color={c.ink} />} onPress={() => setAdmin(true)} /> : null}
                {isOwner && relation !== 'self' ? (
                  <Btn
                    small
                    kind={user.banned ? 'ghost' : 'danger'}
                    label={user.banned ? 'Reativar conta' : 'Suspender'}
                    icon={<Ban size={14} color={user.banned ? c.ink : '#fff'} />}
                    onPress={async () => {
                      try {
                        await request(conn, `/api/users/${user.code}/ban`, { body: { ban: !user.banned } });
                        reload();
                      } catch (e) {
                        alert((e as Error).message);
                      }
                    }}
                  />
                ) : null}
                {relation === 'friend' ? (
                  <>
                    <Pressy accessibilityRole="button" onPress={() => invite(user)} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: c.harvest, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 }}>
                      <Gamepad2 size={15} color="#2a1f00" />
                      <Text style={{ fontFamily: font, fontWeight: '700', color: '#2a1f00' }}>Chamar para jogar</Text>
                    </Pressy>
                    <Btn small kind="ghost" label="Amigos ✓" onPress={() => friendAction('remove')} />
                  </>
                ) : null}
                {relation === 'none' ? <Btn small label="Adicionar amigo" icon={<UserPlus size={14} color="#fff" />} onPress={() => friendAction('add')} /> : null}
                {relation === 'sent' ? <Btn small kind="ghost" label="Pedido enviado" onPress={() => friendAction('remove')} /> : null}
                {relation === 'received' ? <Btn small label="Aceitar pedido" onPress={() => friendAction('accept')} /> : null}
              </View>
            </View>
            {user.banned ? (
              <View style={{ marginTop: 8 }}>
                <ErrorText text="Conta suspensa pela moderação. Só você (dono) vê este perfil." />
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <T v="title" style={{ fontSize: 24 }}>
                {user.name}
              </T>
              {user.platform ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.surfaceAlt, borderRadius: 99, paddingVertical: 4, paddingHorizontal: 9 }}>
                  <PlatformIcon id={user.platform} size={15} />
                  <Text style={{ fontFamily: font, fontSize: 12, fontWeight: '700', color: c.ink }}>{platformLabel(user.platform)}</Text>
                </View>
              ) : null}
            </View>
            {user.badges?.length ? <View style={{ marginTop: 6 }}><Badges ids={user.badges} size="md" /></View> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <T v="small">@{user.username}</T>
              <CopyCode code={user.code} />
              {user.privacy === 'private' ? <Badge label="🔒 privado" /> : null}
            </View>
            {user.bio ? <T style={{ marginTop: 10 }}>{user.bio}</T> : null}
            {links.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {links.map((sx) => (
                  <Chip key={sx.id} label={`${sx.emoji} ${sx.label}`} onPress={() => Linking.openURL(user.links[sx.id]).catch(() => {})} />
                ))}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
              <T>
                <Text style={{ fontWeight: '800' }}>{stats.followers}</Text> <T v="small">seguidores</T>
              </T>
              <T>
                <Text style={{ fontWeight: '800' }}>{stats.posts}</Text> <T v="small">postagens</T>
              </T>
              <T>
                <Text style={{ fontWeight: '800' }}>{stats.friends}</Text> <T v="small">amigos</T>
              </T>
              <T>
                <Text style={{ fontWeight: '800' }}>{stats.fires}</Text> <T v="small">🔥</T>
              </T>
            </View>
          </View>
        </Card>
      </Appear>

      {own ? <SyncCard /> : null}

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'fazenda', label: '🏡 Fazenda' },
          { value: 'posts', label: '📝 Postagens' },
          { value: 'reposts', label: `🔁 Republicados${stats.reposts ? ` (${stats.reposts})` : ''}` },
        ]}
      />
      {tab === 'fazenda' ? (
        data.farm ? (
          <View style={{ gap: 10 }}>
            {relation === 'self' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Lock size={13} color={c.muted} />
                <T v="small">
                  Visibilidade: <Text style={{ fontWeight: '700' }}>{PRIVACY.find((p) => p.id === user.privacy)?.label}</Text> (mude em Editar perfil)
                </T>
              </View>
            ) : null}
            <FarmView farm={data.farm} updatedAt={data.farmUpdatedAt} />
          </View>
        ) : (
          <Card>
            <Empty
              title={relation === 'self' ? 'Sua fazenda ainda não está no perfil' : data.farmHidden === 'private' ? 'Fazenda privada' : data.hasFarm ? 'Fazenda visível só para amigos' : `${first} ainda não publicou a fazenda`}
              hint={relation === 'self' ? 'Ligue “Sincronizar” aqui em cima para mostrar este save aos seus amigos.' : data.farmHidden === 'private' ? `${first} escolheu não mostrar a fazenda e o patrimônio.` : data.hasFarm ? 'Adicione como amigo para ver plantações, máquinas e animais.' : 'Quando publicar, aparece aqui.'}
            />
          </Card>
        )
      ) : !posts.data ? (
        <Spinner />
      ) : posts.data.posts.length ? (
        posts.data.posts.map((p, i) => <View key={p.id} style={{ marginBottom: 2, gap: 6 }}>{tab === 'reposts' ? <T v="small" style={{ fontWeight: '700', marginLeft: 4 }}>🔁 Republicado</T> : null}<PostCard post={p} index={i} onOpenPost={(x) => go({ kind: 'post', id: x.id })} onOpenUser={(c2) => c2 !== code && go({ kind: 'user', code: c2 })} onDeleted={posts.reload} /></View>)
      ) : (
        <Empty title="Nenhuma postagem ainda" hint="" />
      )}

      {own ? <PushCard /> : null}
      {own ? <Btn kind="ghost" label="Notas de atualização" icon={<Sparkles size={15} color={c.ink} />} onPress={() => setNews(true)} /> : null}
      {own ? <Btn kind="ghost" label="Sair do AgroSocial neste aparelho" icon={<LogOut size={15} color={c.ink} />} onPress={logout} /> : null}
      <EditProfile visible={edit} onClose={() => setEdit(false)} onSaved={reload} />
      {isOwner ? <BadgeAdmin user={user} visible={admin} onClose={() => setAdmin(false)} onSaved={reload} /> : null}
      <Sheet visible={news} onClose={() => setNews(false)}>
        <NewsScreen />
      </Sheet>
    </ScrollView>
  );
}

/* ================= Tela ================= */

const SOCIAL_TABS: { value: Tab; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { value: 'feed', label: 'Feed', Icon: Flame },
  { value: 'amigos', label: 'Amigos', Icon: Users },
  { value: 'jogar', label: 'Jogar', Icon: Gamepad2 },
  { value: 'avisos', label: 'Avisos', Icon: Bell },
  { value: 'perfil', label: 'Perfil', Icon: UserRound },
];

function Dot({ n }: { n: number }) {
  if (!n) return null;
  return (
    <View style={{ minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: '#FF5A1F', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.surface }}>
      <Text style={{ fontFamily: font, color: '#fff', fontSize: 10, fontWeight: '800' }}>{n > 99 ? '99+' : n}</Text>
    </View>
  );
}

/** Aba da barra inferior do AgroSocial: o ícone sobe e a pílula aparece com mola. */
function SocialTab({ label, Icon, on, badge, onPress }: { label: string; Icon: React.ComponentType<{ size?: number; color?: string }>; on: boolean; badge: number; onPress: () => void }) {
  const v = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: on ? 1 : 0, useNativeDriver: nativeDriver, speed: 16, bounciness: 9 }).start();
  }, [on, v]);
  return (
    <Pressy accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={onPress} scaleTo={0.9} style={{ flex: 1, alignItems: 'center', paddingTop: 7, paddingBottom: 5 }}>
      <Animated.View style={{ position: 'absolute', top: 4, width: 54, height: 30, borderRadius: 15, backgroundColor: c.primarySoft, opacity: v, transform: [{ scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }} />
      <Animated.View style={{ height: 24, justifyContent: 'center', transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }}>
        <Icon size={21} color={on ? c.primary : c.muted} />
        {badge ? (
          <View style={{ position: 'absolute', top: -6, right: -14 }}>
            <Dot n={badge} />
          </View>
        ) : null}
      </Animated.View>
      <Text style={{ fontFamily: font, fontSize: 11, fontWeight: on ? '800' : '600', color: on ? c.primary : c.muted, marginTop: 4 }}>{label}</Text>
    </Pressy>
  );
}

/**
 * AgroSocial: a rede social dentro do app, com cabeçalho e barra de abas
 * próprios e um botão para voltar para a Gestão da fazenda.
 */
export default function SocialShell({ onGestao }: { onGestao: () => void }) {
  const { ready, conn, me, friend_requests, invites, unread, target, open } = useCommunity();
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const [tab, setTab] = useState<Tab>('feed');
  const [stack, setStack] = useState<View_[]>([]);
  const [inviteTo, setInviteTo] = useState<UserLite | null>(null);
  const [news, setNews] = useState(false);
  const [hasNews, setHasNews] = useState(false);
  const view = stack[stack.length - 1] ?? { kind: 'tab' as const };
  const fade = useRef(new Animated.Value(1)).current;
  const badgeOf = (t: Tab) => (t === 'amigos' ? friend_requests : t === 'jogar' ? invites : t === 'avisos' ? unread : 0);

  const animate = () => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: nativeDriver }).start();
  };
  const go = useCallback(
    (v: View_) => {
      animate();
      if (v.kind === 'tab') setStack([]);
      else setStack((s) => [...s, v]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const back = () => {
    animate();
    setStack((s) => s.slice(0, -1));
  };
  const openTab = (t: Tab) => {
    animate();
    setStack([]);
    setTab(t);
  };

  // Novidades: ponto no ícone quando saiu versão nova.
  useEffect(() => {
    if (!conn) return;
    request<Changelog>(conn, '/api/changelog')
      .then(async (d) => setHasNews((await AsyncStorage.getItem(NEWS_SEEN).catch(() => null)) !== d.latest))
      .catch(() => {});
  }, [conn, news]);

  // Botão voltar do Android: tela anterior › Feed › Gestão.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (news) {
        setNews(false);
        return true;
      }
      if (stack.length) {
        back();
        return true;
      }
      if (tab !== 'feed') {
        openTab('feed');
        return true;
      }
      onGestao();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stack.length, tab, news]);

  // Notificação tocada ou aviso da tela: abre o destino certo.
  useEffect(() => {
    if (!target) return;
    const t: Target = target;
    open(null);
    if (t.kind === 'tab') openTab(t.tab);
    else if (t.kind === 'post') go({ kind: 'post', id: t.id });
    else go({ kind: 'user', code: t.code });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  let body: React.ReactNode;
  if (!ready) body = <Spinner />;
  else if (!conn) body = <Connect />;
  else if (view.kind === 'post') body = <PostScreen key={view.id} id={view.id} go={go} />;
  else if (view.kind === 'user') body = <ProfileScreen key={view.code} code={view.code} go={go} invite={setInviteTo} own={view.code === me?.code} />;
  else if (tab === 'feed') body = <FeedTab go={go} />;
  else if (tab === 'amigos') body = <FriendsTab go={go} invite={setInviteTo} />;
  else if (tab === 'jogar') body = <InvitesTab go={go} invite={setInviteTo} />;
  else if (tab === 'avisos') body = <NotifsTab go={go} openTab={openTab} />;
  else body = me ? <ProfileScreen code={me.code} go={go} invite={setInviteTo} own /> : <Spinner />;

  const header = (
    <View style={{ backgroundColor: c.sidebar, paddingTop: insets.top + 10, paddingBottom: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {view.kind !== 'tab' ? (
        <Pressy accessibilityRole="button" accessibilityLabel="Voltar" onPress={back} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.sidebarActive, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} color="#fff" />
        </Pressy>
      ) : (
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.harvest, alignItems: 'center', justifyContent: 'center' }}>
          <Flame size={19} color={c.sidebar} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font, color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>AgroSocial</Text>
        <Text style={{ fontFamily: font, color: c.sidebarInk, fontSize: 11.5 }} numberOfLines={1}>
          {view.kind === 'post' ? 'Postagem' : view.kind === 'user' ? 'Perfil' : SOCIAL_TABS.find((x) => x.value === tab)?.label}
        </Text>
      </View>
      {conn ? (
        <Pressy accessibilityRole="button" accessibilityLabel="Notas de atualização" onPress={() => setNews(true)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.sidebarActive, alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={19} color="#fff" />
          {hasNews ? <View style={{ position: 'absolute', top: 7, right: 7, width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF5A1F' }} /> : null}
        </Pressy>
      ) : null}
      <Pressy accessibilityRole="button" accessibilityLabel="Ir para a Gestão da fazenda" onPress={onGestao} scaleTo={0.95} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.harvest, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 11 }}>
        <ClipboardList size={17} color={c.sidebar} />
        <Text style={{ fontFamily: font, fontWeight: '800', color: c.sidebar, fontSize: 13 }}>Gestão</Text>
      </Pressy>
    </View>
  );

  const content = (
    <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>{body}</Animated.View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {header}
      {wide && conn ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: 210, padding: 12, gap: 4, borderRightWidth: 1, borderRightColor: c.line, backgroundColor: c.surface }}>
            {SOCIAL_TABS.map((t) => {
              const on = view.kind === 'tab' && tab === t.value;
              return (
                <Pressy key={t.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => openTab(t.value)} scaleTo={0.97} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: on ? c.primarySoft : 'transparent' }}>
                  <t.Icon size={19} color={on ? c.primary : c.muted} />
                  <Text style={{ flex: 1, fontFamily: font, fontWeight: on ? '800' : '600', color: on ? c.primaryDark : c.ink }}>{t.label}</Text>
                  <Dot n={badgeOf(t.value)} />
                </Pressy>
              );
            })}
          </View>
          {content}
        </View>
      ) : (
        content
      )}
      {conn && !wide ? (
        <View style={{ flexDirection: 'row', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, paddingBottom: insets.bottom }}>
          {SOCIAL_TABS.map((t) => (
            <SocialTab key={t.value} label={t.label} Icon={t.Icon} on={view.kind === 'tab' && tab === t.value} badge={badgeOf(t.value)} onPress={() => openTab(t.value)} />
          ))}
        </View>
      ) : null}
      <InviteSheet friend={inviteTo} onClose={() => setInviteTo(null)} />
      <Sheet visible={news} onClose={() => setNews(false)}>
        <NewsScreen />
      </Sheet>
    </View>
  );
}
