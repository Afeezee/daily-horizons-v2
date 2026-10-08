import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth as useClerkAuth, useUser, useClerk } from '@clerk/clerk-react';
import { base44, api } from '@/api/client';
import { installLoginRedirect, installLogout, installTokenProvider } from '@/api/client';

const AuthContext = createContext();

/**
 * Clerk-backed auth, kept API-compatible with the old Base44 context so
 * existing pages (`useAuth()`'s `user`, `isAuthenticated`, `isLoadingAuth`,
 * `navigateToLogin`, `logout`) don't need touching. Public-read pages render
 * before the token is loaded — nothing here blocks them.
 */
export const AuthProvider = ({ children }) => {
  const { isLoaded: clerkLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const clerk = useClerk();

  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Wire the compatibility client to Clerk's token source once mounted.
  useEffect(() => {
    installTokenProvider(() => (isSignedIn ? getToken() : Promise.resolve(null)));
    installLoginRedirect((returnTo) => {
      clerk.openSignIn({ redirectUrl: returnTo });
    });
    installLogout(async () => {
      await signOut();
    });
  }, [isSignedIn, getToken, signOut, clerk]);

  useEffect(() => {
    if (!clerkLoaded) return;
    if (!isSignedIn) {
      setUser(null);
      setIsLoadingAuth(false);
      return;
    }
    (async () => {
      try {
        const me = await api.auth.me();
        setUser(me);
        setIsLoadingAuth(false);
      } catch (err) {
        setAuthError({ type: 'unknown', message: err.message });
        setIsLoadingAuth(false);
      }
    })();
  }, [clerkLoaded, isSignedIn, clerkUser?.id]);

  const navigateToLogin = () => {
    clerk.openSignIn({ redirectUrl: window.location.href });
  };

  const logout = async (shouldRedirect = true) => {
    await signOut();
    if (shouldRedirect) window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoadingAuth: !clerkLoaded || isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        appPublicSettings: null,
        logout,
        navigateToLogin,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

// Keep the old base44 re-export working for any file still reaching for it.
export { base44 };
