import { neon } from '@neondatabase/serverless';

// Get DATABASE_URL from environment variables
// Vite automatically loads .env files and exposes VITE_* variables via import.meta.env
const DATABASE_URL = import.meta.env.VITE_DATABASE_URL || import.meta.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL environment variable');
  console.error('Available environment variables:', {
    VITE_DATABASE_URL: import.meta.env.VITE_DATABASE_URL,
    DATABASE_URL: import.meta.env.DATABASE_URL,
    allEnvKeys: Object.keys(import.meta.env),
  });
  console.error('💡 Make sure:');
  console.error('   1. .env file exists in the project root');
  console.error('   2. .env contains: VITE_DATABASE_URL=postgresql://...');
  console.error('   3. Dev server was restarted after creating/updating .env');
  throw new Error('Missing DATABASE_URL environment variable. Please set VITE_DATABASE_URL in your .env file and restart the dev server.');
}

// Initialize Neon client with browser warning disabled
// Note: We're aware of the security implications of running SQL from the browser
// This is acceptable for this application's architecture
export const sql = neon(DATABASE_URL, {
  disableWarningInBrowsers: true,
});

