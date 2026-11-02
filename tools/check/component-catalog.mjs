import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/** Actual callable TSX exports from every source-backed package entry, including dedicated subpaths. */
export function publicComponents(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const entries = Object.entries(pkg.exports).flatMap(([entry, target]) => {
    const file = typeof target === 'string' ? target : target.default;
    return typeof file === 'string' && file.startsWith('./src/') && /\.tsx?$/.test(file) ? [{ entry, file: path.resolve(root, file) }] : [];
  });
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const program = ts.createProgram([...new Set([...parsed.fileNames, ...entries.map(({ file }) => file)])], parsed.options);
  const checker = program.getTypeChecker();
  const components = new Map();
  for (const { entry, file } of entries) {
    const source = program.getSourceFile(file);
    const symbol = source && checker.getSymbolAtLocation(source);
    if (!symbol) throw new Error(`Cannot resolve package entry ${entry}: ${file}`);
    for (const exported of checker.getExportsOfModule(symbol)) {
      const value = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      const declaration = value.valueDeclaration;
      if (!/^[A-Z]/.test(exported.name) || !declaration?.getSourceFile().fileName.endsWith('.tsx')) continue;
      const type = checker.getTypeOfSymbolAtLocation(value, declaration);
      if (!type.getCallSignatures().length) continue;
      const existing = components.get(exported.name);
      if (existing) existing.entries.push(entry);
      else components.set(exported.name, { name: exported.name, source: declaration.getSourceFile().fileName, entries: [entry] });
    }
  }
  return [...components.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function checkComponentCatalog(root) {
  const directory = path.join(root, 'docs/specs/ui/components');
  const catalog = fs.readFileSync(path.join(directory, 'README.md'), 'utf8');
  return publicComponents(root).flatMap(({ name, entries }) => {
    const problems = [];
    if (!fs.existsSync(path.join(directory, `${name}.md`))) problems.push(`${name}: нет отдельной спецификации (exports: ${entries.join(', ')}).`);
    if (!catalog.includes(`[${name}](${name}.md)`)) problems.push(`${name}: нет строки в каталоге публичных компонентов.`);
    return problems;
  });
}
