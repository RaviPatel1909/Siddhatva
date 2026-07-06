import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  isProd: process.env.NODE_ENV === 'production',

  // Auth. Secrets MUST be set in production; the dev fallbacks are obvious.
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-only-access-secret-change-me',
  accessTtlSeconds: Number(process.env.ACCESS_TTL_SECONDS ?? 15 * 60), // 15 minutes
  refreshTtlDays: Number(process.env.REFRESH_TTL_DAYS ?? 7),
};
