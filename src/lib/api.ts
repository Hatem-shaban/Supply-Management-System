const SESSION_KEY = 'app_session'

function getToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as { token: string }).token : null
  } catch {
    return null
  }
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  onAuthError?: () => void
): Promise<Response> {
  const token = getToken()

  if (!token) {
    localStorage.removeItem(SESSION_KEY)
    onAuthError?.()
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

  if (response.status === 401) {
    localStorage.removeItem(SESSION_KEY)
    onAuthError?.()
  }

  return response
}
