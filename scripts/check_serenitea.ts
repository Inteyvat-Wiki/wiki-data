import assert from 'node:assert/strict';
import { check_archive_category } from './archive_checks';
import { get_archive_excluded_ids } from '../src/utils/archive';

const records = [
    { id: 'host-1', type: 'host', relations: [] },
    { id: 'companion-2', type: 'companion', relations: [
        { category: 'serenitea', id: 'furniture-3', name: 'Original name', role: 'component' },
        { category: 'serenitea', id: 'suite-4', name: 'Set', role: 'suite' },
    ] },
    { id: 'furniture-3', type: 'furniture', relations: [] },
    { id: 'furniture-5', type: 'furniture', relations: [] },
    { id: 'suite-4', type: 'suite', relations: [] },
];
const snapshot = JSON.stringify(records);
assert.deepEqual([...get_archive_excluded_ids('serenitea', records)].sort(), ['furniture-3', 'host-1']);
assert.equal(get_archive_excluded_ids('tcg', records).size, 0);
assert.equal(get_archive_excluded_ids('miliastra', records).size, 0);
assert.equal(JSON.stringify(records), snapshot, 'scope selection must not mutate source records');
check_archive_category('serenitea', 2564, 2755);
