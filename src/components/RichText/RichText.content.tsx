import type { ReactNode } from 'react';
import { decodeHtmlEntities, stripHtmlTags } from '../../core';
import { flattenLegacyBlocks, parseLegacyRichText, type LegacyTextBlock } from './legacy-html';
import { renderLexicalContent } from './LexicalRenderer';
import type { LexicalDocument } from './types';

type LexicalNode = {
  type?: string;
  text?: string;
  children?: LexicalNode[];
};


export function renderBlocks(blocks: LegacyTextBlock[]): ReactNode[] {
  return blocks.flatMap((block, blockIndex) => {
    if (block.type === 'heading') {
      const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return [
        <Tag
            key={`heading-${block.level}-${blockIndex}`}
            dangerouslySetInnerHTML={{ __html: block.content }}
        />,
      ];
    }

    if (block.type === 'list') {
      const Tag = block.tag;
      return [
        <Tag key={`list-${block.tag}-${blockIndex}`}>
          {block.items.map((item, itemIndex) => (
            <li
                key={`list-item-${blockIndex}-${itemIndex}`}
                dangerouslySetInnerHTML={{ __html: item }}
            />
          ))}
        </Tag>,
      ];
    }

    // Строки внутри одного абзаца (split по <br>) рендерим единым <p> с <br/> между ними:
    // перенос строки остаётся «тесным», а отступ между абзацами даёт margin самого <p>.
    return [
      <p
          key={`paragraph-${blockIndex}`}
          dangerouslySetInnerHTML={{ __html: block.parts.join('<br/>') }}
      />,
    ];
  });
}


function extractLexicalPlainText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';

  const lexicalNode = node as LexicalNode & { root?: LexicalNode };

  if (typeof lexicalNode.text === 'string') {
    return lexicalNode.text;
  }

  if (Array.isArray(lexicalNode.children)) {
    return lexicalNode.children.map((child) => extractLexicalPlainText(child)).join(' ');
  }

  if (lexicalNode.root) {
    return extractLexicalPlainText(lexicalNode.root);
  }

  return '';
}


export function richTextContent(content: string | LexicalDocument | null | undefined, links: 'active' | 'text') {
  if (typeof content === 'object' && content && Array.isArray(content.root?.children)) {
    return {
      empty: content.root.children.length === 0,
      preview: extractLexicalPlainText(content).replace(/\s+/g, ' ').trim(),
      render: (classes: Record<string, string>) => renderLexicalContent(content, links, classes),
    };
  }

  const html = typeof content === 'string' ? content : '';
  const blocks = html ? parseLegacyRichText(decodeHtmlEntities(html), links) : [];
  return {
    empty: blocks.length === 0,
    preview: stripHtmlTags(flattenLegacyBlocks(blocks)) || stripHtmlTags(decodeHtmlEntities(html)),
    render: () => renderBlocks(blocks),
  };
}
