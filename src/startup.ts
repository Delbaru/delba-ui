export interface PageReadyOptions {
    /** Maximum preparation time in milliseconds; content always becomes visible afterwards. Default 3000. */
    timeoutMs?: number;
}

/**
 * Inline head script: wait for the first font layout before revealing the page and starting CSS motion.
 * Use once in the document head before body. The document root needs suppressHydrationWarning
 * because this script owns data-ui-loading/data-ui-ready outside React. Without JS content stays visible.
 * Supply the project's CSP nonce on the script element when CSP requires it.
 */
export function pageReadyScript({ timeoutMs = 3000 }: PageReadyOptions = {}): string {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('pageReadyScript timeoutMs must be positive');
    return `(()=>{
const root=document.documentElement;
if(root.hasAttribute('data-ui-ready')||root.hasAttribute('data-ui-loading'))return;
if(!document.fonts){root.dataset.uiReady='unsupported';return;}
root.setAttribute('data-ui-loading','');
root.setAttribute('aria-busy','true');
const previousInert=root.hasAttribute('inert');
root.setAttribute('inert','');
let frame=0;
const release=reason=>{
  if(!root.hasAttribute('data-ui-loading'))return;
  clearTimeout(timer);cancelAnimationFrame(frame);
  document.removeEventListener('DOMContentLoaded',start);
  root.removeAttribute('data-ui-loading');root.removeAttribute('aria-busy');
  if(!previousInert)root.removeAttribute('inert');
  root.dataset.uiReady=reason;
  performance.mark('ui-ready:'+reason);
  if(reason==='timeout'||reason==='font-error')console.warn('[ui] Page ready fallback: '+reason);
};
const start=()=>{
  frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
    document.fonts.ready.then(()=>release([...document.fonts].some(font=>font.status==='error')?'font-error':'fonts'),()=>release('font-error'));
  });});
};
const timer=setTimeout(()=>release('timeout'),${JSON.stringify(timeoutMs)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();`;
}
