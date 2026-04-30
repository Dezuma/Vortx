import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Default: site root. Set VITE_BASE_PATH only if you deploy under a subpath.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
