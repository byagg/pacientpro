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
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
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

    // Insert user into database
    const [user] = await sql`
      INSERT INTO profiles (id, email, full_name, password_hash, user_type)
      VALUES (${userId}, ${email}, ${fullName}, ${hashedPassword}, ${userType || null})
      RETURNING id, email, full_name, created_at, user_type
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

  async signIn(email: string, password: string, userType?: 'sending' | 'receiving'): Promise<Session> {
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

    // Update user_type if provided and different from stored
    if (userType && userType !== user.user_type) {
      await sql`
        UPDATE profiles
        SET user_type = ${userType}
        WHERE id = ${user.id}
      `;
      user.user_type = userType;
    }

    // Create session
    const token = crypto.randomUUID();
    const session: Session = {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
        user_type: (user.user_type || userType) as 'sending' | 'receiving' | undefined,
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
