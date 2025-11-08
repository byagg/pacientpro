// Authentication system using Supabase
import { supabase } from "@/integrations/supabase/client";

export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  user_type?: 'sending' | 'receiving'; // odosielajúci lekár / prijímajúci lekár
  ambulance_code?: string;
}

export interface Session {
  user: User;
  token: string;
}

export const auth = {
  async signUp(email: string, password: string, fullName: string, userType?: 'sending' | 'receiving'): Promise<Session> {
    // Generate ambulance code from initials
    const names = fullName.trim().split(/\s+/);
    let baseCode = '';
    
    if (names.length >= 2) {
      // First letter of first name + first letter of last name
      baseCode = (names[0][0] + names[names.length - 1][0]).toUpperCase();
    } else {
      // If only one name, use first two letters
      baseCode = (names[0][0] + (names[0][1] || names[0][0])).toUpperCase();
    }

    // Check for duplicates and add number suffix if needed
    let ambulanceCode = baseCode;
    let suffix = 1;
    
    while (true) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('ambulance_code', ambulanceCode)
        .single();
      
      if (!existing) {
        // Code is unique, use it
        break;
      }
      
      // Code exists, try with suffix
      suffix++;
      ambulanceCode = `${baseCode}${suffix}`;
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          user_type: userType,
          ambulance_code: ambulanceCode,
        }
      }
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('Registrácia zlyhala');
    }

    // Create or update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: authData.user.email!,
        full_name: fullName,
        user_type: userType,
        ambulance_code: ambulanceCode,
        created_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // Return session
    const session: Session = {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        full_name: fullName,
        created_at: authData.user.created_at,
        user_type: userType,
        ambulance_code: ambulanceCode,
      },
      token: authData.session?.access_token || '',
    };

    return session;
  },

  async signIn(email: string, password: string): Promise<Session> {
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      throw new Error('Nesprávny email alebo heslo');
    }

    if (!authData.user || !authData.session) {
      throw new Error('Prihlásenie zlyhalo');
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    // Return session
    const session: Session = {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        full_name: profile?.full_name || authData.user.email!,
        created_at: authData.user.created_at,
        user_type: profile?.user_type,
        ambulance_code: profile?.ambulance_code,
      },
      token: authData.session.access_token,
    };

    return session;
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  async getSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return null;

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return {
      user: {
        id: session.user.id,
        email: session.user.email!,
        full_name: profile?.full_name || session.user.email!,
        created_at: session.user.created_at,
        user_type: profile?.user_type,
        ambulance_code: profile?.ambulance_code,
      },
      token: session.access_token,
    };
  },

  async getCurrentUser(): Promise<User | null> {
    const session = await this.getSession();
    return session?.user || null;
  },
};
