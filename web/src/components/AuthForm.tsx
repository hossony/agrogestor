'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { EASE, EASE_OUT, Spinner } from './ui';

const FEATURES = [
  { emoji: '🔥', text: 'Feed com fotos e vídeos da sua fazenda, curtidas e foguinhos' },
  { emoji: '🤝', text: 'Amigos pelo ID: veja as plantações, tratores e animais deles' },
  { emoji: '🎮', text: 'Chame os amigos para jogar e receba o aviso no celular' },
];

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const reg = mode === 'register';
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (reg && form.password !== form.confirm) return setError('As senhas não conferem.');
    setBusy(true);
    try {
      await api(reg ? '/api/auth/register' : '/api/auth/login', { body: form });
      router.replace(reg ? '/perfil?novo=1' : '/feed');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-art">
        <motion.div className="auth-sun" animate={{ scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="auth-hills" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 0.8 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
        <div className="brand" style={{ padding: 0, position: 'relative' }}>
          <span className="brand-mark">🌾</span> AgroGestor
        </div>
        <div style={{ position: 'relative' }}>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...EASE_OUT, delay: 0.1 }}>
            A comunidade de quem vive no campo virtual.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...EASE_OUT, delay: 0.2 }}>
            Mostre a sua colheita, acompanhe a fazenda dos amigos e combine a próxima partida.
          </motion.p>
          <div className="stack" style={{ marginTop: 28, gap: 10 }}>
            {FEATURES.map((f, i) => (
              <motion.div key={f.text} className="row" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ ...EASE_OUT, delay: 0.3 + i * 0.08 }} style={{ color: 'rgb(255 255 255 / .88)' }}>
                <span style={{ fontSize: 20 }}>{f.emoji}</span>
                <span>{f.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div />
      </section>

      <section className="auth-form">
        <motion.form className="auth-box stack" onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={EASE_OUT}>
          <div>
            <h2>{reg ? 'Criar conta' : 'Entrar'}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {reg ? 'Você ganha um ID para os amigos te adicionarem.' : 'Bem-vindo de volta, fazendeiro.'}
            </p>
          </div>
          <AnimatePresence initial={false}>
            {reg && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={EASE}>
                <label className="label" htmlFor="name">
                  Nome
                </label>
                <input id="name" className="input" value={form.name} onChange={set('name')} autoComplete="name" placeholder="Como os amigos te chamam" required />
              </motion.div>
            )}
          </AnimatePresence>
          <div>
            <label className="label" htmlFor="username">
              Usuário
            </label>
            <input id="username" className="input" value={form.username} onChange={set('username')} autoComplete="username" autoCapitalize="none" placeholder="ex.: joao.trator" required />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Senha
            </label>
            <input id="password" className="input" type="password" value={form.password} onChange={set('password')} autoComplete={reg ? 'new-password' : 'current-password'} required minLength={6} />
          </div>
          {reg && (
            <div>
              <label className="label" htmlFor="confirm">
                Repita a senha
              </label>
              <input id="confirm" className="input" type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required minLength={6} />
            </div>
          )}
          <AnimatePresence>
            {error && (
              <motion.div className="error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0, x: [0, -6, 6, -3, 3, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          <button className="btn btn-block" style={{ height: 46 }} disabled={busy}>
            {busy ? <Spinner /> : reg ? 'Criar conta' : 'Entrar'}
          </button>
          <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>
            {reg ? (
              <>
                Já tem conta?{' '}
                <Link href="/entrar" className="bold" style={{ color: 'var(--primary)' }}>
                  Entrar
                </Link>
              </>
            ) : (
              <>
                Primeira vez aqui?{' '}
                <Link href="/cadastro" className="bold" style={{ color: 'var(--primary)' }}>
                  Criar conta
                </Link>
              </>
            )}
          </p>
        </motion.form>
      </section>
    </div>
  );
}
