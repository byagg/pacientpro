# 🔒 Oprava RLS Policies pre DEV MODE

## 🎯 Problém

V DEV MODE sa vyskytovali chyby:
- ❌ `401 Unauthorized` pri vytváraní appointmentov
- ❌ `patients query result: 0 patients`
- ❌ `new row violates row-level security policy for table "appointments"`

## 🔧 Riešenie

Aktualizovaný súbor `add-dev-mode-rls-policies.sql` obsahuje **OPRAVENÉ SELECT POLICY** pre appointments:

```sql
CREATE POLICY "Angiologists can view their own appointments"
  ON public.appointments FOR SELECT
  USING (
    auth.uid() = angiologist_id 
    OR auth.uid() = receiving_doctor_id
    OR angiologist_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
    OR receiving_doctor_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  );
```

## 📋 Inštrukcie

1. **Otvor Supabase Dashboard**:
   - Prejdi na: https://supabase.com/dashboard
   - Vyber projekt: `Angioplus`

2. **SQL Editor**:
   - Klikni na **SQL Editor** v ľavom menu
   - Vytvor nový query

3. **Skopíruj a spusti celý súbor**:
   ```bash
   # Skopíruj celý obsah súboru:
   add-dev-mode-rls-policies.sql
   ```

4. **Klikni na "RUN"** ▶️

## ✅ Výsledok

Po spustení budú fungovať:
- ✅ Vytváranie appointmentov (INSERT)
- ✅ Zobrazovanie pacientov (SELECT)
- ✅ Úprava appointmentov (UPDATE)
- ✅ Všetky RLS policies v DEV MODE

## 🆕 Nová funkcia: Profil

Pridaný nový tab **"Profil"** pre oboch lekárov:
- 👤 **Celé meno** (editovateľné)
- 📧 **Email** (read-only)
- 🏥 **Kód ambulancie** (editovateľné)
- 💰 **Bankový účet** (editovateľné, IBAN formát)

Prístup cez 4. tab "Profil" v dashboarde.

## 🚀 Poradie krokov

1. ✅ Spusť `supabase-complete-migration.sql` (hlavná migrácia) - JE UŽ HOTOVÉ
2. ✅ Spusť `create-dev-users.sql` (DEV užívatelia) - JE UŽ HOTOVÉ
3. 🔄 **TERAZ:** Spusť `add-dev-mode-rls-policies.sql` (RLS policies) - **TENTO KROK**
4. ✅ Push do Git - JE UŽ HOTOVÉ

---

**Poznámka:** Po spustení tohto scriptu budú všetky funkcie v DEV MODE plne funkčné! 🎉

