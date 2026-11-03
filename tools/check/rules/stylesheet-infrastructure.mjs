const cache = new Map();
function scopes(text) {
  if (cache.has(text)) return cache.get(text);
  const blocks = [], stack = []; let start = 0, quote = '', comment = false, line = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index], next = text[index + 1];
    if (line) { if (char === '\n') { line = false; start = index + 1; } continue; }
    if (comment) { if (char === '*' && next === '/') { comment = false; index++; start = index + 1; } continue; }
    if (quote) { if (char === '\\') index++; else if (char === quote) quote = ''; continue; }
    if (char === '/' && next === '*') { comment = true; index++; continue; }
    if (char === '/' && next === '/') { line = true; index++; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') { const block = { header: text.slice(start, index).trim(), start: index, end: text.length }; blocks.push(block); stack.push(block); start = index + 1; }
    if (char === '}') { const block = stack.pop(); if (block) block.end = index; start = index + 1; }
    if (char === ';') start = index + 1;
  }
  cache.set(text, blocks); return blocks;
}
const owns = (text, owner, file) => !file.endsWith('.module.scss') && text.split(/\r?\n/).some(line => line.trim() === '// @ui-style-owner ' + owner);
export function ownsNativeReset(text, file, offset) {
  if (!owns(text, 'native-reset', file)) return false;
  const block = scopes(text).filter(block => block.start < offset && block.end > offset).at(-1);
  if (!block) return false;
  return block.header.split(',').every(selector => /^(?:html|body|h[1-6]|input\[type=['"]number['"]\]::-webkit-(?:outer|inner)-spin-button)$/.test(selector.trim()));
}
export function ownsResponsiveTokens(text, file, offset) {
  if (!owns(text, 'theme-tokens', file)) return false;
  const blocks = scopes(text); const media = blocks.find(block => block.header.startsWith('@media') && block.start >= offset && block.start < offset + text.slice(offset).split('\n')[0].length);
  if (!media) return false;
  const children = blocks.filter(block => block.start > media.start && block.end < media.end);
  if (!children.some(block => block.header === ':root')) return false;
  for (const child of children) {
    if (child.header === ':root') { if (text.slice(child.start + 1, child.end).split(';').some(declaration => declaration.trim() && !/^--[\w-]+\s*:/.test(declaration.trim()))) return false; }
    else if (/^\[data-hide-(mobile|tablet|desktop|pc)\]$/.test(child.header)) { if (!/^\s*display\s*:\s*none(?:\s*!important)?\s*;?\s*$/.test(text.slice(child.start + 1, child.end))) return false; }
    else if (/^@for\s+\$i\s+from\s+1\s+through\s+10$/.test(child.header)) continue;
    else if (/^\[data-order-(mobile|tablet|desktop|pc)=['"]#\{\$i\}['"]\]$/.test(child.header)) { if (!/^\s*order\s*:\s*\$i\s*;?\s*$/.test(text.slice(child.start + 1, child.end))) return false; }
    else return false;
  }
  return true;
}
