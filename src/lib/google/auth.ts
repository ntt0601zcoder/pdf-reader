import { useStore } from '../../store/useStore'
import { DRIVE_SCOPE, GOOGLE_CLIENT_ID } from './config'

// =============================================================================
// Google Identity Services (GIS) — token model, frontend-only.
//   - No refresh tokens in the browser: tokens last ~1h. We "refresh" by
//     silently calling requestAccessToken({prompt:''}) when a Google session
//     exists, or interactively (prompt:'consent') on first sign-in.
//   - The module holds the canonical token; we also mirror it into the store so
//     the UI can react to sign-in state.
// =============================================================================

let tokenClient: google.accounts.oauth2.TokenClient | null = null
let accessToken: string | null = null
let tokenExpiresAt = 0 // epoch ms
let pickerReady = false

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Wait until the GIS script (loaded in index.html) is available. */
async function waitForGis(): Promise<void> {
  for (let i = 0; i < 100; i++) {
    if (window.google?.accounts?.oauth2) return
    await wait(100)
  }
  throw new Error('Google Identity Services failed to load')
}

/** Wait for gapi and load the Picker module exactly once. */
export async function ensurePicker(): Promise<void> {
  if (pickerReady) return
  for (let i = 0; i < 100; i++) {
    if (window.gapi) break
    await wait(100)
  }
  if (!window.gapi) throw new Error('gapi failed to load')
  await new Promise<void>((resolve) => window.gapi!.load('picker', () => resolve()))
  pickerReady = true
}

let initPromise: Promise<void> | null = null

/** Initialise the token client (idempotent). */
export function initGoogleAuth(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await waitForGis()
      tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: () => {}, // replaced per-request in getAccessToken
      })
    })()
  }
  return initPromise
}

/**
 * Return a valid access token, requesting one if missing/expired.
 * @param interactive force the consent/account popup (must be from a user gesture).
 */
export function getAccessToken(interactive = false): Promise<string> {
  // Reuse a still-valid token (60s safety margin) unless forced interactive.
  if (!interactive && accessToken && Date.now() < tokenExpiresAt - 60_000) {
    return Promise.resolve(accessToken)
  }
  return initGoogleAuth().then(
    () =>
      new Promise<string>((resolve, reject) => {
        if (!tokenClient) return reject(new Error('Auth not initialised'))
        tokenClient.callback = (resp) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error))
            return
          }
          accessToken = resp.access_token
          tokenExpiresAt = Date.now() + Number(resp.expires_in) * 1000
          useStore.getState().setToken(resp.access_token, Number(resp.expires_in))
          resolve(resp.access_token)
        }
        tokenClient.error_callback = (err) =>
          reject(new Error(err.message || err.type || 'auth_error'))
        tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' })
      }),
  )
}

/** True if we currently hold an unexpired token. */
export function hasValidToken(): boolean {
  return Boolean(accessToken) && Date.now() < tokenExpiresAt - 60_000
}

/** Revoke + clear the token (sign out). */
export function signOut(): void {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken)
  }
  accessToken = null
  tokenExpiresAt = 0
  useStore.getState().clearToken()
}

/**
 * Fetch the signed-in user's email via Drive's about endpoint (works with the
 * drive.file scope — no extra userinfo scope needed).
 */
export async function fetchUserEmail(): Promise<void> {
  try {
    const token = await getAccessToken()
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    useStore.getState().setUserEmail(data.user?.emailAddress ?? null)
  } catch {
    /* non-fatal */
  }
}

/**
 * Run a Drive fetch, transparently re-authorising once on 401 (expired token).
 */
export async function authedFetch(
  url: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  const token = await getAccessToken()
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  })
  if (res.status === 401 && retry) {
    await getAccessToken(true) // interactive re-auth
    return authedFetch(url, init, false)
  }
  return res
}
