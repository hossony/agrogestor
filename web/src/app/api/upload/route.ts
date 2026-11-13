import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { HttpError, requireUser, route } from '@/lib/auth';

const IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
const VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE = 25 * 1024 * 1024;
const MAX_VIDEO = 250 * 1024 * 1024;
const blobReady = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
/** Sem Blob, só grava em disco em desenvolvimento (ou com LOCAL_UPLOADS=1 num servidor próprio). */
const localAllowed = () => process.env.NODE_ENV !== 'production' || process.env.LOCAL_UPLOADS === '1';

/** Diz às telas se o envio vai direto para o Vercel Blob ou para a pasta local (desenvolvimento). */
export const GET = route(async () => {
  await requireUser();
  return NextResponse.json({ mode: blobReady() ? 'blob' : 'local', maxImage: MAX_IMAGE, maxVideo: MAX_VIDEO });
});

export const POST = route(async (req: Request) => {
  const type = req.headers.get('content-type') ?? '';

  // Desenvolvimento sem Vercel Blob: grava em public/uploads.
  if (type.startsWith('multipart/form-data')) {
    await requireUser();
    if (blobReady() || !localAllowed()) throw new HttpError(503, 'O envio de imagens e vídeos ainda não foi configurado (conecte o Vercel Blob ao projeto).');
    const file = (await req.formData()).get('file');
    if (!(file instanceof File)) throw new HttpError(400, 'Arquivo ausente.');
    const isVideo = VIDEO.includes(file.type);
    if (!isVideo && !IMAGE.includes(file.type)) throw new HttpError(400, 'Formato não aceito.');
    if (file.size > (isVideo ? MAX_VIDEO : MAX_IMAGE)) throw new HttpError(413, 'Arquivo grande demais.');
    const ext = (file.type.split('/')[1] || 'bin').replace('quicktime', 'mov').replace('jpeg', 'jpg');
    const dir = join(process.cwd(), 'public', 'uploads');
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.${ext}`;
    await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ url: `/uploads/${name}` });
  }

  // Vercel Blob: o navegador envia o arquivo direto para o Blob, esta rota só autoriza.
  const json = (await req.json()) as HandleUploadBody;
  const result = await handleUpload({
    request: req,
    body: json,
    onBeforeGenerateToken: async (pathname) => {
      const me = await requireUser();
      const isVideo = /\.(mp4|webm|mov)$/i.test(pathname);
      return {
        allowedContentTypes: [...IMAGE, ...VIDEO],
        maximumSizeInBytes: isVideo ? MAX_VIDEO : MAX_IMAGE,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ userId: me.id }),
      };
    },
    onUploadCompleted: async () => {},
  });
  return NextResponse.json(result);
});
