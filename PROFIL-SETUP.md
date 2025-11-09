# 👤 Profil - Setup a Migrácia

## 📋 Prehľad

Pridaná nová sekcia **Profil** pre oboch lekárov s kontaktnými údajmi.

## 🆕 Nové polia v profiles tabuľke

- `address` - Adresa ambulancie/pracoviska
- `phone` - Telefónne číslo

## 🎯 Funkcie Profilu

**Zobrazené údaje:**
- 👤 **Celé meno** - editovateľné
- 📧 **Email** - read-only (nemožno zmeniť)
- 🏥 **Kód ambulancie** - editovateľné (používa sa v číslach pacientov, napr. AG-251109-1230)
- 📞 **Telefónne číslo** - editovateľné (+421 XXX XXX XXX)
- 📍 **Adresa** - editovateľné (adresa ambulancie alebo pracoviska)

**Kde sú bankové a daňové údaje?**
- Bankové údaje (IBAN, IČO, DIČ) sú v sekcii **"Nastavenia"** (odosielajúci lekár) alebo **"Faktúry"** (prijímajúci lekár)
- Tieto údaje sa používajú len pre faktúry, preto sú v príslušnej sekcii

## 🔧 Migrácia

### Krok 1: Pridaj stĺpce do databázy

1. Otvor **Supabase Dashboard**: https://supabase.com/dashboard
2. Vyber projekt **Angioplus**
3. Klikni na **SQL Editor**
4. Skopíruj a spusti:

```sql
-- Pridanie adresa a telefón do profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;
```

5. Klikni na **RUN** ▶️

### Krok 2: Hotovo!

Po spustení SQL scriptu budú v profile dostupné nové polia pre adresu a telefón.

## ✅ Výsledok

- ✅ Profil sekcia dostupná v 4. tabe dashboardu
- ✅ Editovanie adresy a telefónu
- ✅ Automatické ukladanie zmien
- ✅ Toast notifikácie o úspešnom uložení

## 🚀 Prístup

**Pre odosielajúceho lekára:**
Dashboard → Tab 4: "Profil"

**Pre prijímajúceho lekára:**
Dashboard → Tab 4: "Profil"

---

**Poznámka:** Tento script je súčasťou hlavného setup procesu. Spusti ho po `supabase-complete-migration.sql` a `create-dev-users.sql`.

