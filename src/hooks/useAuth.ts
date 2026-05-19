"use client";

import { useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

/**
 * Supabase Auth 상태를 구독하는 React 훅.
 *
 * 사용 예:
 *   const { user, loading } = useAuth();
 *   if (loading) return <Spinner />;
 *   if (!user) return <AuthModal />;
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    // 초기 세션 로드
    supabase.auth.getSession().then(({ data }) => {
      setState({
        user: data.session?.user ?? null,
        session: data.session,
        loading: false,
      });
    });

    // 로그인/로그아웃 이벤트 구독
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}
