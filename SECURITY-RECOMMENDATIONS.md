# Bezpečnostné odporúčania pre ANGIOPLUS

## ⚠️ AKTUÁLNY STAV

Aplikácia v súčasnosti používa **základný bezpečnostný model** vhodný pre **prototypovanie a vývoj**.  
Pre **produkčné nasadenie** je potrebné implementovať nižšie uvedené odporúčania.

---

## 🔒 KRITICKÉ BEZPEČNOSTNÉ ODPORÚČANIA

### 1. Hashovanie hesiel - **VYSOKÁ PRIORITA**

#### Aktuálny stav: ❌
```typescript
// src/lib/auth.ts
const hashedPassword = await hashPassword(password);

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  // ...
}
```

**Problém:**
- Používa sa `SHA-256` bez **soli (salt)**
- SHA-256 je príliš rýchly → útočník môže vyskúšať milióny hesiel za sekundu
- Žiadna ochrana proti **rainbow table** útokom

#### Odporúčané riešenie: ✅

**Variant A: bcrypt (odporúčané)**
```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

```typescript
import bcrypt from 'bcryptjs';

// Pri registrácii
const SALT_ROUNDS = 12; // Cost factor (10-12 je dobré)
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

// Pri prihlásení
const isValid = await bcrypt.compare(password, user.password_hash);
```

**Variant B: Argon2id (najlepšie, ale zložitejšie)**
```bash
npm install argon2
```

```typescript
import argon2 from 'argon2';

// Pri registrácii
const hashedPassword = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4
});

// Pri prihlásení
const isValid = await argon2.verify(user.password_hash, password);
```

**Benefit:**
- ✅ Automatická generácia soli
- ✅ Pomalé hashovanie → ochrana proti brute-force
- ✅ Odolnosť proti rainbow tables
- ✅ Priemyselný štandard

---

### 2. Server-side API backend - **VYSOKÁ PRIORITA**

#### Aktuálny stav: ❌
```typescript
// src/integrations/neon/client.ts
export const sql = neon(import.meta.env.VITE_DATABASE_URL);

// Používa sa PRIAMO v browseri:
// src/lib/auth.ts, src/hooks/*.ts
const users = await sql`SELECT * FROM profiles WHERE email = ${email}`;
```

**Problém:**
- `DATABASE_URL` je **viditeľné** v browser developer tools
- **Žiadna autorizácia** - každý vie upraviť SQL queries
- **SQL injection** riziko pri nevhodnom použití
- **Neon databáza** je prístupná z internetu

#### Odporúčané riešenie: ✅

**A. Vytvorte backend API**

```
angi-booking-plus/
├── frontend/           (existujúci Vite/React)
└── backend/            (nový)
    ├── src/
    │   ├── routes/
    │   │   ├── auth.ts
    │   │   ├── appointments.ts
    │   │   ├── invoices.ts
    │   │   └── profiles.ts
    │   ├── middleware/
    │   │   └── auth.ts
    │   └── index.ts
    ├── .env              (DATABASE_URL tu)
    └── package.json
```

**Backend příklad (Express.js):**
```typescript
// backend/src/routes/auth.ts
import express from 'express';
import { sql } from '../db';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // ✅ SQL query na serveri, nie v browseri
  const users = await sql`
    SELECT * FROM profiles WHERE email = ${email}
  `;
  
  if (!users[0] || !await bcrypt.compare(password, users[0].password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // ✅ Vytvorenie JWT tokenu
  const token = jwt.sign({ userId: users[0].id }, process.env.JWT_SECRET);
  res.json({ token, user: { ...users[0], password_hash: undefined } });
});

export default router;
```

**Frontend príklad:**
```typescript
// src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL; // http://localhost:3000/api

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!response.ok) throw new Error('Login failed');
  return response.json();
}
```

**Benefit:**
- ✅ `DATABASE_URL` je len na serveri
- ✅ Autorizácia pomocou JWT/sessions
- ✅ Možnosť pridať rate limiting
- ✅ Validácia vstupu na serveri
- ✅ Audit logging

**B. Alternatíva: Neon Serverless Functions**

Ak nechcete vlastný server, použite:
- **Vercel Serverless Functions** + Neon
- **Netlify Functions** + Neon
- **Cloudflare Workers** + Neon

---

### 3. Session management - **STREDNÁ PRIORITA**

#### Aktuálny stav: ❌
```typescript
// src/lib/auth.ts
const SESSION_KEY = 'angiplus_session';

// Ukladanie do localStorage
localStorage.setItem(SESSION_KEY, JSON.stringify(session));

// Žiadna validácia na serveri
const session = JSON.parse(localStorage.getItem(SESSION_KEY));
```

**Problém:**
- localStorage je zraniteľný na **XSS útoky**
- **Žiadna server-side validácia** → útočník môže upraviť `user_type`
- Session token sa **nikdy nevymaže** na serveri
- **Žiadne expirovanie** tokenov

#### Odporúčané riešenie: ✅

**A. httpOnly Cookies + Server Sessions**
```typescript
// Backend
router.post('/login', async (req, res) => {
  // ... overenie hesla ...
  
  const sessionId = crypto.randomUUID();
  
  // Uloženie do Redis/databázy
  await redis.set(`session:${sessionId}`, JSON.stringify({
    userId: user.id,
    userType: user.user_type,
    createdAt: new Date()
  }), 'EX', 3600 * 24 * 7); // 7 dní
  
  // httpOnly cookie → nie je prístupné z JavaScriptu
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: true, // len HTTPS
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dní
  });
  
  res.json({ user: { ...user, password_hash: undefined } });
});

// Middleware na validáciu
async function requireAuth(req, res, next) {
  const sessionId = req.cookies.sessionId;
  if (!sessionId) return res.status(401).json({ error: 'Unauthorized' });
  
  const session = await redis.get(`session:${sessionId}`);
  if (!session) return res.status(401).json({ error: 'Session expired' });
  
  req.user = JSON.parse(session);
  next();
}
```

**B. JWT Tokens (jednoduchšie, ale menej bezpečné)**
```typescript
// Backend
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId: user.id, userType: user.user_type },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Middleware
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

**Benefit:**
- ✅ httpOnly cookies → ochrana proti XSS
- ✅ Server-side validácia → nemožno podvrhnúť `user_type`
- ✅ Expirácia tokenov
- ✅ Možnosť revokácie (logout)

---

### 4. Dodatočné bezpečnostné opatrenia

#### A. Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minút
  max: 5, // max 5 pokusov
  message: 'Príliš veľa pokusov o prihlásenie, skúste neskôr'
});

router.post('/login', loginLimiter, async (req, res) => {
  // ...
});
```

#### B. HTTPS
```typescript
// Vyžadovať HTTPS v produkcii
if (process.env.NODE_ENV === 'production' && !req.secure) {
  return res.redirect(`https://${req.headers.host}${req.url}`);
}
```

#### C. CORS
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL, // https://your-domain.com
  credentials: true
}));
```

#### D. Input Validation
```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100)
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    // ...
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input' });
  }
});
```

---

## 📋 IMPLEMENTAČNÝ PLÁN

### Fáza 1: Kritické opravy (1-2 týždne)
1. ✅ **Opravené:** Privilege escalation (user_type)
2. ⏳ Implementovať bcrypt pre hashovanie hesiel
3. ⏳ Vytvoriť základný Express.js backend
4. ⏳ Migrovať auth endpointy na backend

### Fáza 2: Session management (1 týždeň)
1. ⏳ Implementovať httpOnly cookies
2. ⏳ Pridať JWT alebo session storage (Redis)
3. ⏳ Implementovať logout endpoint

### Fáza 3: Dodatočné zabezpečenie (1 týždeň)
1. ⏳ Rate limiting
2. ⏳ HTTPS redirects
3. ⏳ CORS konfigurácia
4. ⏳ Audit logging

### Fáza 4: Backend migrácia (2-3 týždne)
1. ⏳ Migrovať všetky DB queries na backend
2. ⏳ Implementovať autorizačné middleware
3. ⏳ Napísať testy
4. ⏳ Deploy na produkciu

---

## 🎯 ZÁVER

**Aktuálny stav aplikácie:**
- ✅ Vhodná pre **development/prototyp**
- ❌ **Nevhodná pre produkčné nasadenie**

**Pred nasadením do produkcie:**
1. Implementujte **bcrypt/Argon2** hashovanie
2. Vytvorte **backend API**
3. Používajte **httpOnly cookies** alebo **JWT**
4. Pridajte **rate limiting**
5. Zabezpečte **HTTPS**

**Odhadovaný čas implementácie:** 4-6 týždňov (plný working time)

---

**Vytvorené:** 4. november 2024  
**Autor:** AI Assistant  
**Verzia:** 1.0

