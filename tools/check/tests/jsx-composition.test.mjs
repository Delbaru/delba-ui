import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import { checkJsxComposition } from '@delba/eslint';

const inspect = code => checkJsxComposition(ts.createSourceFile('fixture.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX));
test('complex local map and render helpers remain visible as warnings', () => {
    const issues = inspect(`function Panel() {
        const rows = items.flatMap(item => <Box><Row><Text><Icon /></Text></Row></Box>);
        function renderHeader() { return <Box><Row><Text /></Row></Box>; }
        const renderFooter = () => <Box><Row><Text /></Row></Box>;
        return <Box>{rows}{renderHeader()}{renderFooter()}</Box>;
    }`);
    assert.equal(issues.length, 3);
    assert.ok(issues.every(issue => issue.severity === 'warning'));
});
test('small values, inline slots, ordinary map and render props remain legal', () => {
    assert.deepEqual(inspect(`function Panel() {
        const rows = items.map(item => <Text />);
        const label = <Text />;
        return <Box header={<Box><Row><Text /></Row></Box>} renderItem={() => <Box><Row><Text /></Row></Box>}>{rows}{label}</Box>;
    }`), []);
});

test('map and flatMap short expression and block returns are legal', () => {
    assert.deepEqual(inspect(`function Panel() {
        const rows = items.map(item => <Box><Row><Text /></Row></Box>);
        const cells = items.flatMap(item => { return [<Box><Row><Text /></Row></Box>]; });
        return <Box>{rows}{cells}</Box>;
    }`), []);
});

test('complex mapped block, branching and nested callbacks remain warnings', () => {
    const issues = inspect(`function Panel() {
        const rows = items.map(item => { return <Box><A /><B /><C /><D /></Box>; });
        const cells = items.flatMap(item => <Box>{item.ready ? <Row /> : <Text />}</Box>);
        const nested = items.map(item => <Box>{item.rows.map(row => <Row><Text><Icon /></Text></Row>)}</Box>);
        return <Box>{rows}{cells}{nested}</Box>;
    }`);
    assert.equal(issues.length, 3);
    assert.ok(issues.every(issue => issue.severity === 'warning'));
});
