# 🚀 Spustenie databázových migrácií

## Problém
Aplikácia hlási chyby:
- `column a.examined_at does not exist`
- `relation "public.office_hours" does not exist`

## Riešenie
Musíte spustiť migračný skript v Neon SQL Editore.

---

## Krok po kroku:

### 1️⃣ Otvorte Neon Console
Prejdite na: https://console.neon.tech/

### 2️⃣ Vyberte váš projekt
Kliknite na projekt ANGIOPLUS

### 3️⃣ Otvorte SQL Editor
V ľavom menu kliknite na **SQL Editor**

### 4️⃣ Skopírujte migračný skript
Otvorte súbor `apply-migrations.sql` v tejto zložke a skopírujte celý obsah.

**Alebo** použite tento príkaz na zobrazenie obsahu:
```bash
cat apply-migrations.sql
```

### 5️⃣ Vložte do SQL Editora
Vložte skopírovaný SQL skript do SQL Editora v Neon Console

### 6️⃣ Spustite skript
Kliknite na tlačidlo **Run** (alebo stlačte Cmd/Ctrl + Enter)

### 7️⃣ Overte výsledok
Skript by mal vytvoriť:
- ✅ Stĺpce v tabuľke `appointments`: `receiving_doctor_id`, `examined_at`, `examined_by`
- ✅ Tabuľku `office_hours`
- ✅ Indexy pre rýchlejšie dotazy

---

## Alternatíva: Použite Neon CLI

Ak máte nainštalované Neon CLI:

```bash
# Prihlásenie
neon auth

# Spustenie migrácie
neon sql-file apply-migrations.sql --project-id YOUR_PROJECT_ID
```

---

## Overenie
Po spustení migrácií overte, že všetko funguje:

```sql
-- Overte stĺpce v tabuľke appointments
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'appointments';

-- Overte existenciu tabuľky office_hours
SELECT * FROM public.office_hours LIMIT 1;
```

---

## ✅ Hotovo!
Po úspešnom spustení migrácií obnovte aplikáciu v prehliadači (F5).

Odoslaní pacienti a ordinančné hodiny by mali fungovať správne.

