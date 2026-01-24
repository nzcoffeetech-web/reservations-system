import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',

  // 🔴 TEMPORARILY FORCED TO NODE (Laptop Mode)
  // This disables Netlify entirely on your machine so it CANNOT crash.
  adapter: node({
    mode: 'standalone',
  }),

  integrations: [tailwind(), react()],
});