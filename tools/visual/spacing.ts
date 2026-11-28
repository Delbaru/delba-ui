import fs from 'node:fs';
import path from 'node:path';

export function collectSpacingValues(sourceRoots: readonly string[], settings?: unknown): number[] {
    const values = new Set<number>();
    const collect = (source: string) => {
        for (const match of source.matchAll(/\bvar\(\s*--s-(\d+)(?=[\s,)])/g)) {
            const value = Number(match[1]);
            if (!Number.isSafeInteger(value) || value % 4 !== 0 || String(value) !== match[1]) {
                throw new Error(`Spacing token --s-${match[1]} must be a multiple of four RPX`);
            }
            values.add(value);
        }
    };
    const visit = (directory: string) => {
        if (!fs.existsSync(directory)) return;
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            if (entry.isSymbolicLink() || ['node_modules', '.git', 'generated'].includes(entry.name)) continue;
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                visit(file);
                continue;
            }
            if (!/\.(css|scss|ts|tsx)$/.test(entry.name) || /\.(test|spec|type-test)\./.test(entry.name)) continue;
            const source = fs.readFileSync(file, 'utf8');
            if (/AUTO-GENERATED/.test(source.slice(0, 180))) continue;
            collect(source);
        }
    };
    for (const root of new Set(sourceRoots)) visit(root);
    const configured = JSON.stringify(settings);
    if (configured) collect(configured);
    return [...values].sort((left, right) => left - right);
}

export function watchSpacingValues(
    sourceRoots: readonly string[],
    settings: unknown,
    onChange: (values: readonly number[]) => void,
): () => void {
    let previous = collectSpacingValues(sourceRoots, settings).join(',');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watchers: fs.FSWatcher[] = [];
    try {
        for (const root of new Set(sourceRoots)) {
            if (!fs.existsSync(root)) continue;
            watchers.push(fs.watch(root, { recursive: true }, (_event, file) => {
                if (file && !/\.(css|scss|ts|tsx)$/.test(String(file))) return;
                clearTimeout(timer);
                timer = setTimeout(() => {
                    try {
                        const values = collectSpacingValues(sourceRoots, settings);
                        const next = values.join(',');
                        if (next === previous) return;
                        onChange(values);
                        previous = next;
                    } catch (error) {
                        console.error(error);
                    }
                }, 100);
            }));
        }
    } catch (error) {
        clearTimeout(timer);
        watchers.forEach(watcher => watcher.close());
        throw error;
    }
    return () => {
        clearTimeout(timer);
        watchers.forEach(watcher => watcher.close());
    };
}
