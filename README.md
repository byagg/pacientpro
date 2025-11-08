# ANGIOPLUS - Systém pre správu rezervácií angiológov

Profesionálny systém pre správu rezervácií a manipulačných poplatkov angiológov v súlade s GDPR.

## 🎉 Supabase Backend

Aplikácia používa **Supabase** ako backend database a autentifikačný systém.

- **Database**: PostgreSQL cez Supabase
- **Auth**: Supabase Auth (JWT tokens)
- **Security**: Row Level Security (RLS)

## 🚀 Rýchly Štart

```bash
# Nainštalujte dependencies
npm install

# Spustite dev server
npm run dev

# Otvorte http://localhost:5173
```

## 📋 Funkcie

### Pre odosielajúcich lekárov
- ✅ Vytváranie rezervácií pacientov
- ✅ Sledovanie odoslaných pacientov
- ✅ Prehľad manipulačných poplatkov
- ✅ Správa faktúr

### Pre prijímajúcich lekárov
- ✅ Nastavenie ordinačných hodín
- ✅ Prijímanie pacientov
- ✅ Označovanie vyšetrených pacientov
- ✅ Vystavovanie faktúr

### Všeobecné
- ✅ Moderná responzívna UI (shadcn/ui)
- ✅ Bezpečná autentifikácia
- ✅ GDPR compliant (len čísla pacientov)
- ✅ Fakturácia s PDF preview
- ✅ Real-time aktualizácie

## 📁 Štruktúra Projektu

```
angi-booking-plus-1/
├── src/
│   ├── components/       # React komponenty
│   ├── hooks/           # Custom hooks pre API
│   ├── integrations/    
│   │   └── supabase/    # Supabase client
│   ├── lib/             # Utility funkcie
│   ├── pages/           # Stránky aplikácie
│   └── main.tsx         # Entry point
├── supabase/
│   └── migrations/      # Database migrácie
└── public/              # Statické súbory
```

## 🗄️ Databáza

### Tabuľky

- `profiles` - Používateľské profily (lekári)
- `appointments` - Rezervácie pacientov
- `commissions` - Manipulačné poplatky
- `invoices` - Faktúry
- `invoice_items` - Položky faktúr
- `office_hours` - Ordinačné hodiny

### Migrácie

Migrácie sú v `supabase/migrations/`. Pre aplikáciu:
1. Otvorte [Supabase Dashboard](https://rmvflqzxxbzhilobyitw.supabase.co)
2. Prejdite do SQL Editor
3. Spustite migrácie zo súborov v poradí

## 🔐 Autentifikácia

- **Registrácia**: Email + heslo
- **Prihlásenie**: Email + heslo
- **Session**: Automaticky spravované Supabase
- **Tokeny**: JWT tokens s automatickým refresh

## 🛠️ Technológie

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TanStack Query** - Data fetching
- **shadcn/ui** - UI komponenty
- **Tailwind CSS** - Styling

### Backend
- **Supabase** - Backend as a Service
- **PostgreSQL** - Database
- **Supabase Auth** - Autentifikácia
- **Row Level Security** - Bezpečnosť

## 📝 Dokumentácia

- [`SETUP.md`](SETUP.md) - Setup inštrukcie
- [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) - Supabase konfigurácia
- [`MIGRATION_COMPLETE.md`](MIGRATION_COMPLETE.md) - História migrácie

## 🧪 Testovanie

```bash
# Build aplikácie
npm run build

# Preview production build
npm run preview

# Lint kódu
npm run lint
```

## 🔒 Bezpečnosť

### GDPR Compliance
- Používanie len čísel pacientov (bez mien)
- Žiadne citlivé zdravotné údaje
- Bezpečné uloženie v Supabase

### Row Level Security (RLS)
Supabase RLS politiky zabezpečujú, že:
- Lekári vidia len svoje dáta
- Faktúry sú prístupné len príslušným stranám
- Ordinačné hodiny sú verejné (pre rezervácie)

## 📊 Fakturácia

- **Manipulačný poplatok**: 14.00 EUR / pacient
- **Faktúry**: Automatické generovanie
- **PDF Preview**: Náhľad pred tlačou
- **Tracking**: Sledovanie uhradených faktúr

## 🚧 Ďalší Vývoj

### Plánované funkcie
- [ ] Email notifikácie
- [ ] Export faktúr do PDF
- [ ] Štatistiky a reporty
- [ ] Mobilná aplikácia
- [ ] Integrácia s Google Calendar

## 💻 Vývoj

### Pre začiatok
```bash
# Clone repository
git clone <repo-url>
cd angi-booking-plus-1

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Štýl Kódu
- ESLint konfigurácia
- TypeScript strict mode
- Prettier formatting

## 📞 Podpora

Pri problémoch:
1. Skontrolujte [Supabase Dashboard](https://rmvflqzxxbzhilobyitw.supabase.co) → Logs
2. Skontrolujte browser konzolu (F12)
3. Overte, že migrácie boli aplikované
4. Skontrolujte RLS politiky

## 📄 Licencia

Private project - All rights reserved

## 👥 Autori

ANGIOPLUS Development Team

---

**Verzia**: 2.0.0 (Supabase)
**Posledná aktualizácia**: November 2025
