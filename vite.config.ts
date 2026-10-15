import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { speakingHandler } from './server/speaking.ts';
export default defineConfig({
  plugins: [vue(), {
    name: 'speaking-api',
    configureServer(server) { server.middlewares.use('/api/speaking', speakingHandler); },
    configurePreviewServer(server) { server.middlewares.use('/api/speaking', speakingHandler); },
  }],
});
