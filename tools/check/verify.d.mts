export interface VerifyResult {
  ok: boolean;
  output?: string;
  warnings?: string;
  signal?: NodeJS.Signals | null;
  diagnostics?: unknown[];
  summary?: { tests: number; failedFiles: number };
}
export interface VerifyStep {
  id?: string;
  name: string;
  required?: boolean;
  dependsOn?: string[];
  run(context: { failedOnly: boolean }): VerifyResult | Promise<VerifyResult>;
}
export interface VerifyOptions {
  label?: string;
  write?: (line: string) => void;
  color?: boolean;
  progress?: (name: string) => () => void;
  reportFile?: string;
  failedOnly?: boolean;
  profile?: unknown;
}
export function runNode(args: string[], cwd?: string): Promise<VerifyResult>;
export function runSteps(steps: VerifyStep[], options?: VerifyOptions): Promise<boolean>;
export function runNodeTests(options: {
  cwd?: string;
  files: string[];
  nodeArgs?: string[];
  stateFile?: string;
  failedOnly?: boolean;
}): Promise<VerifyResult>;
