// Custom authentication system using Neon database
import { sql } from "@/integrations/neon/client";

export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  user_type?: 'sending' | 'receiving'; // odosielajúci lekár / prijímajúci lekár
}

export interface Session {
  user: User;
  token: string;
}

// Hash password using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  // Check if crypto.subtle is available (requires secure context: HTTPS or localhost)
  if (!crypto.subtle) {
    const currentUrl = window.location.href;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const errorMsg = isLocalhost
      ? 'Web Crypto API nie je dostupná. Skontrolujte nastavenia prehliadača.'
      : `Web Crypto API vyžaduje bezpečný kontext (HTTPS alebo localhost).\n` +
        `Aktuálne pristupujete cez: ${currentUrl}\n` +
        `Prosím, použite: http://localhost:8080${window.location.pathname}`;
    throw new Error(errorMsg);
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Chyba pri hashovaní hesla. Skontrolujte, či používate HTTPS alebo localhost.');
  }
}

// Simple session management with localStorage
const SESSION_KEY = 'angiplus_session';

export const auth = {
  async signUp(email: string, password: string, fullName: string, userType?: 'sending' | 'receiving'): Promise<Session> {
    // Check if user already exists
    const existing = await sql`
      SELECT id FROM profiles WHERE email = ${email}
    `;
    if (existing.length > 0) {
      throw new Error('Tento email je už registrovaný');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomUUID();

    // Generate ambulance code from initials
    const names = fullName.trim().split(/\s+/);
    let ambulanceCode = '';
    
    if (names.length >= 2) {
      // First letter of first name + first letter of last name
      ambulanceCode = (names[0][0] + names[names.length - 1][0]).toUpperCase();
    } else {
      // If only one name, use first two letters
      ambulanceCode = (names[0][0] + (names[0][1] || names[0][0])).toUpperCase();
    }

    // Insert user into database
    const [user] = await sql`
      INSERT INTO profiles (id, email, full_name, password_hash, user_type, ambulance_code)
      VALUES (${userId}, ${email}, ${fullName}, ${hashedPassword}, ${userType || null}, ${ambulanceCode})
      RETURNING id, email, full_name, created_at, user_type, ambulance_code
    `;

    // Create session
    const token = crypto.randomUUID();
    const session: Session = {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
        user_type: userType,
      },
      token,
    };

    // Store session
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async signIn(email: string, password: string): Promise<Session> {
    // Get user from database
    const users = await sql`
      SELECT id, email, full_name, created_at, password_hash, user_type
      FROM profiles
      WHERE email = ${email}
    `;

    const user = users[0];
    if (!user || !user.password_hash) {
      throw new Error('Nesprávny email alebo heslo');
    }

    // Verify password
    const hashedPassword = await hashPassword(password);
    if (hashedPassword !== user.password_hash) {
      throw new Error('Nesprávny email alebo heslo');
    }

    // SECURITY FIX: Never allow changing user_type from login form
    // This would allow privilege escalation attacks
    // user_type is ALWAYS taken from database and set only during registration

    // Create session
    const token = crypto.randomUUID();
    const session: Session = {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
        user_type: user.user_type, // ALWAYS from database, never from user input
      },
      token,
    };

    // Store session
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  signOut(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  getSession(): Session | null {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (!sessionStr) return null;
    try {
      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  },

  getCurrentUser(): User | null {
    const session = this.getSession();
    return session?.user || null;
  },
};
