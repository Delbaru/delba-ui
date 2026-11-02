import { sanitizeRichTextHtml } from '../../core';

export type LegacyTextBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; content: string }
  | { type: 'paragraph'; parts: string[] }
  | { type: 'list'; tag: 'ul' | 'ol'; items: string[] };

const BR_REGEX = /<br\s*\/?>/gi;

function matchingBlockClose(content: string, tag: string, start: number) {
  const tokens = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  tokens.lastIndex = start;
  let depth = 1;
  let token: RegExpExecArray | null;

  while ((token = tokens.exec(content)) !== null) {
    if (token[0].startsWith('</')) depth--;
    else if (!token[0].endsWith('/>')) depth++;

    if (depth === 0) return { bodyEnd: token.index, end: tokens.lastIndex };
  }

  return null;
}

function parseListItems(content: string): string[] {
  const items: string[] = [];
  const tokens = /<\/?li\b[^>]*>/gi;
  let depth = 0;
  let itemStart = -1;
  let token: RegExpExecArray | null;

  while ((token = tokens.exec(content)) !== null) {
    if (token[0].startsWith('</')) {
      if (depth === 0) continue;
      depth--;
      if (depth === 0 && itemStart >= 0) {
        items.push(content.slice(itemStart, token.index).trim());
        itemStart = -1;
      }
      continue;
    }

    if (depth === 0) itemStart = tokens.lastIndex;
    depth++;
  }

  return items;
}

function normalizeListTags(content: string): string {
  return content
    .replace(/<ul[^>]*>/gi, '<ul>')
    .replace(/<ol[^>]*>/gi, '<ol>')
    .replace(/<li[^>]*>/gi, '<li>');
}

function appendParagraph(blocks: LegacyTextBlock[], content: string) {
  const parts = content
    .trim()
    .split(BR_REGEX)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 0) blocks.push({ type: 'paragraph', parts });
}

function unwrapLinks(content: string): string {
  // Sanitization runs first, so only safe, balanced anchors are unwrapped here.
  return content.replace(/<a\b[^>]*>([\s\S]*?)<\/a\s*>/gi, '$1');
}

export function parseLegacyRichText(
  input: string,
  links: 'active' | 'text' = 'active',
): LegacyTextBlock[] {
  if (!input.trim()) return [];
  const sanitized = sanitizeRichTextHtml(normalizeListTags(input));
  const content = links === 'text' ? unwrapLinks(sanitized) : sanitized;
  const blocks: LegacyTextBlock[] = [];
  const blockOpen = /<(h[1-6]|p|ul|ol)\b[^>]*>/gi;
  let lastEnd = 0;
  let opening: RegExpExecArray | null;

  while ((opening = blockOpen.exec(content)) !== null) {
    const tag = opening[1]?.toLowerCase();
    if (!tag) continue;
    const bodyStart = blockOpen.lastIndex;
    const closing = matchingBlockClose(content, tag, bodyStart);
    if (!closing) break;

    appendParagraph(blocks, content.slice(lastEnd, opening.index));
    const body = content.slice(bodyStart, closing.bodyEnd);

    if (tag.startsWith('h')) {
      blocks.push({
        type: 'heading',
        level: Number(tag.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6,
        content: body.trim(),
      });
    } else if (tag === 'p') {
      appendParagraph(blocks, body);
    } else if (tag === 'ul' || tag === 'ol') {
      blocks.push({ type: 'list', tag, items: parseListItems(body) });
    }

    lastEnd = closing.end;
    blockOpen.lastIndex = lastEnd;
  }

  appendParagraph(blocks, content.slice(lastEnd));
  return blocks;
}

export function flattenLegacyBlocks(blocks: LegacyTextBlock[]): string {
  return blocks
    .flatMap((block) => {
      if (block.type === 'heading') return [block.content];
      if (block.type === 'list') return block.items;
      return block.parts;
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
