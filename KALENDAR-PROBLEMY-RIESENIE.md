# 🗓️ Riešenie problémov s kalendárom pre odosielajúcich lekárov

## Problém
Odosielajúci lekár **nemôže vybrať žiadny dátum v kalendári** pri vytváraní rezervácie.

## Príčiny

### 1. ⚠️ Databáza nemá potrebné tabuľky
Tabuľka `office_hours` neexistuje, pretože migrácie neboli spustené.

**Dôkaz:**
- Chyba v konzole: `office_hours table does not exist`
- Status 400/404 na Supabase API calls

### 2. 📅 Žiadne ordinačné hodiny nie sú nastavené
Aj keby tabuľka existovala, prijímajúci lekári ešte nenastavili svoje ordinačné hodiny.

**Dôsledok:**
- Kalendár nemá žiadne dostupné dátumy
- Všetky dni sú disabled (sivé)
- Odosielajúci lekár nemôže vytvoriť rezerváciu

## ✅ Riešenie (v poradí)

### KROK 1: Spustite databázové migrácie

**Potrebné vykonať TERAZ:**

1. **Otvorte Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/rmvflqzxxbzhilobyitw/sql/new
   ```

2. **Skopírujte obsah súboru:**
   ```
   apply-migrations.sql
   ```

3. **Vložte do SQL Editora a kliknite RUN**

**Čo to vytvorí:**
- ✅ Tabuľku `office_hours`
- ✅ Tabuľku `commissions`
- ✅ Tabuľku `invoices` a `invoice_items`
- ✅ Všetky chýbajúce stĺpce v existujúcich tabuľkách

### KROK 2: Nastavte ordinačné hodiny (Prijímajúci lekár)

Po spustení migrácií, **prijímajúci lekár** musí:

1. **Prihlásiť sa** ako prijímajúci lekár
2. **Prejsť na Dashboard** → sekcia "Ordinačné hodiny"
3. **Pridať ordinačné hodiny** pre každý pracovný deň:
   - Deň v týždni (Pondelok - Piatok)
   - Čas začiatku (napr. 08:00)
   - Čas konca (napr. 16:00)
   - Dĺžka slotu (30 min)
   - Voliteľne: Prestávka (12:00 - 13:00)

**Príklad nastavenia:**
```
Pondelok:  08:00 - 16:00 (prestávka 12:00-13:00)
Utorok:    08:00 - 16:00 (prestávka 12:00-13:00)
Streda:    08:00 - 14:00
Štvrtok:   08:00 - 16:00 (prestávka 12:00-13:00)
Piatok:    08:00 - 14:00
```

### KROK 3: Overenie (Odosielajúci lekár)

Po nastavení ordinačných hodín:

1. **Prihláste sa** ako odosielajúci lekár
2. **Prejdite na Dashboard** → Nová rezervácia
3. **Kalendár by mal zobrazovať:**
   - ✅ Zelené dni = dostupné termíny
   - ⚫ Sivé dni = žiadne termíny / minulosť
4. **Po výbere dňa:**
   - Dropdown "Dostupný slot" zobrazí konkrétne časy
   - Príklad: "08:00 - Dr. Nováková", "08:30 - Dr. Nováková", atď.

## 🔧 Vylepšenia ktoré som pridal

### 1. Varovanie pre prázdny kalendár
Ak nie sú dostupné žiadne termíny, zobrazí sa:
```
⚠️ Žiadne dostupné termíny
Momentálne nie sú dostupné žiadne termíny na rezerváciu. 
Prijímajúci lekári ešte nenastavili svoje ordinačné hodiny.
```

### 2. Autocomplete atribúty (už opravené)
- ✅ `autoComplete="email"` na email input
- ✅ `autoComplete="name"` na full name input
- ✅ `autoComplete="current-password"` / `"new-password"` na heslo

**Poznámka:** Ak stále vidíte DOM warning, vymažte cache prehliadača (Cmd+Shift+R / Ctrl+Shift+F5)

## 🎯 Ako funguje kalendár (technicky)

### Pre Odosielajúceho lekára:
1. **Načíta `office_hours`** všetkých prijímajúcích lekárov
2. **Vypočíta dostupné dni** na najbližších 90 dní
3. **Pre vybraný deň generuje sloty:**
   - Kontroluje deň v týždni (0-6)
   - Rozdelí ordinačné hodiny podľa `slot_duration_minutes`
   - Vynechá prestávky (`break_start_time` - `break_end_time`)
   - Zobrazí len budúce časy

### Pre Prijímajúceho lekára:
1. **Používa `datetime-local` input**
2. Môže zadať **ľubovoľný čas** (nie je viazaný na ordinačné hodiny)
3. Používa tlačidlo "Teraz" pre aktuálny čas

## 📊 SQL query pre overenie ordinačných hodín

Ak chcete skontrolovať nastavené ordinačné hodiny:

```sql
SELECT 
  p.full_name,
  oh.day_of_week,
  oh.start_time,
  oh.end_time,
  oh.slot_duration_minutes,
  oh.break_start_time,
  oh.break_end_time,
  oh.is_active
FROM office_hours oh
JOIN profiles p ON p.id = oh.receiving_doctor_id
WHERE oh.is_active = true
ORDER BY p.full_name, oh.day_of_week, oh.start_time;
```

## 🚀 Deployment na Netlify

Po oprave kódu (autocomplete):

1. **Commit a push zmeny:**
   ```bash
   git add .
   git commit -m "fix: pridané autocomplete atribúty a varovanie pre prázdny kalendár"
   git push
   ```

2. **Netlify automaticky re-deployuje**

3. **Po deploy:**
   - Vymažte cache (Cmd+Shift+R)
   - DOM warnings zmizne
   - Kalendár ukáže varovanie ak nie sú hodiny

## ⚡ Rýchly checklist

- [ ] Spustené migrácie v Supabase SQL Editor
- [ ] Overené že tabuľky existujú (`office_hours`, `commissions`, `invoices`)
- [ ] Prijímajúci lekár nastavil ordinačné hodiny
- [ ] Odosielajúci lekár vidí zelené dni v kalendári
- [ ] Commit + push zmeny do Git
- [ ] Netlify deployment dokončený
- [ ] Cache vymazaná (Cmd+Shift+R)
- [ ] Testovanie vytvorenia rezervácie

## 📞 Ak problém pretrváva

1. **Skontrolujte Supabase Dashboard → Logs**
2. **Browser DevTools (F12) → Console** - hľadajte chyby
3. **Browser DevTools → Network** - skontrolujte Supabase API calls
4. **SQL Editor** - spustite overovací query vyššie

---

**Vytvorené:** 9. novembra 2025  
**Status:** Migrácie pripravené, kód opravený, čaká sa na spustenie migrácií

