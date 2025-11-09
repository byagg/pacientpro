# 🚨 FIX DATABASE ERRORS - DO THIS NOW

## Problem
Your application is showing these errors:
- ❌ `office_hours table does not exist`
- ❌ `commissions` returning 404 errors
- ❌ `profiles` missing columns (400 errors)
- ❌ `invoices` and `invoice_items` tables don't exist
- ❌ Authentication failures (400 errors)

## Root Cause
**Database migrations have NOT been applied to your Supabase database.**

## Solution (Choose One Method)

### ✅ METHOD 1: Supabase Dashboard (EASIEST - Recommended)

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/rmvflqzxxbzhilobyitw/sql/new
   - Or: Supabase Dashboard → Your Project → SQL Editor → New Query

2. **Copy Migration File**:
   - Open the file `apply-migrations.sql` in this folder
   - Select ALL content (Cmd+A)
   - Copy it (Cmd+C)

3. **Paste & Run**:
   - Paste into the SQL Editor
   - Click **RUN** button (or press Ctrl+Enter)
   - Wait for completion message

4. **Verify Success**:
   ```sql
   -- Run this query to verify tables exist:
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
   
   You should see:
   - ✅ appointments
   - ✅ commissions
   - ✅ invoice_items
   - ✅ invoices
   - ✅ office_hours
   - ✅ profiles

### 🔧 METHOD 2: Command Line (Alternative)

**Requirements**: You need `psql` installed and your Supabase database connection string.

1. **Get Connection String**:
   - Go to Supabase Dashboard → Project Settings → Database
   - Copy the "Connection String" (URI format)
   - It looks like: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

2. **Install psql** (if not installed):
   ```bash
   # macOS
   brew install libpq
   export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   ```

3. **Run Migration**:
   ```bash
   psql "YOUR_CONNECTION_STRING_HERE" -f apply-migrations.sql
   ```

## What Gets Created

### Tables Created:
1. **profiles** - User profiles with invoice data
2. **appointments** - Patient appointments
3. **commissions** - Fee tracking
4. **office_hours** - Doctor availability schedules
5. **invoices** - Invoice records
6. **invoice_items** - Invoice line items

### Columns Added to profiles:
- `bank_account` - Bank account number
- `password_hash` - Hashed password
- `user_type` - 'sending' or 'receiving' doctor
- `ambulance_code` - Clinic code
- `signature_image` - Digital signature (base64)
- `invoice_name` - Invoice billing name
- `invoice_address` - Invoice billing address
- `invoice_ico` - Company ID (IČO)
- `invoice_dic` - Tax ID (DIČ)

### Columns Added to appointments:
- `receiving_doctor_id` - Doctor who receives patient
- `examined_at` - Timestamp of examination
- `examined_by` - Doctor who examined patient

### Columns Added to office_hours:
- `break_start_time` - Lunch break start
- `break_end_time` - Lunch break end

## After Running Migrations

1. **Reload your browser** (Cmd+R or Ctrl+R)
2. **All errors should be gone** ✅
3. **Try logging in/registering again**

## Still Having Issues?

### Check if migrations ran successfully:
```sql
-- In Supabase SQL Editor, run:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;
```

You should see all the columns listed above.

### Check for error messages:
- Open browser DevTools (F12)
- Go to Console tab
- Look for any remaining SQL errors
- They should all be gone after migration

## Fixed Issues

✅ Added `autoComplete="email"` attribute to email input (fixes DOM warning)
✅ Added `autoComplete="name"` attribute to name input (better UX)

---

**Last Updated**: November 9, 2025
**Status**: Ready to run migrations

