/** Документ Lexical из CMS/редактора. Неизвестные узлы проверяются внутри renderer. */
export interface LexicalDocument {
  root: { children: unknown[]; [key: string]: unknown };
}
