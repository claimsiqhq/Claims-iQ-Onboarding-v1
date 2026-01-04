import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import type { AuthUser } from '@shared/types';

interface LoginResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface AuthMeResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Hook to get the current authenticated user
 */
export function useAuth() {
  const query = useQuery<AuthUser | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (response.status === 401) {
          return null;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }

        const data: AuthMeResponse = await response.json();
        if (!data.success || !data.user) {
          return null;
        }

        return data.user;
      } catch (error) {
        console.error('Auth check failed:', error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  return {
    user: query.data,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
    isStaff: query.data?.userType === 'claims_iq_staff',
    isPortalUser: query.data?.userType === 'portal_user',
    refetch: query.refetch,
  };
}

/**
 * Hook to send magic link login
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<LoginResponse, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      return data;
    },
    onSuccess: () => {
      // Don't invalidate yet - user needs to click magic link
    },
  });
}

/**
 * Hook to verify OTP token
 */
export function useVerifyOtp() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation<LoginResponse, Error, { email: string; token: string }>({
    mutationFn: async ({ email, token }) => {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate auth query to fetch user
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      // Redirect to portal
      setLocation('/portal');
    },
  });
}

/**
 * Hook to sign out
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation<{ success: boolean }, Error>({
    mutationFn: async () => {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      // Clear all queries
      queryClient.clear();
      // Redirect to login
      setLocation('/login');
    },
  });
}

/**
 * Hook to refresh access token
 */
export function useRefreshToken() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error>({
    mutationFn: async () => {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

/**
 * Hook that requires authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo: string = '/login') {
  const [, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();

  // Redirect if not authenticated after loading
  if (!isLoading && !isAuthenticated) {
    setLocation(redirectTo);
  }

  return { user, isLoading, isAuthenticated };
}

/**
 * Hook that requires staff role
 * Redirects to portal if authenticated but not staff
 */
export function useRequireStaff() {
  const [, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated, isStaff } = useAuth();

  // Redirect if not authenticated
  if (!isLoading && !isAuthenticated) {
    setLocation('/login');
  }

  // Redirect if authenticated but not staff
  if (!isLoading && isAuthenticated && !isStaff) {
    setLocation('/portal');
  }

  return { user, isLoading, isAuthenticated, isStaff };
}
