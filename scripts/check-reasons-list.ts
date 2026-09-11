import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    buildReasonsList,
    parseReasonsListParams,
    REASONS_MAX_PAGE_SIZE,
} from '../src/lib/reasons';

const now = new Date('2026-09-11T08:00:00+07:00');

const parsed = parseReasonsListParams({
    year: '2569',
    kind: 'reject',
    q: ' crack ',
    page: '2',
    pageSize: '250',
    rsn: 'Hairline crack',
    sort: 'pct',
    dir: 'asc',
}, now);

assert.equal(parsed.year, 2026);
assert.equal(parsed.kind, 'reject');
assert.equal(parsed.q, 'crack');
assert.equal(parsed.page, 2);
assert.equal(parsed.pageSize, REASONS_MAX_PAGE_SIZE);
assert.equal(parsed.sort, 'pct');
assert.equal(parsed.dir, 'asc');
assert.equal(parseReasonsListParams({}, now).year, 2026);
assert.equal(parseReasonsListParams({}, now).kind, 'scrap');

const rows = [
    { rsn: 'Crack', mo: 1, qty: 40 },
    { rsn: 'Crack', mo: 2, qty: 60 },
    { rsn: 'Pin hole', mo: 1, qty: 10 },
    { rsn: 'Chip', mo: 3, qty: 30 },
    { rsn: '', mo: 1, qty: 99 },
];

const list = buildReasonsList(rows, {
    year: 2026,
    kind: 'scrap',
    q: '',
    page: 1,
    pageSize: 2,
    rsn: '',
    sort: 'qty',
    dir: 'desc',
}, { generatedAt: '2026-09-11 04:00', stale: false });

assert.equal(list.meta.total, 3);
assert.equal(list.items.length, 2);
assert.equal(list.items[0].rsn, 'Crack');
assert.equal(list.items[0].qty, 100);
assert.equal(list.items[0].pct, 100 * (100 / 140));
assert.equal(list.items[0].spark.length, 12);
assert.equal(list.items[0].spark[0], 40);
assert.equal(list.items[0].spark[1], 60);
assert.equal(list.items[1].rsn, 'Chip');

const jumped = buildReasonsList(rows, {
    year: 2026,
    kind: 'scrap',
    q: '',
    page: 1,
    pageSize: 1,
    rsn: 'Pin hole',
    sort: 'qty',
    dir: 'desc',
});
assert.equal(jumped.meta.page, 3);
assert.equal(jumped.meta.selectedRsn, 'Pin hole');
assert.equal(jumped.items[0].rsn, 'Pin hole');

const filtered = buildReasonsList(rows, {
    year: 2026,
    kind: 'scrap',
    q: 'pin',
    page: 1,
    pageSize: 10,
    rsn: '',
    sort: 'qty',
    dir: 'desc',
});
assert.equal(filtered.meta.total, 1);
assert.equal(filtered.items[0].pct, 100 * (10 / 140));

const source = readFileSync(join(process.cwd(), 'src/lib/reasons-query.ts'), 'utf8');
const sqlBlocks = [...source.matchAll(/`([\s\S]*?)`/g)].map((m) => m[1]);
assert.ok(sqlBlocks.some((block) => /SELECT/i.test(block) && /GROUP BY/i.test(block)));
for (const block of sqlBlocks) {
    assert.doesNotMatch(block, /\b(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|ALTER|DROP|CREATE)\b/i);
}

const route = readFileSync(join(process.cwd(), 'src/app/api/reasons/route.ts'), 'utf8');
assert.match(route, /export async function GET/);
assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);

console.log('check-reasons-list: ok');
