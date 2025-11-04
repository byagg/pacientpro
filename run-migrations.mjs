#!/usr/bin/env node

/**
 * Script to run database migrations using Neon serverless driver
 * Usage: node run-migrations.mjs
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
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

if (!DATABASE_URL) {
  console.error('❌ Error: VITE_DATABASE_URL not found in .env file');
  console.error('   Make sure you have a .env file with VITE_DATABASE_URL set');
  process.exit(1);
}

console.log('🔌 Connecting to database...');

const sql = neon(DATABASE_URL);

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'apply-migrations.sql');
    let migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Remove \timing command (psql specific)
    migrationSQL = migrationSQL.replace(/\\timing on\n?/g, '');
    
    // Split by semicolons and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments and empty lines
      if (statement.trim().startsWith('--') || statement.trim() === ';') {
        continue;
      }
      
      // Get a preview of the statement (first 80 chars)
      const preview = statement.substring(0, 80).replace(/\s+/g, ' ').trim();
      
      try {
        await sql.unsafe(statement);
        successCount++;
        console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
      } catch (error) {
        // Check if error is about existing objects (which is OK)
        if (
          error.message.includes('already exists') ||
          error.message.includes('already created')
        ) {
          skipCount++;
          console.log(`⏭️  [${i + 1}/${statements.length}] ${preview}... (already exists, skipping)`);
        } else {
          errorCount++;
          console.error(`\n❌ Error executing statement ${i + 1}:`);
          console.error(`Statement: ${preview}...`);
          console.error(`Error: ${error.message}\n`);
          // Continue with other statements
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed!');
    console.log(`   - Successfully executed: ${successCount} statements`);
    console.log(`   - Skipped (already exists): ${skipCount} statements`);
    if (errorCount > 0) {
      console.log(`   - Errors: ${errorCount} statements`);
    }
    console.log('='.repeat(60));
    console.log('\n🎉 Database is ready! Reload your application now.\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
