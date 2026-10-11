import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import type { Plugin } from 'vite';

/** Реальный серверный HTML и hydrateRoot проверяются с одним экземпляром React. */
export const ssrPlugin: Plugin = {
  name: 'ui-ssr-fixture',
  configureServer(server) {
    server.middlewares.use('/ssr', async (_request, response, next) => {
      try {
        const module = await server.ssrLoadModule('/ssr-fixture.tsx') as { SsrFixture: ComponentType };
        const content = renderToString(createElement(module.SsrFixture), { identifierPrefix: 'ui-ssr-' });
        const html = await server.transformIndexHtml('/ssr',
          `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><title>SSR fixture</title><link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E"></head><body><div id="root">${content}</div><script type="module" src="/ssr-hydrate.tsx"></script></body></html>`);
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(html);
      } catch (error) {
        next(error);
      }
    });
  },
};
