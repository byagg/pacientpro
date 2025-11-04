import { neon } from '@neondatabase/serverless';

const DATABASE_URL = import.meta.env.VITE_DATABASE_URL || import.meta.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Environment variables:', {
    VITE_DATABASE_URL: import.meta.env.VITE_DATABASE_URL,
    DATABASE_URL: import.meta.env.DATABASE_URL,
    all: import.meta.env,
  });
  throw new Error('Missing DATABASE_URL environment variable. Please set VITE_DATABASE_URL in your .env file.');
}

export const sql = neon(DATABASE_URL);

