import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap'; // 1. Import Sitemap
import netlify from '@astrojs/netlify';
import node from '@astrojs/node';

// 🧠 FINAL SMART SWITCH
const isNetlify = !!process.env.NETLIFY;

export default defineConfig({
  // 2. Define your Production URL (Required for Sitemap)
  site: 'https://nzcoffee.work', 
  
  output: 'server',

  // If on Netlify -> Use Netlify Adapter
  // If on Laptop  -> Use Node Adapter
  adapter: isNetlify ? netlify() : node({ mode: 'standalone' }),

  integrations: [
    tailwind(), 
    react(), 
    sitemap() // 3. Enable Sitemap
  ],
});