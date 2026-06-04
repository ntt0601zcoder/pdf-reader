// Google API configuration, read from Vite env (see .env.example / README).

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY ?? ''
export const GOOGLE_APP_ID = import.meta.env.VITE_GOOGLE_APP_ID ?? ''

/** The single, non-sensitive scope we need: per-file access to picked + app-created files. */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

/** True when the minimum credentials for Drive are present. */
export function isGoogleConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID) && Boolean(GOOGLE_API_KEY)
}
