#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function testQueries() {
  console.log('🧪 Testing all SQL queries...\n');
  
  const tests = [
    {
      name: 'Test 1: Fetch profiles',
      query: () => sql`SELECT id, full_name, email FROM public.profiles LIMIT 3`
    },
    {
      name: 'Test 2: Fetch appointments',
      query: () => sql`SELECT id, patient_number FROM public.appointments LIMIT 3`
    },
    {
      name: 'Test 3: Fetch office_hours',
      query: () => sql`SELECT id, day_of_week FROM public.office_hours LIMIT 3`
    },
    {
      name: 'Test 4: Fetch commissions',
      query: () => sql`SELECT id, amount FROM public.commissions LIMIT 3`
    },
    {
      name: 'Test 5: Fetch invoices',
      query: () => sql`SELECT id, invoice_number FROM public.invoices LIMIT 3`
    },
    {
      name: 'Test 6: Fetch invoice_items',
      query: () => sql`SELECT id, amount FROM public.invoice_items LIMIT 3`
    },
    {
      name: 'Test 7: Fetch invoices with JOIN (sending doctor)',
      query: () => sql`
        SELECT 
          i.id,
          i.invoice_number,
          p.full_name as receiving_doctor_name
        FROM public.invoices i
        LEFT JOIN public.profiles p ON i.receiving_doctor_id = p.id
        LIMIT 3
      `
    },
    {
      name: 'Test 8: Fetch invoices with JOIN (receiving doctor)',
      query: () => sql`
        SELECT 
          i.id,
          i.invoice_number,
          p.full_name as sending_doctor_name
        FROM public.invoices i
        LEFT JOIN public.profiles p ON i.sending_doctor_id = p.id
        LIMIT 3
      `
    },
    {
      name: 'Test 9: Fetch examined patients for invoice',
      query: () => sql`
        SELECT 
          a.id,
          a.patient_number,
          p.full_name as sending_doctor_name
        FROM public.appointments a
        LEFT JOIN public.profiles p ON a.angiologist_id = p.id
        WHERE a.examined_at IS NOT NULL
        LIMIT 3
      `
    },
    {
      name: 'Test 10: Check invoice columns',
      query: () => sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'invoices'
        ORDER BY ordinal_position
      `
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.query();
      console.log(`✅ ${test.name}`);
      console.log(`   Result: ${result.length} rows`);
      if (result.length > 0) {
        console.log(`   Sample:`, JSON.stringify(result[0], null, 2).substring(0, 150) + '...');
      }
      passed++;
    } catch (error) {
      console.error(`❌ ${test.name}`);
      console.error(`   Error: ${error.message}`);
      failed++;
    }
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(60));
}

testQueries().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

