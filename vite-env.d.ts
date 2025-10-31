/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean
  // Add other Vite environment variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
