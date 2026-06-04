import { GOOGLE_API_KEY, GOOGLE_APP_ID, GOOGLE_CLIENT_ID } from './config'
import { ensurePicker, getAccessToken } from './auth'

export interface PickedFile {
  id: string
  name: string
}

/** Derive the Picker App ID (GCP project number) — explicit env, else from the client id. */
function appId(): string {
  if (GOOGLE_APP_ID) return GOOGLE_APP_ID
  // OAuth client ids look like "<projectNumber>-xxxx.apps.googleusercontent.com".
  const m = GOOGLE_CLIENT_ID.match(/^(\d+)-/)
  return m ? m[1] : ''
}

/**
 * Open the Google Picker filtered to PDFs and resolve with the chosen file.
 * Picking a file is what grants the app drive.file access to it, so the
 * subsequent download (drive.ts) works under the non-sensitive scope.
 */
export async function pickPdf(): Promise<PickedFile | null> {
  const token = await getAccessToken(true) // first call must be interactive
  await ensurePicker()

  return new Promise<PickedFile | null>((resolve, reject) => {
    const picker = window.google!.picker
    const view = new picker.DocsView(picker.ViewId.DOCS)
      .setMimeTypes('application/pdf')
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false)

    const builder = new picker.PickerBuilder()
      .enableFeature(picker.Feature.NAV_HIDDEN)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setOAuthToken(token)
      .addView(view)
      .setCallback((data) => {
        if (data.action === picker.Action.PICKED) {
          const doc = data.docs?.[0]
          if (doc) resolve({ id: doc.id, name: doc.name })
          else resolve(null)
        } else if (data.action === picker.Action.CANCEL) {
          resolve(null)
        }
      })

    const id = appId()
    if (id) builder.setAppId(id)

    try {
      builder.build().setVisible(true)
    } catch (e) {
      reject(e instanceof Error ? e : new Error('Picker failed to open'))
    }
  })
}
