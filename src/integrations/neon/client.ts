import { neon } from '@neondatabase/serverless';

// Get DATABASE_URL from environment variables
// Vite automatically loads .env files and exposes VITE_* variables via import.meta.env
const DATABASE_URL = import.meta.env.VITE_DATABASE_URL || import.meta.env.DATABASE_URL;

// Debug: Log all env variables in development
if (import.meta.env.DEV) {
  console.log('🔍 Environment check:', {
    hasVITE_DATABASE_URL: !!import.meta.env.VITE_DATABASE_URL,
    hasDATABASE_URL: !!import.meta.env.DATABASE_URL,
    VITE_DATABASE_URL_length: import.meta.env.VITE_DATABASE_URL?.length || 0,
    allEnvKeys: Object.keys(import.meta.env).filter(key => key.includes('DATABASE') || key.includes('VITE')),
  });
}

if (!DATABASE_URL) {
  const isProduction = import.meta.env.PROD;
  const errorMessage = isProduction
    ? 'Missing DATABASE_URL environment variable. In production, you must set VITE_DATABASE_URL as an environment variable on your hosting platform (Netlify, Vercel, etc.), not in .env file.'
    : 'Missing DATABASE_URL environment variable. Please set VITE_DATABASE_URL in your .env file and restart the dev server.';
  
  console.error('❌ Missing DATABASE_URL environment variable');
  console.error('Available environment variables:', {
    VITE_DATABASE_URL: import.meta.env.VITE_DATABASE_URL ? '***SET***' : 'undefined',
    DATABASE_URL: import.meta.env.DATABASE_URL ? '***SET***' : 'undefined',
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
  });
  
  if (isProduction) {
    console.error('💡 Production mode detected:');
    console.error('   1. Set VITE_DATABASE_URL as an environment variable on your hosting platform');
    console.error('   2. For Netlify: Site Settings → Environment Variables');
    console.error('   3. For Vercel: Project Settings → Environment Variables');
    console.error('   4. After setting, redeploy your application');
  } else {
    console.error('💡 Development mode:');
    console.error('   1. .env file exists in the project root');
    console.error('   2. .env contains: VITE_DATABASE_URL=postgresql://... (without quotes)');
    console.error('   3. Dev server was restarted after creating/updating .env');
    console.error('   4. .env file is in the project root (same directory as package.json)');
  }
  
  throw new Error(errorMessage);
}

// Initialize Neon client with browser warning disabled
// Note: We're aware of the security implications of running SQL from the browser
// This is acceptable for this application's architecture
export const sql = neon(DATABASE_URL, {
  disableWarningInBrowsers: true,
});

