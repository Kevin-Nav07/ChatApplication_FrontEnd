import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'

// https://vite.dev/config/
// The config is a function so it can tell `vite` (command 'serve') apart from `vite build` (command 'build').
// The certificate files only exist on this machine, so they are read for the dev server only.
// Reading them for a build too made `npm run build` crash on any other machine, such as a hosting platform
export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: command === 'serve' ? {
    // Serves the dev site on https://localhost:5173 using the same mkcert certificate as the backend.
    // The auth cookies are Secure and SameSite=Strict, and browsers can treat http://localhost and https://localhost
    // as different sites, which stops those cookies being saved or sent. Using https on both sides makes them the same site
    https: {
      // new URL(..., import.meta.url) resolves the path relative to this config file instead of the terminal's current folder
      key: readFileSync(new URL('../../Chat-Application/certs/localhost+2-key.pem', import.meta.url)),
      cert: readFileSync(new URL('../../Chat-Application/certs/localhost+2.pem', import.meta.url)),
    },
    port: 5173,
    // Fail loudly if 5173 is taken instead of moving to 5174, because the backend's CORS list only allows port 5173
    strictPort: true,
  } : undefined,
}))
