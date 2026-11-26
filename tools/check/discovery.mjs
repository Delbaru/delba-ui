import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

// Browser specs and compile-only fixtures belong to their own runners.
export function discoverTests(root, directories) {
    const visit = directory => !existsSync(directory) ? [] :
        readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) return ['node_modules', '.git'].includes(entry.name) ? [] : visit(file);
            return entry.isFile() && /\.test\.(?:[cm]?[jt]s|tsx|jsx)$/.test(entry.name) ? [file] : [];
        });
    return [...new Set(directories.flatMap(directory => visit(path.join(root, directory)))
        .map(file => path.relative(root, file)))].sort();
}
