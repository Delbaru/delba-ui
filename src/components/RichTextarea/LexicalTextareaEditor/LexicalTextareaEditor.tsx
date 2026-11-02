import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { cx } from '../../../core';
import { Box } from '../../Box';
import { Text } from '../../Text';
import { richTextClasses, type LexicalTextVariant } from '../../RichText';
import { isAllowedLink } from '../lexical/links';
import { ContentSyncPlugin, EditorRefPlugin, VariableSelectionPlugin, VariablesPlugin } from '../lexical/plugins';
import type { LexicalTextareaModel } from '../useLexicalTextarea';
import styles from './LexicalTextareaEditor.module.scss';

interface EditorProps {
  id: string;
  editor: LexicalTextareaModel['editor'];
  feedback: LexicalTextareaModel['feedback'];
  label?: string;
  required?: boolean;
  placeholder?: string;
  placeholderColor?: string;
  variant: LexicalTextVariant;
}

/** Editable document and its Lexical plugins share a single composer and document ref. */
export function LexicalTextareaEditor({ id, editor, feedback, label, required, placeholder, placeholderColor, variant }: EditorProps) {
  return (
    <Box className={cx('LexicalTextareaEditor', styles.LexicalTextareaEditor)}>
      <EditorRefPlugin editorRef={editor.ref} />
      <ContentSyncPlugin
          content={editor.content}
          contentSignature={editor.signature}
          variableLookup={editor.variables}
          onSync={editor.sync}
      />
      <VariablesPlugin variableLookup={editor.variables} />
      <VariableSelectionPlugin />
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin validateUrl={isAllowedLink} />
      <OnChangePlugin ignoreSelectionChange onChange={editor.change} />
      <RichTextPlugin
          contentEditable={
            <ContentEditable
                id={id}
                className={cx(styles.ContentEditable, richTextClasses.RichText, richTextClasses[variant])}
                aria-labelledby={label ? `${id}-label` : undefined}
                aria-describedby={feedback.id}
                aria-invalid={Boolean(feedback.error)}
                aria-required={required || undefined}
                onBlur={editor.blur}
            />
          }
          placeholder={placeholder ? (
            <Text
                as='div'
                variant={['body', 'body', 'body']}
                color={placeholderColor}
                className={styles.Placeholder}
            >{placeholder}</Text>
          ) : null}
          ErrorBoundary={LexicalErrorBoundary}
      />
    </Box>
  );
}
