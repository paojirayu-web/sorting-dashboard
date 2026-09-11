import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    buildReasonsDetail,
    buildReasonsList,
    formatReasonsCodewareLabel,
    parseReasonsDetailParams,
    parseReasonsListParams,
    reasonsFocusHref,
    REASONS_CODEWARE_TOP_N,
    REASONS_MAX_PAGE_SIZE,
    REASONS_MONTH_LABELS,
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

const detailParsed = parseReasonsDetailParams({
    rsn: ' Hairline crack ',
    year: '2569',
    kind: 'reject',
    unit: 'WW_WHITE',
    shape: 'mug',
    forming: 'JIG',
    customer: 'A',
    glaze: 'T',
    cp: 'C1',
}, now);
assert.equal(detailParsed.rsn, 'Hairline crack');
assert.equal(detailParsed.year, 2026);
assert.equal(detailParsed.kind, 'reject');
assert.equal(detailParsed.unit, 'WW_WHITE');
assert.equal(parseReasonsDetailParams({}, now).rsn, '');
assert.equal(parseReasonsDetailParams({}, now).kind, 'scrap');

assert.equal(formatReasonsCodewareLabel({ pt_desc1: ' CUP 12 ', pt_desc2: 'OG', m_part: '143001' }), 'CUP 12 (OG)');
assert.equal(formatReasonsCodewareLabel({ pt_desc1: 'CUP 12', pt_desc2: 'x', m_part: '142001' }), 'CUP 12');
assert.equal(formatReasonsCodewareLabel({ pt_desc1: '  ', pt_desc2: 'OG', m_part: '143001' }), '');

assert.equal(
    reasonsFocusHref({ rsn: 'Crack', year: 2569, kind: 'reject' }),
    '/reasons?rsn=Crack&year=2569&kind=reject',
);

const detailRows = [
    { mo: 1, code: 'A12', qty: 40 },
    { mo: 2, code: 'A12', qty: 60 },
    { mo: 1, code: 'B9', qty: 30 },
    { mo: 3, code: '', qty: 10 },
    { mo: 1, code: 'C1', qty: 5 },
];
const detail = buildReasonsDetail(detailRows, {
    rsn: 'Crack',
    year: 2026,
    kind: 'scrap',
}, { generatedAt: '2026-09-11 04:00', stale: true, topN: 2 });

assert.equal(detail.trend.length, 12);
assert.equal(detail.trend[0].label, REASONS_MONTH_LABELS[0]);
assert.equal(detail.trend[0].qty, 75);
assert.equal(detail.trend[1].qty, 60);
assert.equal(detail.meta.qty, 145);
assert.equal(detail.meta.stale, true);
assert.equal(detail.meta.rsn, 'Crack');
assert.equal(detail.codeware.length, 2);
assert.equal(detail.codeware[0].code, 'A12');
assert.equal(detail.codeware[0].qty, 100);
assert.equal(detail.codeware[0].pct, 100 * (100 / 145));
assert.equal(detail.codeware[1].code, 'B9');
assert.ok(REASONS_CODEWARE_TOP_N >= 1);

const source = readFileSync(join(process.cwd(), 'src/lib/reasons-query.ts'), 'utf8');
const sqlBlocks = [...source.matchAll(/`([\s\S]*?)`/g)].map((m) => m[1]);
assert.ok(sqlBlocks.some((block) => /SELECT/i.test(block) && /GROUP BY/i.test(block)));
assert.ok(sqlBlocks.some((block) => /@rsn/.test(block) && /pt_desc1/.test(block)));
for (const block of sqlBlocks) {
    assert.doesNotMatch(block, /\b(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|ALTER|DROP|CREATE)\b/i);
}

const route = readFileSync(join(process.cwd(), 'src/app/api/reasons/route.ts'), 'utf8');
assert.match(route, /export async function GET/);
assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);

const detailRoute = readFileSync(join(process.cwd(), 'src/app/api/reasons/detail/route.ts'), 'utf8');
assert.match(detailRoute, /export async function GET/);
assert.doesNotMatch(detailRoute, /export async function (POST|PUT|PATCH|DELETE)/);
assert.match(detailRoute, /rsn is required/);

const page = readFileSync(join(process.cwd(), 'src/components/dashboard/ReasonsPage.tsx'), 'utf8');
assert.match(page, /\/api\/reasons\/detail/);
assert.match(page, /if \(!isFocus\)/);
assert.match(page, /if \(isFocus\)/);
assert.doesNotMatch(page, /WW_WHITE|WW_BLACK|setShape|setForming|setCustomer|setGlaze/);

console.log('check-reasons-list: ok');
