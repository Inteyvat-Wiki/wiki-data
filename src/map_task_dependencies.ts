import fs from 'node:fs';
import path from 'node:path';
import { isMapTaskDependencies, type MapTaskDependencies } from '@inteyvat-wiki/wiki-contracts/map';
import configuration from '~/data/map_task_dependencies';
import { get_task_step_references } from './task';
import type { TaskStepReference } from './types/task';
import { get_output_root } from './utils/output';

/** Validate against the same converted identities used by the task page export. */
export function build_map_task_dependencies(value: unknown, references: ReadonlyMap<number, TaskStepReference>): MapTaskDependencies {
    if (!isMapTaskDependencies(value)) throw new Error('Invalid map task dependencies (shape, duplicate edge or cycle)');
    const available = new Set([...references.values()].map(ref => `${ref.task}:${ref.step}`));
    for (const edge of value.edges) for (const endpoint of [edge.from, edge.to]) {
        if (!available.has(`${endpoint.task}:${endpoint.step}`)) throw new Error(`Map task dependency endpoint is not exported: ${endpoint.task}:${endpoint.step}`);
    }
    // Explicit conversion: future properties in the maintained list never leak downstream.
    return { schema: 1, sameTaskOrder: 'ascending', edges: value.edges.map(edge => ({
        from: { task: edge.from.task, step: edge.from.step },
        to: { task: edge.to.task, step: edge.to.step },
    })) };
}

export function gen_map_task_dependencies(root = get_output_root()): MapTaskDependencies {
    const result = build_map_task_dependencies(configuration, get_task_step_references('zh_hans'));
    // Common identities must resolve in both supported language exports.
    build_map_task_dependencies(configuration, get_task_step_references('en'));
    const directory = path.join(root, 'common', 'map');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'task_dependencies.json'), JSON.stringify(result, null, 4), 'utf8');
    return result;
}
