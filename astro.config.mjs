import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://helloworld.com.ar',
  output: 'static',
  build: {
    format: 'preserve',
  },
  integrations: [
    sitemap({
      serialize(item) {
        const url = new URL(item.url);

        if (url.pathname !== '/' && !url.pathname.endsWith('/')) {
          url.pathname += '/';
        }

        return { ...item, url: url.toString() };
      },
    }),
  ],
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
