import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// หน้าเว็บเรียก /api แล้ว Vite ส่งต่อไป backend (ชื่อ service ใน docker-compose)
const target = process.env.API_URL || 'http://localhost:3301';
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
    proxy: { '/api': target },
    watch: { usePolling: true }, // Windows + Docker ต้องใช้ polling ถึงจะเห็นไฟล์ที่แก้
  },
});
