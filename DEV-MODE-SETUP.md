# 🔧 DEV MODE - Kompletný Setup

## ⚠️ KRITICKÉ: Pred použitím DEV MODE

DEV MODE používa **UUID formátované mock ID** BEZ auth session, takže potrebuje:
1. ✅ DEV profily v databáze
2. ✅ RLS policies upravené pre DEV UUID

---

## 📋 Setup v 3 krokoch:

### **KROK 1: Spustite hlavné migrácie** (ak ste to ešte neurobili)

1. Otvorte Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/rmvflqzxxbzhilobyitw/sql/new
   ```

2. Skopírujte obsah súboru:
   ```
   supabase-complete-migration.sql
   ```

3. Vložte a kliknite **RUN**

---

### **KROK 2: Vytvorte DEV používateľov**

1. V Supabase SQL Editore (nové query)

2. Skopírujte obsah súboru:
   ```
   create-dev-users.sql
   ```

3. Vložte a kliknite **RUN**

4. **Mali by ste vidieť výsledok:**
   ```
   id                                   | email                | full_name              | user_type
   -------------------------------------|----------------------|------------------------|----------
   00000000-0000-0000-0000-000000000001 | odosielajuci@dev.sk  | DEV Odosielajúci Lekár | sending
   00000000-0000-0000-0000-000000000002 | prijimajuci@dev.sk   | DEV Prijímajúci Lekár  | receiving
   ```

---

### **KROK 3: Upravte RLS policies pre DEV MODE** ⭐ NOVÉ

1. V Supabase SQL Editore (nové query)

2. Skopírujte obsah súboru:
   ```
   add-dev-mode-rls-policies.sql
   ```

3. Vložte a kliknite **RUN**

4. **Čo to robí:**
   - Upraví RLS policies aby akceptovali DEV UUID
   - Umožní INSERT, UPDATE, SELECT pre DEV účty
   - Normálne účty fungujú ako predtým (cez `auth.uid()`)

**Bez tohto kroku dostanete:**
```
Error 406: The result contains 0 rows
PGRST116: JSON object requested, multiple (or no) rows returned
```

---

## ✅ Teraz môžete používať DEV MODE!

1. Otvorte: `/dashboard`
2. Uvidíte oranžový DEV panel
3. Prepínajte medzi rolami
4. **Žiadne UUID chyby!** 🎉

---

## 🆔 DEV Mock ID:

### Odosielajúci lekár:
```
UUID: 00000000-0000-0000-0000-000000000001
Email: odosielajuci@dev.sk
Kód: OD
```

### Prijímajúci lekár:
```
UUID: 00000000-0000-0000-0000-000000000002
Email: prijimajuci@dev.sk
Kód: PJ
```

---

## 🐛 Riešenie problémov

### Stále vidíte UUID chyby?

1. **Overte že DEV profily existujú:**
   ```sql
   SELECT id, email, full_name, user_type 
   FROM public.profiles 
   WHERE id IN (
     '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000002'
   );
   ```

2. **Ak nevidíte 2 záznamy, spustite znovu:**
   ```
   create-dev-users.sql
   ```

3. **Vyčistite cache prehliadača:**
   ```
   Cmd+Shift+R (Mac) alebo Ctrl+Shift+F5 (Windows)
   ```

---

## 🔄 Vypnutie DEV MODE

Pre production deployment:

1. Otvorte `src/pages/Dashboard.tsx`
2. Zmeňte:
   ```typescript
   const DEV_MODE = false;
   ```
3. Commit a push

---

## 📝 Poznámky

- ✅ Mock ID sú teraz **UUID kompatibilné**
- ✅ Script používa `ON CONFLICT` - môžete ho spustiť viackrát
- ✅ RLS je dočasne vypnuté počas insertu
- ✅ Po vytvorení profily **ostanú v databáze** aj po vypnutí DEV MODE
- ⚠️ Pre production môžete tieto profily zmazať:
  ```sql
  DELETE FROM public.profiles 
  WHERE id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002'
  );
  ```

---

**Vytvorené:** 9. novembra 2025  
**Status:** UUID fix implementovaný  
**Verzia:** 1.1

