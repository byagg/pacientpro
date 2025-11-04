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

async function addAmbulanceCode() {
  console.log('🚀 Adding ambulance_code column to profiles table...\n');
  
  try {
    // Check if column already exists
    const checkColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'ambulance_code'
    `;
    
    if (checkColumn.length > 0) {
      console.log('✅ ambulance_code column already exists');
    } else {
      // Add the column
      await sql`
        ALTER TABLE public.profiles
        ADD COLUMN ambulance_code TEXT
      `;
      
      console.log('✅ Successfully added ambulance_code column');
    }
    
    // Update existing profiles with generated ambulance codes
    console.log('\n📝 Generating ambulance codes for existing profiles...');
    
    const profiles = await sql`
      SELECT id, full_name, ambulance_code
      FROM public.profiles
    `;
    
    for (const profile of profiles) {
      if (!profile.ambulance_code) {
        // Generate code from initials
        const names = profile.full_name.trim().split(/\s+/);
        let code = '';
        
        // Take first letter of first name and last name
        if (names.length >= 2) {
          code = (names[0][0] + names[names.length - 1][0]).toUpperCase();
        } else {
          code = (names[0][0] + names[0][0]).toUpperCase();
        }
        
        await sql`
          UPDATE public.profiles
          SET ambulance_code = ${code}
          WHERE id = ${profile.id}
        `;
        
        console.log(`  ✅ ${profile.full_name} → ${code}`);
      }
    }
    
    console.log('\n🎉 Ambulance codes setup complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

addAmbulanceCode();

