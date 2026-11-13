'use client';

import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import PushCard from '@/components/PushCard';
import { Avatar, CopyCode, EASE, EASE_OUT, Spinner } from '@/components/ui';
import { canHaveLinks, LINK_SITES, PRIVACY, type Privacy } from '@/lib/badges';
import { api, uploadMedia, useMe } from '@/lib/client';
import { Badges } from '@/components/Badges';

function EditInner() {
  const { data: me, mutate } = useMe();
  const router = useRouter();
  const welcome = useSearchParams().get('novo') === '1';
  const [form, setForm] = useState({ name: '', bio: '', avatar_url: null as string | null, banner_url: null as string | null, privacy: 'friends' as Privacy, links: {} as Record<string, string> });
  const [pw, setPw] = useState({ password: '', newPassword: '' });
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  // Preenche o formulário uma vez só: recarregar a conta em segundo plano não pode apagar o que a pessoa mudou.
  const filled = useRef(false);
  useEffect(() => {
    if (!me || filled.current) return;
    filled.current = true;
    setForm({ name: me.name, bio: me.bio, avatar_url: me.avatar_url, banner_url: me.banner_url, privacy: me.privacy ?? 'friends', links: me.links ?? {} });
  }, [me]);

  const pick = async (kind: 'avatar' | 'banner', file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setMsg({ ok: false, text: 'Escolha uma imagem.' });
    setUploading(kind);
    setMsg(null);
    try {
      const m = await uploadMedia(file);
      setForm((f) => ({ ...f, [`${kind}_url`]: m.url }));
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setUploading(null);
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const updated = await api('/api/me', { method: 'PATCH', body: { ...form, ...(pw.newPassword ? pw : {}) } });
      await mutate(updated as never, { revalidate: false });
      setPw({ password: '', newPassword: '' });
      setMsg({ ok: true, text: 'Perfil salvo.' });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(false);
  };

  if (!me) return null;

  return (
    <div className="page stack">
      <div className="page-head">
        <div>
          <h1>{welcome ? 'Bem-vindo ao AgroGestor! 🌾' : 'Editar perfil'}</h1>
          <p>{welcome ? 'Coloque uma foto e um banner para os amigos te reconhecerem.' : 'Foto, banner, nome e bio.'}</p>
        </div>
        <Link href={`/u/${me.code}`} className="btn btn-sm btn-ghost">
          Ver meu perfil
        </Link>
      </div>

      <motion.div className="card" style={{ overflow: 'hidden' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={EASE_OUT}>
        <div className="banner" style={{ cursor: 'pointer' }} onClick={() => bannerRef.current?.click()}>
          <AnimatePresence mode="wait">
            {form.banner_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <motion.img key={form.banner_url} src={form.banner_url} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={EASE} />
            )}
          </AnimatePresence>
          <div className="row" style={{ position: 'absolute', right: 12, bottom: 12, gap: 6 }}>
            {form.banner_url && (
              <button
                className="btn btn-sm"
                style={{ background: 'rgb(0 0 0 / .55)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setForm((f) => ({ ...f, banner_url: null }));
                }}
                aria-label="Remover banner"
              >
                <Trash2 size={15} />
              </button>
            )}
            <span className="btn btn-sm" style={{ background: 'rgb(0 0 0 / .55)' }}>
              {uploading === 'banner' ? <Spinner size={15} /> : <ImagePlus size={15} />} Banner
            </span>
          </div>
        </div>
        <div className="profile-head">
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <button className="profile-avatar avatar" style={{ position: 'relative', padding: 0, border: '5px solid var(--surface)', cursor: 'pointer', borderRadius: '50%' }} onClick={() => avatarRef.current?.click()} aria-label="Trocar foto">
              <Avatar user={{ name: form.name || me.name, avatar_url: form.avatar_url }} size={104} />
              <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgb(0 0 0 / .35)', color: '#fff', borderRadius: '50%' }}>{uploading === 'avatar' ? <Spinner /> : <Camera size={24} />}</span>
            </button>
            {form.avatar_url && (
              <button className="btn btn-sm btn-ghost" onClick={() => setForm((f) => ({ ...f, avatar_url: null }))}>
                Remover foto
              </button>
            )}
          </div>
          <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => pick('avatar', e.target.files?.[0])} />
          <input ref={bannerRef} type="file" accept="image/*" hidden onChange={(e) => pick('banner', e.target.files?.[0])} />

          <div className="stack" style={{ marginTop: 18 }}>
            <div className="row wrap">
              <span className="small muted">Seu ID para os amigos:</span>
              <CopyCode code={me.code} />
            </div>
            <div>
              <label className="label" htmlFor="name">
                Nome
              </label>
              <input id="name" className="input" value={form.name} maxLength={40} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label" htmlFor="bio">
                Bio
              </label>
              <textarea id="bio" className="textarea" value={form.bio} maxLength={280} placeholder="Ex.: Produtor de soja em Riverbend, fã de John Deere, jogo todo sábado à noite." onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
              <div className="hint">{280 - form.bio.length} caracteres restantes</div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="card card-pad stack">
        <div>
          <div className="bold">Privacidade da fazenda</div>
          <div className="small muted">Quem pode ver a sua fazenda e o seu patrimônio no perfil. As postagens no feed são sempre públicas.</div>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {PRIVACY.map((p) => (
            <label key={p.id} className="radio-card" data-on={form.privacy === p.id}>
              <input type="radio" name="privacy" checked={form.privacy === p.id} onChange={() => setForm((f) => ({ ...f, privacy: p.id }))} />
              <span>
                <span className="bold">{p.label}</span>
                <span className="small muted" style={{ display: 'block' }}>
                  {p.desc}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {me.badges?.length > 0 && (
        <div className="card card-pad stack" style={{ gap: 8 }}>
          <div className="bold">Seus selos</div>
          <Badges ids={me.badges} size="md" />
        </div>
      )}

      {canHaveLinks(me.badges) && (
        <div className="card card-pad stack">
          <div>
            <div className="bold">Links sociais</div>
            <div className="small muted">Aparecem no seu perfil. Pode colar o link completo ou só o @ do canal.</div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {LINK_SITES.map((s) => (
              <div key={s.id} className="row">
                <span style={{ width: 110, fontSize: 13.5, fontWeight: 700 }}>
                  {s.emoji} {s.label}
                </span>
                <input className="input" value={form.links[s.id] ?? ''} placeholder={s.prefix + (s.id === 'site' ? 'seusite.com' : 'seucanal')} onChange={(e) => setForm((f) => ({ ...f, links: { ...f.links, [s.id]: e.target.value } }))} maxLength={200} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card card-pad stack">
        <div className="bold">Trocar senha</div>
        <div className="row wrap">
          <input className="input grow" type="password" placeholder="Senha atual" autoComplete="current-password" value={pw.password} onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))} style={{ minWidth: 180 }} />
          <input className="input grow" type="password" placeholder="Nova senha" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} style={{ minWidth: 180 }} />
        </div>
      </div>

      <PushCard />

      <AnimatePresence>
        {msg && (
          <motion.div className={msg.ok ? 'ok' : 'error'} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={EASE}>
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {welcome && (
          <Link href="/fazenda" className="btn btn-ghost">
            Depois
          </Link>
        )}
        <button className="btn" onClick={save} disabled={busy || uploading !== null}>
          {busy ? <Spinner size={16} /> : null} Salvar perfil
        </button>
      </div>
    </div>
  );
}

export default function EditProfilePage() {
  return (
    <Suspense>
      <EditInner />
    </Suspense>
  );
}
