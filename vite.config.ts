import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
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
  },
})
