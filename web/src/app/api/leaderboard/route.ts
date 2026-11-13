import { NextResponse } from 'next/server';
import { requireUser, route } from '@/lib/auth';
import { q } from '@/lib/db';
import { farmTotals, type FarmSnapshot } from '@/lib/farm';
import { FRIEND_IDS } from '@/lib/queries';

export interface RankRow {
  id: string;
  code: string;
  name: string;
  avatar_url: string | null;
  badges: string[];
  platform: string | null;
  me: boolean;
  /** Fazenda escondida (perfil privado) ou ainda não publicada. */
  hidden: boolean;
  farmName: string | null;
  currency: string;
  worth: number;
  machines: number;
  area: number;
  animals: number;
}

/**
 * Ranking entre você e os seus amigos: patrimônio, número de máquinas, área e animais.
 * Quem deixou a fazenda privada aparece, mas sem números.
 */
export const GET = route(async () => {
  const me = await requireUser();
  const rows = await q<{ id: string; code: string; name: string; avatar_url: string | null; badges: string[]; platform: string | null; privacy: string; farm: FarmSnapshot | null }>(
    `select id, code, name, avatar_url, badges, platform, privacy, farm from users where banned_at is null and (id = $1 or id in ${FRIEND_IDS})`,
    [me.id],
  );
  const out: RankRow[] = rows.map((u) => {
    const self = u.id === me.id;
    const hidden = !u.farm || (!self && u.privacy === 'private');
    const t = !hidden && u.farm ? farmTotals(u.farm) : null;
    return {
      id: u.id,
      code: u.code,
      name: u.name,
      avatar_url: u.avatar_url,
      badges: u.badges,
      platform: u.platform,
      me: self,
      hidden,
      farmName: hidden ? null : u.farm?.farmName ?? null,
      currency: u.farm?.currency ?? '$',
      worth: t?.worth ?? 0,
      machines: hidden ? 0 : u.farm?.machines.length ?? 0,
      area: t?.area ?? 0,
      animals: t?.heads ?? 0,
    };
  });
  return NextResponse.json(out);
});
