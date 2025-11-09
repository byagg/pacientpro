# 🔧 DEV MODE - Návod na použitie

## Čo je DEV MODE?

DEV MODE je **dočasný vývojársky režim**, ktorý vám umožňuje:
- ✅ **Bypassnúť prihlasovanie** - žiadne heslá, žiadna registrácia
- ✅ **Prepínať medzi rolami** - jedným klikom medzi odosielajúcim a prijímajúcim lekárom
- ✅ **Testovať obe časti aplikácie** naraz bez odhlásenia
- ✅ **Používať mock dáta** - automaticky vytvorení testovacie používatelia

---

## 🚀 Ako aktivovať DEV MODE

### Je už aktivovaný! 🎉

DEV MODE je momentálne **zapnutý** v kóde:

```typescript
// V súbore: src/pages/Dashboard.tsx
const DEV_MODE = true;  // ← Aktivovaný
```

---

## 🎨 Ako používať DEV MODE

### 1. Otvorte Dashboard

Prejdite na:
```
http://localhost:5173/dashboard
```

Alebo po deployi:
```
https://pacientpro.netlify.app/dashboard
```

### 2. Uvidíte oranžový DEV panel

Na vrchu stránky je oranžový panel:

```
🔧 DEV MODE | Prepnúť rolu: [Odosielajúci] [Prijímajúci]
```

### 3. Prepnite rolu

Kliknite na tlačidlo podľa toho, čo chcete testovať:

**👨‍⚕️ Odosielajúci lekár:**
- Vytváranie rezervácií
- Sledovanie pacientov
- Správa faktúr (odoslané)
- Nastavenia profilu

**👨‍⚕️ Prijímajúci lekár:**
- Nastavenie ordinačných hodín
- Prijímanie pacientov
- Označenie vyšetrených
- Vystavovanie faktúr

### 4. Prepínajte kedykoľvek

Môžete prepínať **bez obnovenia stránky**. Dashboard sa automaticky aktualizuje.

---

## 📋 Mock používatelia v DEV MODE

### Odosielajúci lekár:
```
ID: dev-sending-001
Email: odosielajuci@dev.sk
Meno: DEV Odosielajúci Lekár
Kód ambulancie: OD
```

### Prijímajúci lekár:
```
ID: dev-receiving-001
Email: prijimajuci@dev.sk
Meno: DEV Prijímajúci Lekár
Kód ambulancie: PJ
```

---

## 🎯 Vizuálne indikátory DEV MODE

### 1. **Oranžový banner** na vrchu stránky
- Jasne viditeľný
- S prepínačmi rolí
- Ikona `<Code />` 

### 2. **DEV badge** vedľa názvu ANGIOPLUS
- Malý oranžový badge
- Text: "DEV"

### 3. **Upravené tlačidlo logout**
- Namiesto "Odhlásiť sa" → "Zavrieť DEV"
- Presmeruje na /auth ale neodhlási

---

## ⚠️ Dôležité poznámky

### DEV MODE vs Produkcia

**DEV MODE (aktuálne):**
- ❌ Žiadna autentifikácia
- ❌ Mock používatelia
- ❌ Nemôžete sa skutočne prihlásiť
- ✅ Rýchle testovanie UI/UX

**Produkčný režim:**
- ✅ Plná autentifikácia cez Supabase
- ✅ Skutočné používateľské účty
- ✅ Bezpečnosť a RLS
- ✅ Databázové operácie

### Databázové operácie v DEV MODE

**⚠️ UPOZORNENIE:** 

Aj v DEV MODE sa **SKUTOČNE zapisuje** do databázy!

- Vytváranie rezervácií → **zapíše sa do DB**
- Nastavenie ordinačných hodín → **zapíše sa do DB**
- Vytváranie faktúr → **zapíše sa do DB**

**Mock ID** (`dev-sending-001`, `dev-receiving-001`) sa použijú ako skutočné ID.

---

## 🔄 Vypnutie DEV MODE

### Pre lokálny vývoj:

V súbore `src/pages/Dashboard.tsx` zmeňte:

```typescript
const DEV_MODE = false;  // ← Vypnutý
```

### Pre production deployment:

**MUSÍTE** vypnúť pred nasadením do produkcie!

```bash
# 1. Otvorte Dashboard.tsx
# 2. Nastavte DEV_MODE = false
# 3. Commit a push

git add src/pages/Dashboard.tsx
git commit -m "feat: vypnutý DEV MODE pre production"
git push origin main
```

---

## 🛠️ Technické detaily

### Ako funguje prepínanie rolí?

```typescript
const [devUserType, setDevUserType] = useState<'sending' | 'receiving'>('sending');

useEffect(() => {
  if (DEV_MODE) {
    const mockUser: User = {
      id: devUserType === 'sending' ? 'dev-sending-001' : 'dev-receiving-001',
      email: devUserType === 'sending' ? 'odosielajuci@dev.sk' : 'prijimajuci@dev.sk',
      full_name: devUserType === 'sending' ? 'DEV Odosielajúci Lekár' : 'DEV Prijímajúci Lekár',
      user_type: devUserType,
      ambulance_code: devUserType === 'sending' ? 'OD' : 'PJ',
    };
    setUser(mockUser);
  }
}, [devUserType]);
```

Pri kliknutí na tlačidlo:
1. `setDevUserType('receiving')` alebo `setDevUserType('sending')`
2. `useEffect` detekuje zmenu
3. Vytvorí nového mock používateľa
4. `setUser(mockUser)` aktualizuje stav
5. Dashboard sa re-renderuje s novou rolou

---

## 📸 Screenshots (očakávaný vzhľad)

### DEV Panel (oranžový banner):
```
🔧 DEV MODE | Prepnúť rolu: [Odosielajúci✓] [Prijímajúci]
```

### Header s DEV badge:
```
📅 ANGIOPLUS [DEV] .......................... [Zavrieť DEV]
```

### Dashboard titulok:
```
Dashboard [🟢 Odosielajúci lekár]
Spravujte rezervácie a prijímajte manipulačné poplatky
```

---

## 🚨 Pred production deploymentom

### ✅ Checklist:

- [ ] `DEV_MODE = false` v `Dashboard.tsx`
- [ ] Overiť že prihlasovanie funguje
- [ ] Overiť že RLS policies sú aktívne
- [ ] Spustené migrácie v Supabase
- [ ] Testovať registráciu nového používateľa
- [ ] Testovať prihlásenie existujúceho používateľa
- [ ] Overiť že DEV panel je skrytý

---

## 💡 Tipy na testovanie

### Scenár 1: Kompletný flow rezervácie

1. **Prepnite na Prijímajúci** lekár
2. Nastavte ordinačné hodiny (napr. Po-Pia 8:00-16:00)
3. **Prepnite na Odosielajúci** lekár
4. Vytvorte novú rezerváciu (mali by sa zobraziť zelené dni)
5. **Prepnite späť na Prijímajúci**
6. Označte pacienta ako vyšetreného
7. Vytvorte faktúru

### Scenár 2: Testovanie UI/UX

1. Prepnite medzi rolami niekoľkokrát
2. Overte že všetky komponenty sa načítavajú správne
3. Skontrolujte responzívnosť na mobile (F12 → Device Toolbar)
4. Testujte všetky tabu a sekcie

---

## 🐛 Riešenie problémov

### "DEV panel sa nezobrazuje"

- Overte že `DEV_MODE = true`
- Vyčistite cache (Cmd+Shift+R / Ctrl+Shift+F5)
- Skontrolujte konzolu pre chyby (F12)

### "Prepínanie nefunguje"

- Skontrolujte network tab - môžu byť API chyby
- Overte že máte spustené migrácie
- Pozrite sa do konzoly pre chyby v `useEffect`

### "Databázové operácie zlyhávajú"

- Mock ID neexistujú v databáze
- Potrebujete vytvoriť skutočných používateľov s týmito ID
- Alebo použiť skutočné ID z databázy namiesto mock ID

---

**Vytvorené:** 9. novembra 2025  
**Status:** DEV MODE aktívny  
**Pre production:** Vypnúť pred deploymentom!

