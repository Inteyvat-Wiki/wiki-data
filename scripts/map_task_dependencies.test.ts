import test from 'node:test';
import assert from 'node:assert/strict';
import { isMapTaskDependencies } from '@inteyvat-wiki/wiki-contracts/map';
import { build_map_task_dependencies } from '../src/map_task_dependencies';
import configuration from '../src/data/map_task_dependencies';

const step = (task: string, step: number) => ({ task, step });
const graph = (edges: unknown[]) => ({ schema: 1, sameTaskOrder: 'ascending', edges });
test('dependency guard includes the implicit same-task order in cycle detection', () => {
    assert(isMapTaskDependencies(configuration));
    assert(!isMapTaskDependencies(graph([{ from: step('a', 2), to: step('a', 1) }])));
    assert(!isMapTaskDependencies(graph([
        { from: step('a', 2), to: step('b', 1) }, { from: step('b', 2), to: step('a', 1) },
    ])));
    assert(!isMapTaskDependencies(graph([{ from: step('72167', 1), to: step('b', 1) }])));
    assert(!isMapTaskDependencies(graph([{ from: { ...step('a', 1), rawId: 123 }, to: step('b', 1) }])));
    const edge = { from: step('a', 1), to: step('b', 1) };
    assert(!isMapTaskDependencies(graph([edge, edge])));
});
test('export checks converted task and step identities and constructs a detached document', () => {
    const value = graph([{ from: step('a', 1), to: step('b', 2) }]);
    const refs = new Map([[10001, { ...step('a', 1), title: '', subtitle: '' }], [20009, { ...step('b', 2), title: '', subtitle: '' }]]);
    const result = build_map_task_dependencies(value, refs);
    assert.deepEqual(result, value);
    assert.notEqual(result.edges, value.edges);
    assert.throws(() => build_map_task_dependencies(value, new Map()), /endpoint is not exported/);
    assert.throws(() => build_map_task_dependencies({ ...value, futureSourceField: 1 }, refs), /Invalid/);
});
