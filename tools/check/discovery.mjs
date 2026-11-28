import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

// Compile-only fixtures belong to TypeScript's project check.
export function discoverTests(root) {
    const visit = directory => !existsSync(directory) ? [] :
        readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) return ['node_modules', '.git'].includes(entry.name) ? [] : visit(file);
            return entry.isFile() && /\.test\.(?:[cm]?[jt]s|tsx|jsx)$/.test(entry.name) ? [file] : [];
        });
    return visit(path.join(root, 'tests')).map(file => path.relative(root, file)).sort();
}
