'use client';

import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { LexicalComposer, type InitialConfigType } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { $createRangeSelectionFromDom, $setSelection, type EditorThemeClasses } from 'lexical';
import { cx } from '../base/cn';
import styles from './RichEditor.module.scss';

export type RichEditorProps = {
    initialConfig: InitialConfigType;
    children: ReactNode;
    history?: boolean;
    lists?: boolean;
    links?: false | ComponentProps<typeof LinkPlugin>;
    markdown?: ComponentProps<typeof MarkdownShortcutPlugin>['transformers'];
    /** Bridge native mouse selection into Lexical before floating controls receive focus. */
    selectionBridge?: boolean;
};

export const richEditorClasses = styles;
export const richEditorTheme = {
    text: {
        bold: styles.bold,
        italic: styles.italic,
        underline: styles.underline,
        strikethrough: styles.strikethrough,
        code: styles.inlineCode,
    },
    code: styles.code,
    quote: styles.quote,
    tableScrollableWrapper: `${styles.tableScroll} ui-scrollbar`,
    codeHighlight: {
        keyword: styles.tokenKeyword,
        boolean: styles.tokenKeyword,
        string: styles.tokenString,
        comment: styles.tokenComment,
        function: styles.tokenFunction,
        number: styles.tokenNumber,
        operator: styles.tokenKeyword,
        punctuation: styles.tokenComment,
        tag: styles.tokenKeyword,
        attr: styles.tokenString,
    },
} satisfies EditorThemeClasses;

/** Extensible Lexical owner: callers keep document serializers and custom nodes. */
export function RichEditor({
    initialConfig,
    children,
    history = true,
    lists = true,
    links = {},
    markdown,
    selectionBridge = false,
}: RichEditorProps) {
    return (
        <LexicalComposer initialConfig={initialConfig}>
            {children}

            {history && <HistoryPlugin />}

            {lists && <ListPlugin />}

            {links !== false && <LinkPlugin {...links} />}

            {markdown && <MarkdownShortcutPlugin transformers={markdown} />}

            {selectionBridge && <SelectionBridge />}
        </LexicalComposer>
    );
}

export type RichEditorContentProps = {
    editable: ComponentProps<typeof ContentEditable>;
    document?: ComponentProps<'div'>;
};

/** The block parent preserves native selection and focus in Chrome. */
export function RichEditorContent({ editable, document }: RichEditorContentProps) {
    return (
        <div {...document} className={cx(styles.document, document?.className)}>
            <RichTextPlugin
                contentEditable={
                    <ContentEditable
                        {...editable}
                        className={cx(styles.content, editable.className)}
                    />
                }
                placeholder={null}
                ErrorBoundary={LexicalErrorBoundary}
            />
        </div>
    );
}

function SelectionBridge() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const capture = () => {
            const root = editor.getRootElement();
            const selection = root?.ownerDocument.getSelection();
            if (
                !selection?.anchorNode ||
                !selection.focusNode ||
                !root?.contains(selection.anchorNode) ||
                !root.contains(selection.focusNode) ||
                selection.isCollapsed
            )
                return;

            editor.update(() => {
                $setSelection($createRangeSelectionFromDom(selection, editor));
            });
        };
        const unregister = editor.registerRootListener((root, previous) => {
            previous?.removeEventListener('mouseup', capture);
            root?.addEventListener('mouseup', capture);
        });

        return () => {
            editor.getRootElement()?.removeEventListener('mouseup', capture);
            unregister();
        };
    }, [editor]);

    return null;
}
