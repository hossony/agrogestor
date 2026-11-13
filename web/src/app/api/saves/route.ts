import { NextResponse } from 'next/server';
import { requireUser, route } from '@/lib/auth';
import { q } from '@/lib/db';

/** Lista os saves da conta (sem os dados), incluindo os apagados, para o app sincronizar. */
export const GET = route(async () => {
  const me = await requireUser();
  const rows = await q<{ id: string; name: string; farm_name: string; map: string; map_name: string; mode: string; deleted: boolean; created_at: Date; updated_at: Date }>(
    'select id, name, farm_name, map, map_name, mode, deleted, created_at, updated_at from saves where user_id = $1 order by updated_at desc',
    [me.id],
  );
  return NextResponse.json({
    saves: rows.map((r) => ({ id: r.id, name: r.name, farmName: r.farm_name, map: r.map, mapName: r.map_name, mode: r.mode, deleted: r.deleted, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString() })),
  });
});
