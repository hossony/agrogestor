import { NextResponse } from 'next/server';
import changelog from '@/data/changelog.json';

/** Notas de atualização do site e do app (público; o app também lê daqui). */
export async function GET() {
  return NextResponse.json({ latest: changelog[0]?.version ?? '', entries: changelog }, { headers: { 'cache-control': 'public, max-age=300' } });
}
