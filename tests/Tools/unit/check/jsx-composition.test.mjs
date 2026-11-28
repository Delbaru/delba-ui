import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import { checkJsxComposition } from '@delba/eslint';

const inspect = code => checkJsxComposition(ts.createSourceFile('fixture.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX));
test('complex local map and render helpers remain visible as warnings', () => {
    const issues = inspect(`function Panel() {
        const rows = items.flatMap(item => <Flex><Row><Text><Icon /></Text></Row></Flex>);
        function renderHeader() { return <Flex><Row><Text /></Row></Flex>; }
        const renderFooter = () => <Flex><Row><Text /></Row></Flex>;
        return <Flex>{rows}{renderHeader()}{renderFooter()}</Flex>;
    }`);
    assert.equal(issues.length, 3);
    assert.ok(issues.every(issue => issue.severity === 'warning'));
});
test('small values, inline slots, ordinary map and render props remain legal', () => {
    assert.deepEqual(inspect(`function Panel() {
        const rows = items.map(item => <Text />);
        const label = <Text />;
        return <Flex header={<Flex><Row><Text /></Row></Flex>} renderItem={() => <Flex><Row><Text /></Row></Flex>}>{rows}{label}</Flex>;
    }`), []);
});

test('map and flatMap short expression and block returns are legal', () => {
    assert.deepEqual(inspect(`function Panel() {
        const rows = items.map(item => <Flex><Row><Text /></Row></Flex>);
        const cells = items.flatMap(item => { return [<Flex><Row><Text /></Row></Flex>]; });
        return <Flex>{rows}{cells}</Flex>;
    }`), []);
});

test('complex mapped block, branching and nested callbacks remain warnings', () => {
    const issues = inspect(`function Panel() {
        const rows = items.map(item => { return <Flex><A /><B /><C /><D /></Flex>; });
        const cells = items.flatMap(item => <Flex>{item.ready ? <Row /> : <Text />}</Flex>);
        const nested = items.map(item => <Flex>{item.rows.map(row => <Row><Text><Icon /></Text></Row>)}</Flex>);
        return <Flex>{rows}{cells}{nested}</Flex>;
    }`);
    assert.equal(issues.length, 3);
    assert.ok(issues.every(issue => issue.severity === 'warning'));
});
