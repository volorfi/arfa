// S3-compatible object storage (AWS S3 or Cloudflare R2).
// Toggle R2 by setting S3_ENDPOINT to your R2 endpoint; otherwise AWS S3 is used.

import { PutObjectCommand, S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

type StorageConfig = {
  client: S3Client;
  bucket: string;
  publicBaseUrl: string | null;
};

let _config: StorageConfig | null = null;

function getStorageConfig(): StorageConfig {
  if (_config) return _config;

  const bucket = ENV.s3Bucket;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured");
  }
  if (!ENV.awsAccessKeyId || !ENV.awsSecretAccessKey) {
    throw new Error(
      "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be configured"
    );
  }

  const endpoint = ENV.s3Endpoint ? ENV.s3Endpoint.replace(/\/+$/, "") : undefined;

  const client = new S3Client({
    region: ENV.awsRegion || "auto",
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId: ENV.awsAccessKeyId,
      secretAccessKey: ENV.awsSecretAccessKey,
    },
  });

  const publicBaseUrl = endpoint
    ? `${endpoint}/${bucket}`
    : `https://${bucket}.s3.${ENV.awsRegion || "us-east-1"}.amazonaws.com`;

  _config = { client, bucket, publicBaseUrl };
  return _config;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const segmentStart = relKey.lastIndexOf("/");
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1 || lastDot <= segmentStart) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function toBody(
  data: Buffer | Uint8Array | string
): Buffer | Uint8Array | string {
  return data;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { client, bucket, publicBaseUrl } = getStorageConfig();
  const key = appendHashSuffix(normalizeKey(relKey));

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: toBody(data),
      ContentType: contentType,
    })
  );

  return {
    key,
    url: `${publicBaseUrl}/${key}`,
  };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const { client, bucket } = getStorageConfig();
  const key = normalizeKey(relKey);

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 3600 }
  );

  return { key, url };
}
