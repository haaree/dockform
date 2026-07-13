import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET || 'dockform-photos';

export const storageConfigured = !!(accountId && accessKeyId && secretAccessKey);

if (storageConfigured) {
  console.log(`[storage] R2 configured — account=${accountId} bucket=${bucket}`);
} else {
  console.log('[storage] R2 not configured — falling back to embedded base64');
}

const client = storageConfigured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    })
  : null;

// Uploads a data URL (e.g. "data:image/jpeg;base64,...") and returns a storage key.
export async function uploadDataUrl(dataUrl: string): Promise<string> {
  if (!client) throw new Error('Object storage is not configured');
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid data URL');
  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  const ext = mimeType.split('/')[1] || 'bin';
  const key = `${randomUUID()}.${ext}`;
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: mimeType }));
  return key;
}

export async function getObjectBuffer(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!client) return null;
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) return null;
    return { buffer: Buffer.from(bytes), contentType: result.ContentType || 'application/octet-stream' };
  } catch (err: any) {
    console.error('[storage] getObjectBuffer failed:', bucket, key, err?.name, err?.message, err?.$metadata?.httpStatusCode);
    return null;
  }
}

export async function getObjectAsDataUrl(key: string): Promise<string | null> {
  const obj = await getObjectBuffer(key);
  if (!obj) return null;
  return `data:${obj.contentType};base64,${obj.buffer.toString('base64')}`;
}
