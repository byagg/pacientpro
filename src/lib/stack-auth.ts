// Stack Auth integration
// Project ID: a9017771-7e63-4708-a25e-f76ee5a98940
// JWKS: https://api.stack-auth.com/api/v1/projects/a9017771-7e63-4708-a25e-f76ee5a98940/.well-known/jwks.json

const STACK_AUTH_PROJECT_ID = 'a9017771-7e63-4708-a25e-f76ee5a98940';
const STACK_AUTH_API_URL = `https://api.stack-auth.com/api/v1/projects/${STACK_AUTH_PROJECT_ID}`;
const JWKS_URL = `${STACK_AUTH_API_URL}/.well-known/jwks.json`;

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

const SESSION_KEY = 'angiplus_session';

export const stackAuth = {
  async signUp(email: string, password: string, fullName: string, userType?: 'sending' | 'receiving'): Promise<Session> {
    const response = await fetch(`${STACK_AUTH_API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        displayName: fullName,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Registrácia zlyhala' }));
      throw new Error(error.message || 'Tento email je už registrovaný');
    }

    const data = await response.json();
    
    // Get user profile
    const userResponse = await fetch(`${STACK_AUTH_API_URL}/users/${data.userId}`, {
      headers: {
        'Authorization': `Bearer ${data.accessToken}`,
      },
    });

    const userData = await userResponse.json();

    const session: Session = {
      user: {
        id: data.userId || userData.id,
        email: userData.email || email,
        full_name: userData.displayName || fullName,
        created_at: new Date().toISOString(),
        user_type: userType,
      },
      token: data.accessToken || data.token,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async signIn(email: string, password: string, userType?: 'sending' | 'receiving'): Promise<Session> {
    const response = await fetch(`${STACK_AUTH_API_URL}/auth/sign-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error('Nesprávny email alebo heslo');
    }

    const data = await response.json();

    // Get user profile
    const userResponse = await fetch(`${STACK_AUTH_API_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${data.accessToken || data.token}`,
      },
    });

    const userData = await userResponse.json();

    const session: Session = {
      user: {
        id: data.userId || userData.id,
        email: userData.email || email,
        full_name: userData.displayName || '',
        created_at: userData.createdAt || new Date().toISOString(),
        user_type: userType,
      },
      token: data.accessToken || data.token,
    };

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

  async verifyToken(token: string): Promise<boolean> {
    try {
      // Fetch JWKS to verify token
      const jwksResponse = await fetch(JWKS_URL);
      const jwks = await jwksResponse.json();
      
      // In production, you would verify JWT signature here
      // For now, just check if token exists
      return !!token;
    } catch {
      return false;
    }
  },
};

