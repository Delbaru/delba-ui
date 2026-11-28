import assert from 'node:assert/strict';
import test from 'node:test';
import { EditSession } from '../../../src/core/Edit/EditSession';
import type { EditOptions } from '../../../src/core/Edit';

function deferred() {
    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<void>((done, fail) => {
        resolve = done;
        reject = fail;
    });
    return { promise, resolve, reject };
}

test('cancel restores the entry value and does not persist', () => {
    const writes: string[] = [];
    const editor = new EditSession({
        value: 'Original',
        onCommit: async (value) => {
            writes.push(value);
        },
    });
    editor.start();
    editor.change('Unsaved');
    editor.cancel();

    assert.equal(editor.getSnapshot().value, 'Original');
    assert.equal(editor.getSnapshot().editing, false);
    assert.equal(editor.getSnapshot().dirty, false);
    assert.deepEqual(writes, []);
});

test('a rejected save retains the draft and permits retry without an unhandled rejection', async () => {
    const writes: string[] = [];
    const failure = { message: 'Version conflict' };
    let reject = true;
    const options: EditOptions = {
        scope: 'task:item',
        value: 'Original',
        onCommit: async (value) => {
            writes.push(value);
            if (reject) throw failure;
        },
    };
    const editor = new EditSession(options);
    editor.start();
    editor.change('Retained');

    assert.equal(await editor.commit(), false);
    // A refreshed consumer/command callback must not replace the failed draft.
    editor.sync({ ...options });
    assert.deepEqual(editor.getSnapshot(), {
        value: 'Retained',
        editing: true,
        pending: false,
        dirty: true,
        hasError: true,
        error: failure,
    });

    reject = false;
    assert.equal(await editor.commit(), true);
    assert.equal(editor.getSnapshot().editing, false);
    assert.equal(editor.getSnapshot().hasError, false);
    assert.equal(editor.getSnapshot().value, 'Retained');
    assert.deepEqual(writes, ['Retained', 'Retained']);
});

test('Enter followed by blur shares one pending save and cannot cancel it', async () => {
    const work = deferred();
    let writes = 0;
    const editor = new EditSession({
        value: 'Original',
        onCommit: () => {
            writes += 1;
            return work.promise;
        },
    });
    editor.start();
    editor.change('Submitted');
    const first = editor.commit();
    assert.equal(editor.getSnapshot().pending, true);
    assert.equal(await editor.commit(), false);
    editor.cancel();
    editor.change('Must not replace submitted text');
    assert.equal(editor.getSnapshot().value, 'Submitted');
    work.resolve();
    assert.equal(await first, true);
    assert.equal(writes, 1);
});

test('scope reset discards the draft and ignores the previous save completion', async () => {
    const work = deferred();
    const editingChanges: boolean[] = [];
    const editor = new EditSession({
        scope: 'task-a:item',
        value: 'First',
        onCommit: () => work.promise,
    });
    editor.start();
    editor.change('Old draft');
    const saving = editor.commit();
    editor.sync({
        scope: 'task-b:item',
        value: 'Second',
        onCommit: async () => {},
        onEditingChange: (editing) => editingChanges.push(editing),
    });
    assert.equal(editor.getSnapshot().value, 'Second');
    assert.equal(editor.getSnapshot().pending, false);
    work.reject(new Error('Late failure'));
    assert.equal(await saving, false);
    assert.equal(editor.getSnapshot().hasError, false);
    assert.equal(editor.getSnapshot().editing, false);
    assert.deepEqual(editingChanges, []);
});

test('controlled drafts notify every change, restore on cancel and finish through onDone', async () => {
    let value = 'Description';
    let completed = 0;
    const options = (): EditOptions => ({
        value,
        onChange: (next) => {
            value = next;
        },
        onDone: () => {
            completed += 1;
        },
    });
    const editor = new EditSession(options());
    editor.start();
    editor.change('Draft');
    editor.sync(options());
    assert.equal(value, 'Draft');
    editor.cancel();
    editor.sync(options());
    assert.equal(value, 'Description');
    assert.equal(completed, 0);
    editor.start();
    editor.change('Finished');
    editor.sync(options());
    assert.equal(await editor.commit(), true);
    assert.equal(value, 'Finished');
    assert.equal(completed, 1);
});

test('creation resets only after success; blank input never sends a command', async () => {
    const writes: string[] = [];
    const editor = new EditSession({
        value: '',
        trim: true,
        allowEmpty: false,
        resetOnCommit: true,
        onCommit: async (value) => {
            writes.push(value);
        },
    });
    editor.start();
    editor.change('   ');
    await editor.commit();
    assert.deepEqual(writes, []);
    editor.start();
    editor.change('  New item  ');
    await editor.commit();
    assert.deepEqual(writes, ['New item']);
    assert.equal(editor.getSnapshot().value, '');
    assert.equal(editor.getSnapshot().editing, false);
});

test('external controlled editing snapshots the value on entry, including the first entry', () => {
    let value = 'First';
    const onChange = (next: string) => {
        value = next;
    };
    const editor = new EditSession({ value, editing: false, onChange });
    value = 'Latest';
    editor.sync({ value, editing: true, onChange });
    editor.change('Changed');
    editor.sync({ value, editing: true, onChange });
    editor.cancel();
    assert.equal(value, 'Latest');
});

test('loss of edit rights prevents starting or committing a new draft', async () => {
    let writes = 0;
    const editor = new EditSession({
        value: 'Read only',
        canEdit: false,
        onCommit: async () => {
            writes += 1;
        },
    });
    editor.start();
    editor.change('Blocked');
    assert.equal(await editor.commit(), false);
    assert.equal(editor.getSnapshot().value, 'Read only');
    assert.equal(writes, 0);
});

test('a server value refreshed during saving wins over the submitted snapshot', async () => {
    const work = deferred();
    const options: EditOptions = { value: 'Before', onCommit: () => work.promise };
    const editor = new EditSession(options);
    editor.start();
    editor.change('Submitted');
    const saving = editor.commit();
    editor.sync({ ...options, value: 'Server value' });
    work.resolve();
    assert.equal(await saving, true);
    assert.equal(editor.getSnapshot().value, 'Server value');
});

test('a falsy rejection remains an error and disposal suppresses late completion', async () => {
    const editor = new EditSession({ value: 'Before', onCommit: () => Promise.reject(null) });
    editor.start();
    editor.change('Retained');
    assert.equal(await editor.commit(), false);
    assert.equal(editor.getSnapshot().hasError, true);
    assert.equal(editor.getSnapshot().error, null);

    const work = deferred();
    editor.sync({ value: 'Before', onCommit: () => work.promise });
    const saving = editor.commit();
    let completedNotifications = 0;
    editor.subscribe(() => {
        completedNotifications += 1;
    });
    editor.dispose();
    work.resolve();
    assert.equal(await saving, false);
    assert.equal(completedNotifications, 0);
});
