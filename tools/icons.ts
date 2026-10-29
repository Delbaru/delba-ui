import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT = fileURLToPath(new URL('../src/core/inline-icons.ts', import.meta.url));

/** Local public icons are trusted build assets; remote URLs keep the runtime fetch path. */
export function collectInlineIcons(root: string): Record<string, string> {
    const icons: Record<string, string> = {};
    const directory = path.join(root, 'public', 'icons');
    function visit(dir: string) {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const file = path.join(dir, entry.name);
            if (entry.isDirectory()) visit(file);
            else if (entry.isFile() && entry.name.endsWith('.svg')) {
                const url = `/icons/${path.relative(directory, file).split(path.sep).map(encodeURIComponent).join('/')}`;
                const svg = fs.readFileSync(file, 'utf8');
                if (!/<svg\b[^>]*>[\s\S]*<\/svg>/i.test(svg)) throw new Error(`Invalid local SVG: ${file}`);
                icons[url] = svg;
            }
        }
    }
    visit(directory);
    return icons;
}

/** The same generated module initializes Icon before both SSR and hydration. */
export function generateInlineIcons(root: string, output = OUTPUT): boolean {
    const content = `// AUTO-GENERATED: tools/icons.ts. Do not edit.\nexport const INLINE_ICONS: Record<string, string> = ${JSON.stringify(collectInlineIcons(root))};\n`;
    if (fs.existsSync(output) && fs.readFileSync(output, 'utf8') === content) return false;
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, content, 'utf8');
    return true;
}
