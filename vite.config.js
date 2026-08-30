import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/my-vocab-app/', // ⚠️ 請改為你在 GitHub 上建的 Repository (倉庫) 名稱
})
