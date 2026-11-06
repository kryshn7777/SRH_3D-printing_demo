import React, { Suspense, lazy } from 'react';
import { supabaseConfigured } from '../lib/config';
import { LocalProvider } from './LocalProvider';

export { useApp } from './appTypes';
export type { AppContextValue, ServiceResult, SignUpPayload, ToastNotification } from './appTypes';

// The Supabase code (and its client library) is only downloaded when a backend is configured.
const LiveProvider = lazy(() => import('./LiveProvider'));

/** Backend configured -> real Supabase; otherwise local demo data in this browser. */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  supabaseConfigured ? (
    <Suspense fallback={null}>
      <LiveProvider>{children}</LiveProvider>
    </Suspense>
  ) : (
    <LocalProvider>{children}</LocalProvider>
  );
