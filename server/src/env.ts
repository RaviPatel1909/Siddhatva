import 'dotenv/config';

const port = Number(process.env.PORT ?? 4000);

export const env = {
  port,
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  isProd: process.env.NODE_ENV === 'production',
  // Public origin of this API, used to build local dev image URLs.
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${port}`,

  // Auth. Secrets MUST be set in production; the dev fallbacks are obvious.
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-only-access-secret-change-me',
  accessTtlSeconds: Number(process.env.ACCESS_TTL_SECONDS ?? 15 * 60), // 15 minutes
  refreshTtlDays: Number(process.env.REFRESH_TTL_DAYS ?? 7),

  // Cloudinary. When all three are set the real image store is used; otherwise
  // the app falls back to a local dev image store (see lib/imageStore.ts).
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },

  // Razorpay (test mode). When key id + secret are set the real gateway is used;
  // otherwise payments run in mock mode (see lib/payments.ts). Only keyId is ever
  // sent to the browser.
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },
};
