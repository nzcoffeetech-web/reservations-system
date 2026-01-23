// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

export default defineConfig({
  // 1. FORCE SERVER MODE (Crucial for API routes)
  output: 'server',

  // 2. USE NETLIFY ADAPTER
  adapter: netlify(),

  integrations: [tailwind(), react()],
});