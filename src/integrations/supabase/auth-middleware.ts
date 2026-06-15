import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missing = [
        ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
        ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
      ];
      const message = `Missing Supabase environment variable(s): ${missing.join(', ')}`;
      console.error(`[auth-middleware] ${message}`);
      throw new Error(message);
    }

    const request = getRequest();
    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available');
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized: No valid Bearer token provided');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    const supabase = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      console.error('[auth-middleware] getUser failed:', userError?.message);
      throw new Error('Unauthorized: Token verification failed');
    }

    const user = userData.user;

    return next({
      context: {
        supabase,
        userId: user.id,
        claims: {
          sub: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
        },
      },
    });
  },
)
