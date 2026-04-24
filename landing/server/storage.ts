/**
 * storage.ts — File storage via AWS S3 or Cloudflare R2
 * MIGRATION: was Manus storage proxy
 * NOW: uses AWS S3 SDK (works with any S3-compatible API including R2)
 *
 * For AWS S3:    set S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 * For R2:        set S3_BUCKET, S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com,
 *                AWS_ACCESS_KEY_ID (R2 token), AWS_SECRET_ACCESS_KEY (R2 token), AWS_REGION=auto
 */
import { ENV } from "./_core/env";

function getS3Client() {
  // Lazy-load @aws-sdk/client-s3 so the app starts even if not installed yet
  try {
    const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
    return { S3Client, PutObjectCommand, GetObjectCommand, getSignedUrl };
  } catch {
    throw new Error("@aws-sdk/client-s3 not installed. Run: pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner");
  }
}

function client() {
  const { S3Client } = getS3Client();
  const cfg: Record<string, unknown> = {
    region:      ENV.s3Region || "us-east-1",
    credentials: { accessKeyId: ENV.s3AccessKeyId, secretAccessKey: ENV.s3SecretAccessKey },
  };
  if (ENV.s3Endpoint) cfg.endpoint = ENV.s3Endpoint;
  return new S3Client(cfg);
}

function normalizeKey(key: string): string {
  return key.replace(/^\/+/, "");
}

function appendHash(key: string): string {
  const hash = crypto.randomUUID().replace(/-/g,"").slice(0,8);
  const dot  = key.lastIndexOf(".");
  return dot === -1 ? `${key}_${hash}` : `${key.slice(0,dot)}_${hash}${key.slice(dot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { S3Client, PutObjectCommand } = getS3Client();
  const key = appendHash(normalizeKey(relKey));
  const c   = client();
  await c.send(new PutObjectCommand({
    Bucket:      ENV.s3Bucket,
    Key:         key,
    Body:        typeof data === "string" ? Buffer.from(data) : data,
    ContentType: contentType,
  }));
  const url = ENV.s3Endpoint
    ? `${ENV.s3Endpoint.replace(/\/$/,"")}/${ENV.s3Bucket}/${key}`
    : `https://${ENV.s3Bucket}.s3.${ENV.s3Region}.amazonaws.com/${key}`;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const { S3Client, GetObjectCommand, getSignedUrl } = getS3Client();
  const key = normalizeKey(relKey);
  const url = await getSignedUrl(client(), new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }), { expiresIn: 3600 });
  return { key, url };
}
