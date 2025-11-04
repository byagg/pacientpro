// Stack Auth integration wrapper
// Provides same API as before but uses Stack Auth service
import { stackAuth, type User, type Session } from "./stack-auth";

// Re-export types for compatibility
export type { User, Session };

// Wrap Stack Auth to maintain same API
export const auth = {
  async signUp(email: string, password: string, fullName: string, userType?: 'sending' | 'receiving'): Promise<Session> {
    try {
      return await stackAuth.signUp(email, password, fullName, userType);
    } catch (error) {
      if (error instanceof Error) {
        // Map Stack Auth errors to Slovak messages
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          throw new Error('Tento email je už registrovaný');
        }
        throw error;
      }
      throw new Error('Registrácia zlyhala');
    }
  },

  async signIn(email: string, password: string, userType?: 'sending' | 'receiving'): Promise<Session> {
    try {
      return await stackAuth.signIn(email, password, userType);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('invalid') || error.message.includes('incorrect')) {
          throw new Error('Nesprávny email alebo heslo');
        }
        throw error;
      }
      throw new Error('Prihlásenie zlyhalo');
    }
  },

  signOut(): void {
    stackAuth.signOut();
  },

  getSession(): Session | null {
    return stackAuth.getSession();
  },

  getCurrentUser(): User | null {
    return stackAuth.getCurrentUser();
  },
};

