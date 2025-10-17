import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = ['JWT_SECRET', 'DATABASE_URL'] as const;

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const env = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET as string,
  databaseUrl: process.env.DATABASE_URL as string,
  wppHeadless: process.env.WPP_HEADLESS !== 'false',
  wppAutoClose: process.env.WPP_AUTO_CLOSE === 'true',
};
