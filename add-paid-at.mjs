#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables manually
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    }
  } catch (error) {
    console.error('Warning: Could not load .env file:', error.message);
  }
}

loadEnv();

const DATABASE_URL = process.env.VITE_DATABASE_URL;
const sql = neon(DATABASE_URL);

async function addPaidAtColumn() {
  console.log('🚀 Adding paid_at column to invoices table...\n');
  
  try {
    // Check if column already exists
    const checkColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'invoices' 
      AND column_name = 'paid_at'
    `;
    
    if (checkColumn.length > 0) {
      console.log('✅ paid_at column already exists, nothing to do!');
      return;
    }
    
    // Add the column
    await sql`
      ALTER TABLE public.invoices
      ADD COLUMN paid_at TIMESTAMPTZ
    `;
    
    console.log('✅ Successfully added paid_at column to invoices table!');
    
    // Verify
    const verify = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'paid_at'
    `;
    
    if (verify.length > 0) {
      console.log(`✅ Verified: ${verify[0].column_name} (${verify[0].data_type})`);
    }
    
    console.log('\n🎉 Database updated! Reload your application now.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

addPaidAtColumn();

