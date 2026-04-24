export const ENV = {
  // App
  appId:        process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",

  // LLM — direct Gemini API (replaces forge.manus.im proxy)
  geminiApiKey:    process.env.GEMINI_API_KEY ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",

  // Google OAuth (replaces Manus OAUTH_SERVER_URL)
  googleClientId:     process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  appBaseUrl:         process.env.APP_BASE_URL ?? "http://localhost:3000",

  // External data — Yahoo Finance is now called directly (no API key needed)
  // rapidApiKey kept temporarily so existing code referencing ENV.rapidApiKey doesn't break
  rapidApiKey: "",

  // Notifications — Resend email (replaces Manus notifyOwner)
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  ownerEmail:   process.env.OWNER_EMAIL ?? "",

  // File storage — S3 or Cloudflare R2 (replaces Manus storage proxy)
  s3Bucket:          process.env.S3_BUCKET ?? "",
  s3Region:          process.env.AWS_REGION ?? "us-east-1",
  s3AccessKeyId:     process.env.AWS_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  s3Endpoint:        process.env.S3_ENDPOINT ?? "",

  // Legacy — kept so existing code compiles during migration, remove after cutover
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId:    process.env.OWNER_OPEN_ID ?? "",
  forgeApiUrl:    process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey:    process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
