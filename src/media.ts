import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { uid } from './utils';

/**
 * Fotos do diário, da frota e dos animais.
 * - Android: a imagem é copiada para a pasta de documentos do app.
 * - Web e Windows: é reduzida e guardada no IndexedDB; o registro guarda "idb:<id>".
 */

const DB = 'agrogestor-fotos';
const STORE = 'fotos';
const memory = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(id: string, value: string | null) {
  if (value) memory.set(id, value);
  else memory.delete(id);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      if (value) tx.objectStore(STORE).put(value, id);
      else tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Sem IndexedDB: a foto vale só até fechar o app.
  }
}

async function idbGet(id: string): Promise<string | null> {
  if (memory.has(id)) return memory.get(id)!;
  try {
    const db = await openDb();
    const value = await new Promise<string | null>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => reject(req.error);
    });
    if (value) memory.set(id, value);
    return value;
  } catch {
    return null;
  }
}

/** Reduz a imagem para no máximo 1280 px e devolve um JPEG em data URL. */
function shrink(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new (window as any).Image();
    img.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = uri;
  });
}

export async function pickImage(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  if (Platform.OS === 'web') {
    const id = uid();
    await idbSet(id, await shrink(asset.uri));
    return `idb:${id}`;
  }
  try {
    const dir = new FileSystem.Directory(FileSystem.Paths.document, 'fotos');
    if (!dir.exists) dir.create();
    const dest = new FileSystem.File(dir, `${uid()}.jpg`);
    new FileSystem.File(asset.uri).copy(dest);
    return dest.uri;
  } catch {
    return asset.uri;
  }
}

export async function deleteImage(ref?: string) {
  if (!ref) return;
  try {
    if (ref.startsWith('idb:')) await idbSet(ref.slice(4), null);
    else if (Platform.OS !== 'web') new FileSystem.File(ref).delete();
  } catch {
    // Arquivo já não existe.
  }
}

/** Converte a referência guardada em algo que <Image> consegue mostrar. */
export function usePhoto(ref?: string): string | null {
  const direct = ref && !ref.startsWith('idb:') ? ref : null;
  const cached = ref?.startsWith('idb:') ? memory.get(ref.slice(4)) ?? null : null;
  const [uri, setUri] = useState<string | null>(direct ?? cached);
  useEffect(() => {
    let alive = true;
    if (!ref) setUri(null);
    else if (!ref.startsWith('idb:')) setUri(ref);
    else idbGet(ref.slice(4)).then((v) => alive && setUri(v));
    return () => {
      alive = false;
    };
  }, [ref]);
  return uri;
}
