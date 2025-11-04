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

async function checkDatabase() {
  console.log('🔍 Checking database schema...\n');
  
  try {
    // Check profiles columns
    console.log('📋 Profiles table columns:');
    const profileColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'profiles'
      ORDER BY ordinal_position
    `;
    
    profileColumns.forEach(col => {
      const required = col.is_nullable === 'NO' ? '(required)' : '(optional)';
      console.log(`  - ${col.column_name}: ${col.data_type} ${required}`);
    });
    
    // Check for invoice-related columns specifically
    console.log('\n📋 Invoice-related columns in profiles:');
    const invoiceColumns = profileColumns.filter(col => 
      col.column_name.includes('invoice') || col.column_name === 'bank_account'
    );
    
    if (invoiceColumns.length === 0) {
      console.log('  ❌ No invoice columns found!');
    } else {
      invoiceColumns.forEach(col => {
        console.log(`  ✅ ${col.column_name}: ${col.data_type}`);
      });
    }
    
    // Check invoices table
    console.log('\n📋 Invoices table exists:');
    const invoicesTable = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'invoices'
    `;
    
    if (invoicesTable.length > 0) {
      console.log('  ✅ invoices table exists');
      
      const invoiceColumns = await sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'invoices'
        ORDER BY ordinal_position
      `;
      
      console.log('\n📋 Invoices table columns:');
      invoiceColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('  ❌ invoices table does NOT exist!');
    }
    
    // Check invoice_items table
    console.log('\n📋 Invoice_items table exists:');
    const invoiceItemsTable = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'invoice_items'
    `;
    
    if (invoiceItemsTable.length > 0) {
      console.log('  ✅ invoice_items table exists');
    } else {
      console.log('  ❌ invoice_items table does NOT exist!');
    }
    
    console.log('\n✅ Database check complete!\n');
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    process.exit(1);
  }
}

checkDatabase();

