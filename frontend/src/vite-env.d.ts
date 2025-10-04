/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SAFEVISION_API_URL: string
  readonly VITE_SAFEVISION_API_URL_DEV: string
  readonly VITE_DEPLOYMENT_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
