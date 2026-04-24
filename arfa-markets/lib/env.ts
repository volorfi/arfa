/**
 * Centralised env accessors for the ported /server services.
 *
 * The legacy monolith had a giant `ENV` object at /server/_core/env.ts
 * that every service imported from. Rather than refactor each service
 * to call `process.env.X` directly, we re-export the same shape here —
 * source-code parity keeps diffs reviewable.
 *
 * Only the fields the ported services actually reference are included.
 * Add here (not inside a service) if a new env var needs to land.
 */

export const ENV = {
  // Core
  isProduction: process.env.NODE_ENV === "production",
  appBaseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",

  // LLM providers (legacy agent pipeline)
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",

  // Email (Resend) + owner notifications
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  ownerEmail: process.env.OWNER_EMAIL ?? "",

  // Market-data API keys used by a handful of services
  rapidApiKey: process.env.RAPIDAPI_KEY ?? "",

  // Object storage (currently unused but kept for parity)
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  awsRegion: process.env.AWS_REGION ?? "us-east-1",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
};
