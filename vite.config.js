import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/word-flip/', // ⚠️ 注意：前後都必須有斜線 `/`！
})
