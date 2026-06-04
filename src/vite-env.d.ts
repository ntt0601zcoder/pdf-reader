/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_GOOGLE_API_KEY?: string
  readonly VITE_GOOGLE_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// --- Minimal ambient declarations for the Google scripts loaded in index.html.
// We avoid pulling in heavy @types packages and declare only what we use.
declare global {
  interface Window {
    google?: typeof google
    gapi?: typeof gapi
  }

  // Google Identity Services (token model)
  namespace google.accounts.oauth2 {
    interface TokenResponse {
      access_token: string
      expires_in: number
      scope: string
      token_type: string
      error?: string
      error_description?: string
    }
    interface TokenClientConfig {
      client_id: string
      scope: string
      callback: (resp: TokenResponse) => void
      error_callback?: (err: { type: string; message?: string }) => void
      prompt?: '' | 'none' | 'consent' | 'select_account'
    }
    interface TokenClient {
      requestAccessToken: (overrides?: { prompt?: string }) => void
      callback: (resp: TokenResponse) => void
      error_callback?: (err: { type: string; message?: string }) => void
    }
    function initTokenClient(config: TokenClientConfig): TokenClient
    function revoke(token: string, done?: () => void): void
  }

  // gapi loader
  namespace gapi {
    function load(libraries: string, callback: () => void): void
  }

  // Google Picker (only the bits we touch)
  namespace google.picker {
    enum Action {
      PICKED = 'picked',
      CANCEL = 'cancel',
    }
    enum Feature {
      NAV_HIDDEN = 'navHidden',
      MULTISELECT_ENABLED = 'multiselectEnabled',
    }
    interface DocumentObject {
      id: string
      name: string
      mimeType: string
      sizeBytes?: number
      url?: string
    }
    interface ResponseObject {
      action: string
      docs: DocumentObject[]
    }
    class DocsView {
      constructor(viewId?: string)
      setIncludeFolders(v: boolean): DocsView
      setSelectFolderEnabled(v: boolean): DocsView
      setMimeTypes(mimeTypes: string): DocsView
      setMode(mode: unknown): DocsView
      setParent(id: string): DocsView
    }
    class PickerBuilder {
      addView(view: DocsView | string): PickerBuilder
      setOAuthToken(token: string): PickerBuilder
      setDeveloperKey(key: string): PickerBuilder
      setAppId(appId: string): PickerBuilder
      setCallback(cb: (data: ResponseObject) => void): PickerBuilder
      enableFeature(feature: Feature): PickerBuilder
      setTitle(title: string): PickerBuilder
      build(): Picker
    }
    interface Picker {
      setVisible(visible: boolean): void
    }
    const ViewId: { PDFS: string; DOCS: string }
  }
}

export {}
