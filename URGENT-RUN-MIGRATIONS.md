# 🚨 URGENTNÉ: SPUSTITE MIGRÁCIE TERAZ! 🚨

## ❌ AKTUÁLNY PROBLÉM:
Aplikácia dostává **SQL 400 chyby**, pretože v databáze chýbajú tabuľky `invoices` a `invoice_items`.

---

## ✅ RIEŠENIE - SPUSTITE MIGRÁCIE (3 spôsoby):

### 🔥 SPÔSOB 1: Terminál (NAJRÝCHLEJŠÍ)

Otvorte terminál v tomto priečinku a spustite:

```bash
psql "postgresql://neondb_owner:npg_UfF7YCvqgL0O@ep-empty-thunder-a258cltx.eu-central-1.aws.neon.tech/neondb?sslmode=require" -f apply-migrations.sql
```

**Očakávaný výstup:**
```
Timing is on.
CREATE TABLE
ALTER TABLE
CREATE TABLE
...
```

---

### 🔥 SPÔSOB 2: Použite script

```bash
chmod +x run-migration.sh
./run-migration.sh
```

---

### 🔥 SPÔSOB 3: Cez Neon Console (ak nemáte `psql`)

1. Otvorte: https://console.neon.tech/
2. Prihláste sa
3. Kliknite na **SQL Editor** (vľavo)
4. Otvorte súbor `apply-migrations.sql` v editore
5. **DÔLEŽITÉ:** Odstráňte prvý riadok `\timing on`
6. Skopírujte celý obsah
7. Vložte do SQL Editora
8. Kliknite **Run**

---

## 📋 ČO SA PRIDÁ DO DATABÁZY:

### ✅ Nové tabuľky:
1. **`invoices`** - Faktúry medzi lekármi
   - invoice_number (INV-YYMMDD-XXXX)
   - sending_doctor_id
   - receiving_doctor_id
   - total_amount
   - patient_count
   - issue_date
   - status (pending/paid/cancelled)
   - **paid_at** ← nový stĺpec!
   - notes
   - created_at

2. **`invoice_items`** - Položky faktúr (pacienti)
   - invoice_id
   - appointment_id
   - amount (14€)
   - created_at

### ✅ Nové stĺpce v `profiles`:
- `invoice_name` - Meno/Názov pre faktúru
- `invoice_address` - Adresa
- `invoice_ico` - IČO (8 číslic)
- `invoice_dic` - DIČ (10 číslic)

---

## 🎯 PO SPUSTENÍ MIGRÁCIÍ:

1. ✅ **Reloadnite stránku** (Cmd + R / Ctrl + R)
2. ✅ SQL 400 chyby zmiznú
3. ✅ Fakturačný systém začne fungovať
4. ✅ Uvidíte:
   - Fakturačné údaje odosielajúceho lekára (dropdown)
   - Fakturačné údaje prijímajúceho lekára
   - Zoznam vyšetrených pacientov
   - Kalkulačku faktúr
   - Vygenerované faktúry

---

## ⚠️ ČASTO KLADENÉ OTÁZKY:

**Q: Nemám `psql`, čo mám robiť?**  
A: Použite **SPÔSOB 3** - Neon Console SQL Editor

**Q: Dostanem chybu "relation already exists"?**  
A: To je OK! Migrácie sú idempotentné, preskočia existujúce tabuľky

**Q: Ako overím, že migrácie boli úspešné?**  
A: V Neon SQL Editor spustite:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('invoices', 'invoice_items');
```

Malo by vrátiť 2 riadky: `invoices` a `invoice_items`

---

## 📞 AK MÁTE PROBLÉM:

1. Skopírujte chybovú hlášku
2. Skúste znova s jedným z alternatívnych spôsobov
3. Overte, že connection string je správny (pozrite `.env` súbor)

---

# 🚀 SPUSTITE MIGRÁCIE TERAZ A APLIKÁCIA ZAČNE FUNGOVAŤ!

