import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import node from '@astrojs/node';

// 🧠 FINAL SMART SWITCH
// This variable is ONLY true when running on Netlify's servers.
// On your laptop, it will be false.
const isNetlify = !!process.env.NETLIFY;

export default defineConfig({
  output: 'server',

  // If on Netlify -> Use Netlify Adapter
  // If on Laptop  -> Use Node Adapter
  adapter: isNetlify ? netlify() : node({ mode: 'standalone' }),

  integrations: [tailwind(), react()],
});