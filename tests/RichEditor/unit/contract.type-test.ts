import type { RichEditorProps, RichEditorContentProps } from '../../../src/core/RichEditor';
import { TextNode } from 'lexical';
import { LinkNode } from '@lexical/link';
import { ListNode, ListItemNode } from '@lexical/list';
import type { RefObject } from 'react';

class DocumentToken extends TextNode {
    static getType() {
        return 'document-token';
    }
    static clone(node: DocumentToken) {
        return new DocumentToken(node.getTextContent(), node.getKey());
    }
}

// Custom document nodes and external state remain owned by the consumer.
export const anchoredDocument = {
    initialConfig: {
        namespace: 'anchored-document',
        nodes: [DocumentToken, LinkNode, ListNode, ListItemNode],
        editorState: '{"root":{"type":"root","version":1,"children":[]}}',
        onError(error: Error) {
            throw error;
        },
    },
    children: null,
    markdown: [],
    selectionBridge: true,
    links: { validateUrl: (url: string) => url.startsWith('https:') },
} satisfies RichEditorProps;

export const readOnlyDocument = {
    ...anchoredDocument,
    initialConfig: { ...anchoredDocument.initialConfig, editable: false },
    history: false,
    lists: false,
    links: false,
} satisfies RichEditorProps;

export function editableField(ref: RefObject<HTMLDivElement | null>) {
    return {
        editable: {
            ref,
            'aria-label': 'Message',
            'aria-autocomplete': 'list',
            onPaste: (event) => event.clipboardData.getData('text/plain'),
        },
        document: { 'aria-live': 'polite' },
    } satisfies RichEditorContentProps;
}
