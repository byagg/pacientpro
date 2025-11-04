#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read and parse .env file manually
const envPath = join(__dirname, '.env');
try {
  const envFile = readFileSync(envPath, 'utf8');
  const lines = envFile.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      process.env[key] = value;
    }
  }
} catch (error) {
  console.error('Error reading .env file:', error.message);
}

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your .env file');
  process.exit(1);
}

console.log('🔧 Fixing invoices with missing sending_doctor_id...\n');

const sql = neon(DATABASE_URL);

try {
  // Read the SQL file
  const sqlContent = readFileSync(join(__dirname, 'fix-invoice-sending-doctors.sql'), 'utf8');
  
  // Remove comments and split by semicolon
  const cleanedSql = sqlContent
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
  
  const statements = cleanedSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
  
  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
    console.log(`Statement preview: ${statement.substring(0, 100)}...`);
    
    try {
      // Use sql.query() for direct SQL execution (not tagged templates)
      const result = await sql.query(statement);
      console.log(`✅ Success!`);
      
      // If it's a SELECT query, show results
      if (statement.trim().toUpperCase().startsWith('SELECT')) {
        console.log(`\nResults:`);
        console.table(result.rows);
      } else {
        console.log(`Rows affected: ${result.rowCount || 'N/A'}`);
      }
    } catch (error) {
      console.error(`❌ Error executing statement ${i + 1}:`);
      console.error(error.message);
      console.error('\nStatement was:');
      console.error(statement);
      throw error;
    }
  }
  
  console.log('\n✅ All invoices fixed successfully!');
  console.log('\n💡 Refresh your browser to see the updated invoice data.');
  
} catch (error) {
  console.error('\n❌ Failed to fix invoices:', error.message);
  console.error('\nFull error:', error);
  process.exit(1);
}

