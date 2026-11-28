import { LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { Flex } from '../../Flex';
import { Text } from '../../Text';
import { VariableNode } from '../lexical/VariableNode/VariableNode';
import { LexicalTextareaEditor } from '../LexicalTextareaEditor/LexicalTextareaEditor';
import { LexicalTextareaToolbar } from '../LexicalTextareaToolbar/LexicalTextareaToolbar';
import type { useLexicalTextareaSurface } from '../LexicalTextarea.model';
import styles from './LexicalTextareaField.module.scss';

const editorConfig = {
    namespace: 'SocratLexicalTextarea',
    onError: (error: Error) => {
        throw error;
    },
    nodes: [VariableNode, ListNode, ListItemNode, LinkNode],
    theme: { text: { underline: styles.underline } },
};
const toolbarBorder = 'calc(1 * var(--rpx)) solid var(--line)';

export function LexicalTextareaField({
    layout,
    color,
    state,
    focus,
    id,
    editor,
    feedback,
    label,
    required,
    placeholder,
    placeholderColor,
    variant,
    hasVariables,
    allowLink,
    counter,
}: ReturnType<typeof useLexicalTextareaSurface>['field']) {
    return (
        <Flex
            {...layout}
            dir={['column', 'column', 'column']}
            position={['relative', 'relative', 'relative']}
            grow={[1, 1, 1]}
            minH={layout.minH ?? [220, 220, 220]}
            className={styles.LexicalTextareaField}
            style={{ color }}
            data-state={state}
            state={state}
            data-ui-preset-field=""
            role="presentation"
            onClick={focus}
        >
            <LexicalComposer initialConfig={editorConfig}>
                <LexicalTextareaEditor
                    id={id}
                    editor={editor}
                    feedback={feedback}
                    label={label}
                    required={required}
                    placeholder={placeholder}
                    placeholderColor={placeholderColor}
                    variant={variant}
                />

                <Flex
                    dir={['row', 'row', 'row']}
                    justify={['space_between', 'space_between', 'space_between']}
                    align={['center', 'center', 'center']}
                    wrap={['wrap', 'wrap', 'wrap']}
                    gap={[16, 8, 16]}
                    mt={[16, 16, 16]}
                    pt={[16, 16, 16]}
                    borderT={[toolbarBorder, toolbarBorder, toolbarBorder]}
                >
                    <LexicalTextareaToolbar hasVariables={hasVariables} allowLink={allowLink} />

                    {counter.visible && (
                        <Text
                            variant={['caption', 'caption', 'caption']}
                            color="var(--text-muted)"
                            whiteSpace={['nowrap', 'nowrap', 'nowrap']}
                            lineHeight={[1, 1, 1]}
                        >
                            {counter.maxLength != null
                                ? `${counter.characters} / ${counter.maxLength}`
                                : counter.characters}
                        </Text>
                    )}
                </Flex>
            </LexicalComposer>
        </Flex>
    );
}
