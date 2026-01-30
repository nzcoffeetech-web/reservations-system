import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';
import node from '@astrojs/node'; // Ensure you ran: npm install @astrojs/node

// 🧠 FINAL SMART SWITCH
// This automatically detects if we are on Netlify servers
const isNetlify = !!process.env.NETLIFY;

export default defineConfig({
  // 1. Define your Production URL (Required for Sitemap)
  site: 'https://nzcoffee.work', 
  
  // 2. Enable Server Mode (Required for Telegram API & Admin Dashboard)
  output: 'server',

  // 3. Smart Adapter Selection
  // If on Netlify -> Use Netlify Adapter
  // If on Laptop  -> Use Node Adapter (Standalone mode)
  adapter: isNetlify ? netlify() : node({ mode: 'standalone' }),

  integrations: [
    tailwind(), 
    react(), 
    sitemap()
  ],
});