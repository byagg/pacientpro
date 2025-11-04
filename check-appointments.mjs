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

async function checkAppointments() {
  console.log('🔍 Checking appointments table schema...\n');
  
  try {
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'appointments'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Appointments table columns:');
    columns.forEach(col => {
      const required = col.is_nullable === 'NO' ? '(required)' : '(optional)';
      console.log(`  - ${col.column_name}: ${col.data_type} ${required}`);
    });
    
    // Check for user-related columns
    console.log('\n🔍 User-related columns:');
    const userCols = columns.filter(col => 
      col.column_name.includes('user') || 
      col.column_name.includes('doctor') ||
      col.column_name.includes('angiologist')
    );
    
    if (userCols.length === 0) {
      console.log('  ❌ No user-related columns found!');
    } else {
      userCols.forEach(col => {
        console.log(`  ✅ ${col.column_name}: ${col.data_type}`);
      });
    }
    
    // Sample appointment
    console.log('\n📋 Sample appointment:');
    const sample = await sql`
      SELECT * FROM public.appointments LIMIT 1
    `;
    
    if (sample.length > 0) {
      console.log(JSON.stringify(sample[0], null, 2));
    } else {
      console.log('  No appointments in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAppointments();

