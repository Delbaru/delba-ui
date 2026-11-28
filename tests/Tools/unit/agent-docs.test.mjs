import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { run } from '../../../tools/agent-docs.mjs';

function fixture(t) {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'ui-agent-docs-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const root = path.join(directory, 'repo');
    const toolkit = path.join(directory, 'toolkit');
    const skillsDir = path.join(directory, 'installed');
    const name = 'delba-browser';
    const write = (filename, content) => {
        mkdirSync(path.dirname(filename), { recursive: true });
        writeFileSync(filename, content);
    };
    const skill = (directory, skillName = name) => write(path.join(directory, 'SKILL.md'),
        `---\nname: ${skillName}\ndescription: Fixture skill\n---\n`);
    const link = (target, destination) => {
        mkdirSync(path.dirname(destination), { recursive: true });
        symlinkSync(target, destination, process.platform === 'win32' ? 'junction' : 'dir');
    };
    mkdirSync(path.join(root, '.agents/skills'), { recursive: true });
    write(path.join(root, 'AGENTS.md'), '# Owner\n');
    write(path.join(root, 'kilo.jsonc'), '{"instructions":["AGENTS.md"]}');
    const target = path.join(toolkit, 'skills', name);
    const installed = path.join(skillsDir, name);
    const claude = path.join(root, '.claude/skills', name);
    skill(target);
    link(target, installed);
    link(installed, claude);
    const manifest = { version: 1, owner: 'delba-toolkit', root: toolkit, skillsDir,
        skills: [{ name, path: installed, target }] };
    const manifestFile = path.join(directory, 'state/install.json');
    const saveManifest = () => write(manifestFile, JSON.stringify(manifest));
    saveManifest();
    const check = (mode = 'check') => {
        const stdout = process.stdout.write;
        const stderr = process.stderr.write;
        let output = '';
        process.stdout.write = process.stderr.write = (chunk) => { output += chunk; return true; };
        try {
            return { code: run(mode, [root], { sharedManifest: manifestFile }), output };
        } finally {
            process.stdout.write = stdout;
            process.stderr.write = stderr;
        }
    };
    return { root, name, target, installed, claude, manifest, manifestFile, saveManifest, skill, link, write, check };
}

test('accepts the installed junction chain authorized by its installer manifest in check and sync', (t) => {
    const f = fixture(t);
    const original = readlinkSync(f.claude);
    assert.equal(f.check().code, 0);
    assert.equal(f.check('sync').code, 0);
    assert.equal(readlinkSync(f.claude), original);
});

test('does not allow a shared-looking name without a manifest entry', (t) => {
    const f = fixture(t);
    f.manifest.skills = [];
    f.saveManifest();
    assert.match(f.check().output, /нет канонического источника/);
    rmSync(f.manifestFile);
    assert.equal(f.check().code, 1);
});

test('rejects missing canonical target and broken installed links', (t) => {
    const f = fixture(t);
    rmSync(f.target, { recursive: true });
    assert.match(f.check().output, /неверная установленная shared ссылка/);
});

test('rejects a foreign target even with the same skill name and content', (t) => {
    const f = fixture(t);
    const foreign = path.join(path.dirname(f.root), 'foreign', f.name);
    f.skill(foreign);
    rmSync(f.claude);
    f.link(foreign, f.claude);
    const foreignLink = readlinkSync(f.claude);
    assert.equal(f.check().code, 1);
    assert.equal(f.check('sync').code, 1);
    assert.equal(readlinkSync(f.claude), foreignLink);
});

test('rejects redirected installed links and directory copies', (t) => {
    const f = fixture(t);
    rmSync(f.installed);
    f.skill(f.installed);
    assert.equal(f.check().code, 1);
    rmSync(f.claude);
    f.skill(f.claude);
    assert.equal(f.check().code, 1);
});

test('rejects installed links redirected away from the recorded source', (t) => {
    const f = fixture(t);
    const foreign = path.join(path.dirname(f.root), 'foreign', f.name);
    f.skill(foreign);
    rmSync(f.installed);
    f.link(foreign, f.installed);
    assert.match(f.check().output, /неверная установленная shared ссылка/);
});

test('local canonical skill wins over a shared name collision', (t) => {
    const f = fixture(t);
    f.skill(path.join(f.root, '.agents/skills', f.name));
    f.write(path.join(f.root, 'AGENTS.md'), `.agents/skills/${f.name}/SKILL.md\n`);
    assert.match(f.check().output, /ссылка неверна/);
});

test('local canonical symlink also retains collision protection', (t) => {
    const f = fixture(t);
    const localSource = path.join(path.dirname(f.root), 'local-source', f.name);
    f.skill(localSource);
    f.link(localSource, path.join(f.root, '.agents/skills', f.name));
    f.write(path.join(f.root, 'AGENTS.md'), `.agents/skills/${f.name}/SKILL.md\n`);
    assert.match(f.check().output, /ссылка неверна/);
});

test('rejects forged ownership paths and duplicate manifest entries', (t) => {
    const f = fixture(t);
    f.manifest.skills.push({ ...f.manifest.skills[0] });
    f.saveManifest();
    assert.match(f.check().output, /неверное владение/);
    f.manifest.skills.pop();
    f.manifest.skills[0].target = f.root;
    f.saveManifest();
    assert.equal(f.check().code, 1);
});

test('keeps local link creation and orphan detection', (t) => {
    const f = fixture(t);
    const local = path.join(f.root, '.agents/skills/local');
    f.skill(local, 'local');
    f.write(path.join(f.root, 'AGENTS.md'), '.agents/skills/local/SKILL.md\n');
    assert.equal(f.check().code, 1);
    assert.equal(f.check('sync').code, 0);
    assert.equal(f.check().code, 0);
    f.link(f.target, path.join(f.root, '.claude/skills/orphan'));
    assert.match(f.check().output, /orphan.*нет канонического источника/);
});
