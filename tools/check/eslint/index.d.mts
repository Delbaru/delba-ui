import type ts from 'typescript';

export declare const plugin: { meta: { name: string; version: string }; rules: Record<string, unknown> };
export declare const rules: Record<string, unknown>;
export declare const importBoundariesRule: unknown;
export declare const namespacedHooksRule: unknown;
export declare const rpxJsxRule: unknown;
export declare const jsxGroupingRule: unknown;
export declare const jsxCompositionRule: {
  id: string;
  docs: string;
  check(source: ts.SourceFile): Array<{ line: number; column: number; severity: 'warning'; message: string; fix: string }>;
};
export declare const fileLengthRule: {
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
