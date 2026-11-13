import * as acc from './accounts';
import { KV, SaveMeta } from './accounts';
import { CloudSession, deleteRemote, getRemote, listRemote, putRemote, RemoteMeta } from './cloud';

/**
 * Sincroniza os saves da conta com o site. Para cada save, a versão com a data
 * de edição mais recente vence; saves apagados num lugar somem nos outros.
 * Devolve os ids que mudaram aqui (baixados ou removidos).
 */
export async function syncAll(kv: KV, userId: string, s: CloudSession): Promise<{ pulled: string[]; removed: string[]; pushed: string[] }> {
  const out = { pulled: [] as string[], removed: [] as string[], pushed: [] as string[] };

  for (const id of await acc.getDeleted(kv, userId)) {
    await deleteRemote(s, id);
    await acc.clearDeleted(kv, userId, id);
  }

  const remote = await listRemote(s);
  const local = await acc.listSaves(kv, userId);

  const pull = async (r: RemoteMeta) => {
    const g = await getRemote(s, r.id);
    if (!g.data || g.deleted) return;
    const meta: Omit<SaveMeta, 'userId'> = { id: r.id, name: r.name, farmName: r.farmName, map: r.map, mapName: r.mapName, mode: r.mode as SaveMeta['mode'], createdAt: r.createdAt, updatedAt: g.updatedAt };
    if (await acc.putRemoteSave(kv, userId, meta, acc.normalizeData(g.data))) out.pulled.push(r.id);
  };
  const push = async (l: SaveMeta) => {
    const data = await acc.loadSave(kv, l.id);
    if (!data) return;
    const res = await putRemote(s, l, data);
    if (res.stale) {
      const r = (await listRemote(s)).find((x) => x.id === l.id);
      if (r && !r.deleted) await pull(r);
    } else out.pushed.push(l.id);
  };

  for (const r of remote) {
    const l = local.find((x) => x.id === r.id);
    if (r.deleted) {
      if (l) {
        await acc.removeLocalSave(kv, userId, r.id);
        out.removed.push(r.id);
      }
    } else if (!l || r.updatedAt > l.updatedAt) await pull(r);
    else if (l.updatedAt > r.updatedAt) await push(l);
  }
  for (const l of local) if (!remote.some((r) => r.id === l.id)) await push(l);
  return out;
}

/** Envia só um save (depois de editar). */
export async function pushOne(kv: KV, userId: string, s: CloudSession, saveId: string): Promise<'ok' | 'stale'> {
  const meta = (await acc.listSaves(kv, userId)).find((x) => x.id === saveId);
  const data = meta ? await acc.loadSave(kv, saveId) : null;
  if (!meta || !data) return 'ok';
  return (await putRemote(s, meta, data)).stale ? 'stale' : 'ok';
}
