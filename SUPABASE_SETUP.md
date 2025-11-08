# ANGIOPLUS - Supabase Setup Guide

## Aplikácia je teraz napojená na Supabase! 🎉

Django backend bol kompletne odstránený a aplikácia teraz používa Supabase ako backend.

## Supabase Credentials

Vaše Supabase údaje sú už nakonfigurované v aplikácii:

- **URL**: https://rmvflqzxxbzhilobyitw.supabase.co
- **Anon Key**: (už nastavený v kóde)
- **Service Role Key**: (uložený - nepoužívajte v klientskom kóde!)

## Environment Variables (voliteľné)

Ak chcete použiť environment variables namiesto hardcoded hodnôt, vytvorte `.env` súbor:

```bash
VITE_SUPABASE_URL=https://rmvflqzxxbzhilobyitw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdmZscXp4eGJ6aGlsb2J5aXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MTU4MDEsImV4cCI6MjA2NDI5MTgwMX0.3WWno9IcYz_0o2QyhkzlYTRuyyggNBx86J0eCr5tlds
```

## Čo bolo zmenené

### Odstránené

- ✅ Celý `django-backend/` priečinok
- ✅ Django API integrácia (`src/lib/django-api.ts`)
- ✅ Django Auth komponenta (`src/components/DjangoAuth.tsx`)
- ✅ Stripe Payment komponenta (`src/components/StripePayment.tsx`)
- ✅ Django Demo stránka (`src/pages/DjangoDemo.tsx`)
- ✅ Neon database client (`src/integrations/neon/`)
- ✅ Django dokumentácia (API_DOCUMENTATION.md, DJANGO_INTEGRATION_COMPLETE.md)

### Pridané/Upravené

- ✅ Supabase client (`src/integrations/supabase/client.ts`)
- ✅ Supabase Auth v `src/lib/auth.ts`
- ✅ Všetky hooks prepísané na Supabase:
  - `use-profile.ts`
  - `use-appointments.ts`
  - `use-invoices.ts`
  - `use-commissions.ts`
  - `use-received-patients.ts`
  - `use-office-hours.ts`
  - `use-available-slots.ts`

## Autentifikácia

Aplikácia teraz používa **Supabase Auth** namiesto vlastného Django systému:

- Email/heslo prihlásenie
- JWT tokeny spravované Supabase
- Automatické session manažment
- Row Level Security (RLS) na strane databázy

## Databázové migrácie

Vaša Supabase databáza už má migrácie v priečinku `supabase/migrations/`. 

Pre aplikáciu migrácií:
1. Otvorte Supabase Dashboard
2. Prejdite do SQL Editor
3. Spustite migrácie z `supabase/migrations/` priečinka

## Spustenie aplikácie

```bash
# Nainštalujte dependencies
npm install

# Spustite dev server
npm run dev

# Otvorte browser na http://localhost:5173
```

## Testovanie

1. Otvorte `/auth` stránku
2. Zaregistrujte nový účet
3. Prihláste sa
4. Testujte funkcie aplikácie

## Dôležité

- **Supabase RLS** - Uistite sa, že máte nastavené správne Row Level Security pravidlá
- **API Keys** - Anon key je bezpečný pre použitie v klientskom kóde
- **Service Role Key** - Nikdy nepoužívajte v klientskom kóde! Len pre server-side operácie

## Support

Ak máte problémy:
1. Skontrolujte Supabase Dashboard → Logs
2. Skontrolujte browser konzolu pre chyby
3. Skontrolujte Network tab v DevTools

## Databázová štruktúra

Vaša databáza obsahuje tieto tabuľky:

- `profiles` - používateľské profily
- `appointments` - rezervácie pacientov
- `commissions` - manipulačné poplatky
- `invoices` - faktúry
- `invoice_items` - položky faktúr
- `office_hours` - ordinačné hodiny

Všetky dotazy sú teraz vykonávané cez Supabase JS Client s automatickým session managementom.

