import { supabase } from './supabase'

/**
 * Make authenticated API requests with automatic token refresh on 401
 * If the request returns 401, it will attempt to refresh the token and retry
 * If refresh fails, it will throw an error to indicate the user should re-login
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  maxRetries = 1
): Promise<Response> {
  let retries = 0

  while (retries <= maxRetries) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      throw new Error('SESSION_EXPIRED')
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    // If successful, return response
    if (response.status !== 401) {
      return response
    }

    // If 401 and we haven't retried yet, try to refresh token
    if (retries < maxRetries) {
      try {
        const { data, error } = await supabase.auth.refreshSession()
        if (error || !data.session) {
          throw new Error('TOKEN_REFRESH_FAILED')
        }
        retries++
        // Continue loop to retry the request
        continue
      } catch (err) {
        // Refresh failed, session is invalid
        throw new Error('SESSION_EXPIRED')
      }
    } else {
      // Max retries exceeded, return 401 response
      return response
    }
  }

  throw new Error('UNKNOWN_ERROR')
}

/**
 * Wrapper for authenticatedFetch that automatically signs out on auth errors
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  onAuthError?: () => void
): Promise<Response> {
  try {
    return await authenticatedFetch(url, options)
  } catch (error) {
    // Session expired, sign out and trigger callback
    await supabase.auth.signOut().catch(() => {})
    onAuthError?.()
    throw error
  }
}
