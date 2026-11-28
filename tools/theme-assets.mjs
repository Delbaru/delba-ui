import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function writeChanged(file, content) {
    try { if (await readFile(file, 'utf8') === content) return false; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, 'utf8');
    return true;
}

const TWEMOJI_COMMIT = '50c7abfe6813680455781862f7b34305cd1eb9f5';
const TWEMOJI_VERSION = '16.0.1';
const TWEMOJI_SOURCE = `https://raw.githubusercontent.com/jdecked/twemoji/${TWEMOJI_COMMIT}`;

/** Vendor a passed palette from pinned upstream SVGs; product registry and paths belong to the host. */
export async function vendorEmojiAssets({ root, emojis, directory, manifest }) {
    const output = path.resolve(root, directory);
    const assets = {};
    for (const emoji of new Set(emojis)) {
        if (typeof emoji !== 'string' || !/^\p{Extended_Pictographic}/u.test(emoji))
            throw new Error('Emoji assets require a pictographic palette');
        const file = [...emoji.replace(/\ufe0f/g, '')].map(char => char.codePointAt(0).toString(16)).join('-') + '.svg';
        const response = await fetch(`${TWEMOJI_SOURCE}/assets/svg/${file}`);
        if (!response.ok) throw new Error(`Missing pinned asset ${file}: ${response.status}`);
        const svg = await response.text();
        if (!/^<svg\b/.test(svg) || /<(?:script|foreignObject|image|use|style)\b|(?:href|on\w+)\s*=|url\s*\(/i.test(svg))
            throw new Error(`Unsafe emoji SVG ${file}`);
        await writeChanged(path.join(output, file), svg);
        assets[emoji] = { file, sha256: createHash('sha256').update(svg).digest('hex') };
    }
    const license = await fetch(`${TWEMOJI_SOURCE}/LICENSE-GRAPHICS`);
    if (!license.ok) throw new Error('Missing graphics license');
    await writeChanged(path.join(output, 'LICENSE-GRAPHICS.txt'), (await license.text()).replace(/[\t ]+$/gm, ''));
    await writeChanged(path.join(output, 'ATTRIBUTION.txt'), `Twemoji graphics v${TWEMOJI_VERSION}\nCopyright Twitter, Inc. and other contributors.\nProject: https://github.com/jdecked/twemoji\nExact source: ${TWEMOJI_SOURCE}\nGraphics licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).\nLicense: https://creativecommons.org/licenses/by/4.0/\nLocal full license: ./LICENSE-GRAPHICS.txt\nThese SVG files are unmodified. Only the host palette is included.\n`);
    await writeChanged(path.resolve(root, manifest), JSON.stringify({ version: TWEMOJI_VERSION, commit: TWEMOJI_COMMIT, assets }, null, 2) + '\n');
    return Object.keys(assets).length;
}
