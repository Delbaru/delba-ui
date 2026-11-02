import { useCallback, useEffect, useState } from 'react';
import { $createTextNode, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, type LexicalNode } from 'lexical';
import { $createLinkNode, $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND, $isListNode } from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { resolveSvgAssetSource } from '../../../core/base/svg-asset';
import { UI_MESSAGES } from '../../../core/base/messages';
import { isAllowedLink } from '../lexical/links';
import BoldIconAsset from '../assets/b.svg';
import ItalicIconAsset from '../assets/i.svg';
import LinkIconAsset from '../assets/link.svg';
import OrderedListIconAsset from '../assets/ol.svg';
import UnderlineIconAsset from '../assets/u.svg';
import UnorderedListIconAsset from '../assets/ul.svg';

type ActiveFormats = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  listType: 'bullet' | 'number' | null;
  isLink: boolean;
};

function findMatchingParent<T extends LexicalNode>(
  node: LexicalNode | null,
  matcher: (currentNode: LexicalNode) => currentNode is T
): T | null {
  let currentNode = node;

  while (currentNode) {
    if (matcher(currentNode)) {
      return currentNode;
    }

    currentNode = currentNode.getParent();
  }

  return null;
}

function normalizeLink(url: string): string {
  const trimmedUrl = url.trim();

  if (!trimmedUrl || trimmedUrl.startsWith('/') || trimmedUrl.startsWith('mailto:') || trimmedUrl.includes('://')) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

const toolbarBoldIconSrc = resolveSvgAssetSource(BoldIconAsset) ?? '';
const toolbarItalicIconSrc = resolveSvgAssetSource(ItalicIconAsset) ?? '';
const toolbarUnderlineIconSrc = resolveSvgAssetSource(UnderlineIconAsset) ?? '';
const toolbarUnorderedListIconSrc = resolveSvgAssetSource(UnorderedListIconAsset) ?? '';
const toolbarOrderedListIconSrc = resolveSvgAssetSource(OrderedListIconAsset) ?? '';
const toolbarLinkIconSrc = resolveSvgAssetSource(LinkIconAsset) ?? '';


const EMPTY_FORMATS: ActiveFormats = { bold: false, italic: false, underline: false, listType: null, isLink: false };

function readActiveFormats(): ActiveFormats {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return EMPTY_FORMATS;

  const anchor = selection.anchor.getNode();
  const list = findMatchingParent(anchor, $isListNode);
  const listType = list?.getListType();
  return {
    bold: selection.hasFormat('bold'),
    italic: selection.hasFormat('italic'),
    underline: selection.hasFormat('underline'),
    listType: listType === 'bullet' || listType === 'number' ? listType : null,
    isLink: Boolean(findMatchingParent(anchor, $isLinkNode)),
  };
}

function equalFormats(a: ActiveFormats, b: ActiveFormats): boolean {
  return a.bold === b.bold && a.italic === b.italic && a.underline === b.underline
    && a.listType === b.listType && a.isLink === b.isLink;
}

export function useLexicalTextareaToolbar(allowLink: boolean) {
  const [editor] = useLexicalComposerContext();
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(EMPTY_FORMATS);

  useEffect(() => editor.registerUpdateListener(({ editorState }) => {
    editorState.read(() => {
      const next = readActiveFormats();
      setActiveFormats(current => equalFormats(current, next) ? current : next);
    });
  }), [editor]);

  const toggleTextFormat = useCallback(
    (format: 'bold' | 'italic' | 'underline') => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [editor]
  );

  const toggleList = useCallback(
    (listType: 'bullet' | 'number') => {
      if (activeFormats.listType === listType) {
        editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        return;
      }

      editor.dispatchCommand(
        listType === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
        undefined
      );
    },
    [activeFormats.listType, editor]
  );

  const handleLinkClick = useCallback(() => {
    const nextUrl = editor.getRootElement()?.ownerDocument.defaultView?.prompt(UI_MESSAGES.richTextarea.linkPrompt);

    if (!nextUrl) {
      if (activeFormats.isLink) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      }

      return;
    }

    const normalizedUrl = normalizeLink(nextUrl);

    if (!isAllowedLink(normalizedUrl)) {
      editor.getRootElement()?.ownerDocument.defaultView?.alert(UI_MESSAGES.richTextarea.invalidLink);
      return;
    }

    const hasCollapsedSelection = editor.getEditorState().read(() => {
      const selection = $getSelection();
      return $isRangeSelection(selection) ? selection.isCollapsed() : true;
    });

    if (hasCollapsedSelection) {
      const linkLabel = editor.getRootElement()?.ownerDocument.defaultView?.prompt(UI_MESSAGES.richTextarea.linkLabelPrompt, normalizedUrl) ?? normalizedUrl;

      editor.update(() => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return;
        }

        const linkNode = $createLinkNode(normalizedUrl, {
          target: '_blank',
          rel: 'noopener noreferrer',
        });

        linkNode.append($createTextNode(linkLabel.trim() || normalizedUrl));
        selection.insertNodes([linkNode, $createTextNode(' ')]);
      });

      return;
    }

    editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
      url: normalizedUrl,
      target: '_blank',
      rel: 'noopener noreferrer',
    });
  }, [activeFormats.isLink, editor]);

  const toolbarGroups = [
    [
      { ariaLabel: UI_MESSAGES.richTextarea.bold, iconSrc: toolbarBoldIconSrc, isActive: activeFormats.bold, onClick: () => toggleTextFormat('bold') },
      { ariaLabel: UI_MESSAGES.richTextarea.italic, iconSrc: toolbarItalicIconSrc, isActive: activeFormats.italic, onClick: () => toggleTextFormat('italic') },
      { ariaLabel: UI_MESSAGES.richTextarea.underline, iconSrc: toolbarUnderlineIconSrc, isActive: activeFormats.underline, onClick: () => toggleTextFormat('underline') },
    ],
    [
      { ariaLabel: UI_MESSAGES.richTextarea.bulletList, iconSrc: toolbarUnorderedListIconSrc, isActive: activeFormats.listType === 'bullet', onClick: () => toggleList('bullet') },
      { ariaLabel: UI_MESSAGES.richTextarea.numberedList, iconSrc: toolbarOrderedListIconSrc, isActive: activeFormats.listType === 'number', onClick: () => toggleList('number') },
    ],
    ...(allowLink ? [[{ ariaLabel: UI_MESSAGES.richTextarea.link, iconSrc: toolbarLinkIconSrc, isActive: activeFormats.isLink, onClick: handleLinkClick }]] : []),
  ] as const;

  return toolbarGroups;
}
