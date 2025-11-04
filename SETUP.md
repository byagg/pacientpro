# ANGIOPLUS - Setup Guide

## 1. Nastavenie databázy

### Ako získať Neon Database URL:

1. Otvorte [Neon Console](https://console.neon.tech/)
2. Vyberte váš projekt
3. Kliknite na "Connection Details" alebo "Connection String"
4. Skopírujte connection string

### Formát connection stringu:
```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

## 2. Nastavenie environment variables

### Vytvorte `.env` súbor v root priečinku projektu:

```bash
cp .env.example .env
```

### Upravte `.env` súbor a vložte váš Neon connection string:

```env
VITE_DATABASE_URL=postgresql://your-user:your-password@your-host.neon.tech/your-database?sslmode=require
```

## 3. Spustenie aplikácie

```bash
npm install
npm run dev
```

Aplikácia bude dostupná na `http://localhost:8080`

## 4. Overenie, že databáza funguje

Po spustení aplikácie:
1. Otvorte `/auth` stránku
2. Zaregistrujte sa s novým účtom
3. Ak sa registrácia podarí, databáza funguje správne!

## Troubleshooting

### Chyba: "Missing DATABASE_URL environment variable"
- Skontrolujte, či máte `.env` súbor v root priečinku
- Skontrolujte, či je `VITE_DATABASE_URL` správne nastavený
- Po zmene `.env` reštartujte dev server

### Chyba pri pripojení k databáze
- Skontrolujte, či je connection string správny
- Skontrolujte, či máte internetové pripojenie
- Skontrolujte, či je Neon databáza aktívna

