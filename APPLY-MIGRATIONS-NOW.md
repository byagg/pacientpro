# 🚨 TREBA SPUSTIŤ MIGRÁCIE PRE FAKTURAČNÝ SYSTÉM

## Rýchle spustenie (macOS/Linux):

```bash
# 1. Skopírujte váš PostgreSQL connection string
# (ten istý, čo máte v .env ako VITE_DATABASE_URL)

# 2. Spustite migrácie:
psql "postgresql://neondb_owner:npg_UfF7YCvqgL0O@ep-empty-thunder-a258cltx.eu-central-1.aws.neon.tech/neondb?sslmode=require" -f apply-migrations.sql
```

## Alebo použite existujúci script:

```bash
chmod +x run-migration.sh
./run-migration.sh
```

## Čo sa pridá do databázy:

### Nové stĺpce v `profiles`:
- `invoice_name` - Meno/názov pre faktúry
- `invoice_address` - Adresa pre faktúry  
- `invoice_ico` - IČO (8 číslic)
- `invoice_dic` - DIČ (10 číslic)

### Nová tabuľka `invoices`:
- `id` - UUID
- `invoice_number` - Číslo faktúry (INV-YYMMDD-XXXX)
- `sending_doctor_id` - Odosielajúci lekár
- `receiving_doctor_id` - Prijímajúci lekár
- `total_amount` - Celková suma
- `patient_count` - Počet pacientov
- `issue_date` - Dátum vystavenia
- `status` - Stav (pending/paid/cancelled)
- `paid_at` - **✨ NOVÝ** Dátum úhrady
- `notes` - Poznámky
- `created_at` - Dátum vytvorenia

### Nová tabuľka `invoice_items`:
- `id` - UUID
- `invoice_id` - FK na invoices
- `appointment_id` - FK na appointments
- `amount` - Suma za pacienta (14€)
- `created_at` - Dátum vytvorenia

## Po spustení migrácií:

1. ✅ Reloadnite stránku v prehliadači
2. ✅ Chyby SQL 400 by mali zmiznúť
3. ✅ Fakturačný systém bude fungovať

## Overenie, že migrácie boli úspešné:

```sql
-- V Neon SQL Editor alebo psql:
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'invoices', 'invoice_items')
ORDER BY table_name, ordinal_position;
```

Malo by to zobraziť všetky stĺpce vrátane nového `paid_at` v tabuľke `invoices`.

