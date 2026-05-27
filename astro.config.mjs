import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';
import node from '@astrojs/node';

const isNetlify = !!process.env.NETLIFY;

export default defineConfig({
  site: 'https://nzcoffee.work',
  output: 'server',
  adapter: isNetlify ? netlify() : node({ mode: 'standalone' }),
  integrations: [
    tailwind(),
    react(),
    sitemap(),
  ],
});
