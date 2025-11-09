# 🚨 URGENTNE: Oprava databázy - SPUSTITE TENTO SCRIPT!

## Problém
Vaša aplikácia **nefunguje** kvôli chýbajúcim migráciám v Supabase.

### Chyby ktoré vidíte:
- ❌ 500 Error pri registrácii
- ❌ 400 Error pri prihlásení  
- ❌ 406 Error pri načítavaní profilov
- ❌ DOM warning o autocomplete (fixnuté, ale staré build)
- ❌ Kalendár nefunguje (žiadne dostupné termíny)

## ✅ RIEŠENIE (5 minút)

### KROK 1: Otvorte Supabase SQL Editor

Kliknite na tento link:
```
https://supabase.com/dashboard/project/rmvflqzxxbzhilobyitw/sql/new
```

Alebo:
1. Prejdite na https://supabase.com/dashboard
2. Vyberte projekt `rmvflqzxxbzhilobyitw`
3. Kliknite na "SQL Editor" v ľavom menu
4. Kliknite na "New query"

### KROK 2: Skopírujte a spustite migration script

1. **Otvorte súbor:** `supabase-complete-migration.sql` (v tomto priečinku)
2. **Skopírujte CELÝ obsah** (Cmd+A, Cmd+C)
3. **Vložte do SQL Editora** (Cmd+V)
4. **Kliknite RUN** (alebo stlačte Cmd+Enter / Ctrl+Enter)

### KROK 3: Overte že script prešiel úspešne

V SQL Editore by ste mali vidieť:
```
Success. No rows returned
```

Alebo spustite tento overovací query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Mali by ste vidieť:
- ✅ appointments
- ✅ commissions
- ✅ invoice_items
- ✅ invoices
- ✅ office_hours
- ✅ profiles

### KROK 4: Test registrácie

1. Otvorte aplikáciu: https://pacientpro.netlify.app/auth
2. Kliknite "Registrovať sa"
3. Vyplňte:
   - **Typ používateľa:** Prijímajúci lekár
   - **Celé meno:** Test Doktor
   - **Email:** test@test.sk
   - **Heslo:** test123
4. Kliknite "Registrovať sa"

**Malo by fungovať bez chýb!** ✅

## Čo tento script robí?

### 1. Vytvorí správnu štruktúru databázy pre Supabase Auth
- Tabuľka `profiles` prepojená na `auth.users`
- Automatický trigger pri registrácii nového používateľa
- Správne RLS (Row Level Security) policies

### 2. Vytvorí všetky potrebné tabuľky
- `profiles` - používateľské profily
- `appointments` - rezervácie pacientov
- `commissions` - manipulačné poplatky
- `office_hours` - ordinačné hodiny
- `invoices` + `invoice_items` - fakturácia

### 3. Nastaví bezpečnostné pravidlá (RLS)
- Používatelia vidia len svoje dáta
- Prijímajúci lekári môžu spravovať svoje ordinačné hodiny
- Odosielajúci lekári môžu vytvárať rezervácie

### 4. Vytvorí indexy pre výkon
- Rýchlejšie vyhľadávanie
- Optimalizované dotazy

## Po spustení migrácií

### ✅ Čo bude fungovať:

1. **Registrácia a prihlásenie**
   - Nové účty sa vytvoria správne
   - Automaticky sa vytvorí profil
   - JWT tokeny budú fungovať

2. **Kalendár (po nastavení hodín)**
   - Prijímajúci lekár nastaví ordinačné hodiny
   - Odosielajúci lekár uvidí zelené dni

3. **Rezervácie**
   - Vytváranie nových rezervácií
   - Sledovanie pacientov
   - Označenie vyšetrených

4. **Fakturácia**
   - Vytváranie faktúr
   - PDF náhľad
   - Sledovanie úhrad

### 🎯 Ďalšie kroky po migrácii:

1. **Zaregistrujte prijímajúceho lekára**
   ```
   Typ: Prijímajúci lekár
   Meno: MUDr. Jana Nováková
   Email: novakova@test.sk
   Heslo: test123
   ```

2. **Prihláste sa a nastavte ordinačné hodiny**
   - Dashboard → Ordinačné hodiny
   - Pridajte pracovné dni (Po-Pia)
   - Nastavte časy (napr. 08:00 - 16:00)

3. **Zaregistrujte odosielajúceho lekára**
   ```
   Typ: Odosielajúci lekár
   Meno: MUDr. Peter Horák
   Email: horak@test.sk
   Heslo: test123
   ```

4. **Vytvorte prvú rezerváciu**
   - Dashboard → Nová rezervácia
   - Vyberte zelený deň v kalendári
   - Vyberte dostupný slot
   - Vyplňte typ procedúry

## Overenie že všetko funguje

```bash
# Spustite diagnostický script:
./test-calendar-simple.sh
```

Mali by ste vidieť:
```
✅ Tabuľka office_hours EXISTUJE
📈 Počet aktívnych ordinačných hodín: 0 (alebo viac)
✅ KALENDÁR BY MAL FUNGOVAŤ!
```

## Riešenie problémov

### Ak stále vidíte chyby:

1. **Vymažte cache prehliadača**
   ```
   Cmd+Shift+R (Mac) alebo Ctrl+Shift+F5 (Windows)
   ```

2. **Skontrolujte Supabase Logs**
   ```
   https://supabase.com/dashboard/project/rmvflqzxxbzhilobyitw/logs/explorer
   ```

3. **Overte že Netlify má správne environment variables**
   ```
   Netlify Dashboard → Site configuration → Environment variables
   
   Malo by obsahovať:
   VITE_SUPABASE_URL=https://rmvflqzxxbzhilobyitw.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   ```

4. **Spustite znovu diagnostic script**
   ```bash
   ./test-calendar-simple.sh
   ```

## Dôležité poznámky

⚠️ **NEPOUŽÍVAJTE** `apply-migrations.sql` - ten je pre Neon database, nie Supabase!

✅ **POUŽÍVAJTE** `supabase-complete-migration.sql` - tento je správny pre Supabase Auth

## Záverečný checklist

Po spustení migrácií skontrolujte:

- [ ] SQL script prešiel bez chýb
- [ ] Tabuľky existujú (spustite overovací query)
- [ ] Registrácia funguje (vytvorte test účet)
- [ ] Prihlásenie funguje
- [ ] Dashboard sa načíta bez chýb
- [ ] Žiadne 400/500 chyby v konzole
- [ ] DOM warning je preč (po Netlify redeploy)

---

**Vytvorené:** 9. novembra 2025  
**Urgencia:** VYSOKÁ - spustite čo najskôr!  
**Trvanie:** ~5 minút

