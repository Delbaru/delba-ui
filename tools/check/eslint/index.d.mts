import type ts from 'typescript';
import type { Rule } from 'eslint';

export declare const plugin: { meta: { name: string; version: string }; rules: Record<string, Rule.RuleModule> };
export declare const rules: Record<string, Rule.RuleModule>;
export declare const importBoundariesRule: Rule.RuleModule;
export declare const namespacedHooksRule: Rule.RuleModule;
export declare const rpxJsxRule: Rule.RuleModule;
export declare const jsxGroupingRule: Rule.RuleModule;
export declare const jsxCompositionRule: Rule.RuleModule & {
  id: string;
  docs: string;
  check(source: ts.SourceFile): Array<{ line: number; column: number; severity: 'warning'; message: string; fix: string }>;
};
export declare const fileLengthRule: Rule.RuleModule & {
  id: string;
  docs: string;
  check(source: ts.SourceFile, options?: { max?: number }): Array<{ line: number; column: number; severity: 'warning'; message: string }>;
};
export declare const responsiveTupleRule: {
  id: string;
  docs: string;
  check(source: ts.SourceFile, options?: { checker?: ts.TypeChecker }): Array<{ line: number; column: number; severity: 'error'; message: string }>;
};
export declare function checkJsxComposition(source: ts.SourceFile): Array<{ line: number; column: number; severity: 'warning'; message: string; fix: string }>;
export declare function importBoundaryViolation(filename: string, specifier: string, typeOnly?: boolean, options?: { client?: boolean; root?: string }): string | null;
export declare function resolveImport(filename: string, specifier: string): string | null;
export declare function resolveProjectPath(filename: string, specifier: string, root?: string): string | null;
export declare function sourcePath(filename: string): string | null;
export declare function isTestSource(filename: string): boolean;
export declare function isTestTarget(target: string | null): boolean;
export declare function responsiveJsxProperty(checker: ts.TypeChecker, attribute: ts.JsxAttribute): boolean;
export declare function hasExplicitResponsiveTuple(expression: unknown): boolean;
export declare function hasExplicitResponsiveTupleTs(expression: ts.Expression | undefined): boolean;
export declare function checkImportBoundaries(root: string, options?: { dirs?: string[]; mode?: 'os' | 'consumer' | 'ui' }): Array<{ file: string; line: number; column: number; rule: string; severity: 'error'; message: string }>;
export declare function checkTestPlacement(root: string): string[];
