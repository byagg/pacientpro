# ANGIOPLUS - Setup Guide

## 🎉 Aplikácia je napojená na Supabase

ANGIOPLUS teraz používa Supabase ako backend database a autentifikačný systém.

## 1. Supabase Credentials

Supabase údaje sú už nakonfigurované v aplikácii:
- **URL**: https://rmvflqzxxbzhilobyitw.supabase.co
- **Anon Key**: (už nastavený v kóde)

Pre viac informácií o Supabase konfigurácii, pozrite `SUPABASE_SETUP.md`.

## 2. Spustenie aplikácie

```bash
# Nainštalujte dependencies
npm install

# Spustite dev server
npm run dev
```

Aplikácia bude dostupná na `http://localhost:5173`

## 3. Overenie, že databáza funguje

Po spustení aplikácie:
1. Otvorte `/auth` stránku
2. Zaregistrujte sa s novým účtom
3. Prihláste sa
4. Ak registrácia a prihlásenie fungujú, Supabase je správne napojený!

## 4. Databázové migrácie

Migrácie sú uložené v `supabase/migrations/`. Pre aplikáciu:
1. Otvorte [Supabase Dashboard](https://rmvflqzxxbzhilobyitw.supabase.co)
2. Prejdite do SQL Editor
3. Spustite migrácie zo súborov v `supabase/migrations/`

## Troubleshooting

### Chyba pri autentifikácii
- Skontrolujte Supabase Dashboard → Authentication → Policies
- Uistite sa, že sú povolené email registrácie

### Chyba pri databázových dotazoch
- Skontrolujte Supabase Dashboard → Logs
- Skontrolujte Row Level Security (RLS) pravidlá
- Uistite sa, že ste spustili všetky migrácie

### Problém s pripojením
- Skontrolujte, či máte internetové pripojenie
- Skontrolujte, či je Supabase projekt aktívny
- Skontrolujte browser konzolu pre detailné chyby

