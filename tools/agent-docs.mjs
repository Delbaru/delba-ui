import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, symlinkSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

function markdownFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
        const file = path.join(directory, item.name);
        return item.isDirectory() ? markdownFiles(file) : item.isFile() && item.name.endsWith('.md') ? [file] : [];
    });
}

/** Local links expose the same skill to Claude without copying its metadata or body. */
function claudeLink(link, source, mode) {
    const stat = lstatSync(link, { throwIfNoEntry: false });
    if (stat && !stat.isSymbolicLink()) throw new Error(`${link}: ожидается ссылка, а не отдельная копия навыка`);
    if (stat) {
        if (existsSync(link) && realpathSync(link) === realpathSync(source)) return;
        if (mode === 'check') throw new Error(`${link}: ссылка неверна; запусти agents:sync`);
        unlinkSync(link);
    } else if (mode === 'check') {
        throw new Error(`${link}: ссылка отсутствует; запусти agents:sync`);
    }
    mkdirSync(path.dirname(link), { recursive: true });
    symlinkSync(
        process.platform === 'win32' ? source : path.relative(path.dirname(link), source),
        link,
        process.platform === 'win32' ? 'junction' : 'dir',
    );
}

function metadata(file) {
    const content = read(file);
    const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(content);
    if (!match) throw new Error(`${file}: отсутствует YAML frontmatter`);
    const field = (key) => {
        const fields = [...match[1].matchAll(new RegExp(`^${key}:([^\\n]*)$`, 'gm'))];
        if (fields.length !== 1) throw new Error(`${file}: нужен один ${key}`);
        const value = fields[0][1].trim();
        if (value.startsWith('"')) {
            const decoded = JSON.parse(value);
            if (typeof decoded !== 'string') throw new Error(`${file}: ${key} должен быть строкой`);
            return decoded;
        }
        if (value.startsWith("'")) {
            if (!/^'(?:[^']|'')*'$/.test(value)) throw new Error(`${file}: неверные кавычки ${key}`);
            return value.slice(1, -1).replace(/''/g, "'");
        }
        if (!value || /:\s|\s#|^[\[\{!&*|>]/.test(value) || /^(?:true|false|null|~|[-+]?\d+(?:\.\d+)?)$/i.test(value)) {
            throw new Error(`${file}: ${key} должен быть строкой; описание с двоеточием заключи в кавычки`);
        }
        return value;
    };
    const name = field('name');
    const description = field('description');
    if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) {
        throw new Error(`${file}: неверное имя навыка`);
    }
    if (!description || description.length > 1024 || /[<>]/.test(description)) {
        throw new Error(`${file}: неверное описание навыка`);
    }
    if (name !== path.basename(path.dirname(file))) throw new Error(`${file}: имя не совпадает с папкой`);
    return { name };
}

/** Checks file targets, not remote pages or historical paragraph anchors. */
function checkLinks(file, diagnostics) {
    const content = read(file);
    for (const match of content.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
        const href = match[1].trim().replace(/^<|>$/g, '');
        if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href)) continue;
        const target = href.split('#')[0];
        if (target && !existsSync(path.resolve(path.dirname(file), decodeURIComponent(target)))) {
            const line = content.slice(0, match.index).split('\n').length;
            diagnostics.push(`${file}:${line}: отсутствует ${target}`);
        }
    }
}

export function run(mode, roots) {
    if (!['check', 'sync'].includes(mode) || !roots.length) {
        throw new Error('Usage: node tools/agent-docs.mjs check|sync <repository> [...]');
    }
    const diagnostics = [];
    let count = 0;
    for (const directory of roots) {
        const root = path.resolve(directory);
        const agents = path.join(root, 'AGENTS.md');
        const kilo = path.join(root, 'kilo.jsonc');
        const sources = path.join(root, '.agents/skills');
        if (![agents, sources, kilo].every(existsSync)) {
            diagnostics.push(`${root}: нужны AGENTS.md, kilo.jsonc и .agents/skills`);
            continue;
        }
        const entry = read(agents);
        if (Buffer.byteLength(entry) > 32768) diagnostics.push(`${agents}: превышен бюджет 32 KiB`);
        if (!/"instructions"\s*:\s*\[[\s\S]*?"AGENTS\.md"/.test(read(kilo))) {
            diagnostics.push(`${kilo}: instructions должны включать AGENTS.md`);
        }
        const files = [agents];
        for (const folder of readdirSync(sources, { withFileTypes: true })
            .filter((item) => item.isDirectory())
            .sort((a, b) => a.name.localeCompare(b.name))) {
            const canonical = path.join(sources, folder.name, 'SKILL.md');
            if (!existsSync(canonical)) {
                diagnostics.push(`${canonical}: отсутствует источник навыка`);
                continue;
            }
            try {
                const skill = metadata(canonical);
                claudeLink(path.join(root, '.claude/skills', skill.name), path.dirname(canonical), mode);
                if (!entry.includes(`.agents/skills/${skill.name}/SKILL.md`)) {
                    diagnostics.push(`${agents}: нет маршрута к ${skill.name}`);
                }
                files.push(...markdownFiles(path.dirname(canonical)));
                count++;
            } catch (error) {
                diagnostics.push(error.message);
            }
        }
        const links = path.join(root, '.claude/skills');
        if (existsSync(links)) {
            for (const folder of readdirSync(links, { withFileTypes: true })) {
                if (!existsSync(path.join(sources, folder.name, 'SKILL.md'))) {
                    diagnostics.push(`${links}/${folder.name}: нет канонического источника`);
                }
            }
        }
        for (const name of ['agents.md', 'project.md', 'development.md', 'Library.md', 'authoring.md', 'backend.md', 'frontend.md']) {
            const file = path.join(root, 'docs', name);
            if (existsSync(file)) files.push(file);
        }
        for (const file of files) checkLinks(file, diagnostics);
    }
    for (const message of diagnostics) process.stderr.write(`${message}\n`);
    if (!diagnostics.length) process.stdout.write(`Agent docs: ${roots.length} repositories, ${count} skills; ${mode} OK\n`);
    return diagnostics.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        process.exitCode = run(process.argv[2], process.argv.slice(3));
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    }
}
