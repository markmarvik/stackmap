import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

// "stackmap" and "/stackmap" both become "/stackmap/" so asset URLs stay valid.
function normaliseBase(value) {
  const raw = (value && String(value).trim()) || '/';
  const lead = raw.startsWith('/') ? raw : `/${raw}`;
  return lead.endsWith('/') ? lead : `${lead}/`;
}

// Full public URL including the base path. Callers join paths onto the trailing slash.
function normaliseSiteUrl(value) {
  const raw = (value && String(value).trim()) || 'https://stackmap-31c.pages.dev/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

// %SITE_URL% is not a Vite env name, so index.html and the copied public files need a swap.
function siteUrlPlugin(siteUrl) {
  const token = '%SITE_URL%';
  let outDir = 'dist';
  const apply = (text) => text.replaceAll(token, siteUrl);
  return {
    name: 'site-url',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    // Pre: Vite decodeURI()s <link href> before normal HTML hooks, and "%SI" is not a valid escape.
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => apply(html)
    },
    closeBundle() {
      if (!fs.existsSync(outDir)) return;
      const names = fs.readdirSync(outDir).filter((name) => (
        name.endsWith('.html') || name === 'sitemap.xml' || name === 'robots.txt'
      ));
      for (const name of names) {
        const file = path.join(outDir, name);
        const text = fs.readFileSync(file, 'utf8');
        if (text.includes(token)) fs.writeFileSync(file, apply(text));
      }
    }
  };
}

const siteUrl = normaliseSiteUrl(process.env.SITE_URL);
// Vite copies VITE_* onto import.meta.env after this file loads.
process.env.VITE_SITE_URL = siteUrl;

export default defineConfig(({ mode }) => ({
  root: '.',
  // Dev stays at /. Production base is BASE: "/" on Cloudflare, "/stackmap/" on GitHub Pages.
  base: mode === 'production' ? normaliseBase(process.env.BASE) : '/',
  define: {
    'import.meta.env.VITE_SITE_URL': JSON.stringify(siteUrl)
  },
  plugins: [siteUrlPlugin(siteUrl)],
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist'
  }
}));
