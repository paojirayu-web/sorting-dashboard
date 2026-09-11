import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    buildReasonsDetail,
    buildReasonsList,
    classifyReasonsTone,
    defaultToneForFamily,
    formatReasonsCodewareLabel,
    parseReasonsDetailParams,
    parseReasonsFamily,
    parseReasonsListParams,
    parseReasonsTone,
    reasonsFocusHref,
    REASONS_CODEWARE_TOP_N,
    REASONS_FOCUS_TONES,
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

assert.equal(parseReasonsFamily(undefined), 'all');
assert.equal(parseReasonsFamily('WW'), 'ww');
assert.equal(parseReasonsFamily('dw'), 'dw');
assert.equal(parseReasonsTone('ww', null), 'white');
assert.equal(parseReasonsTone('ww', 'black'), 'black');
assert.equal(parseReasonsTone('ww', 'all'), 'all');
assert.equal(parseReasonsTone('dw', null), 'inglaze');
assert.equal(parseReasonsTone('dw', 'onglaze'), 'onglaze');
assert.equal(parseReasonsTone('all', null), 'white');
assert.equal(defaultToneForFamily('ww'), 'white');
assert.equal(defaultToneForFamily('dw'), 'inglaze');
assert.equal(defaultToneForFamily('all'), 'white');

assert.equal(classifyReasonsTone({ source: 'sdb' }), 'onglaze');
assert.equal(classifyReasonsTone({ partFamily: '143' }), 'inglaze');
assert.equal(classifyReasonsTone({ partFamily: '142', unitTone: 'W5240' }), 'white');
assert.equal(classifyReasonsTone({ partFamily: '142', unitTone: 'W5241' }), 'black');
assert.equal(classifyReasonsTone({ partFamily: '142' }), 'ww');

const rows = [
    { rsn: 'Crack', mo: 1, qty: 40, tone: 'white' as const },
    { rsn: 'Crack', mo: 2, qty: 60, tone: 'white' as const },
    { rsn: 'Pin hole', mo: 1, qty: 10, tone: 'white' as const },
    { rsn: 'Chip', mo: 3, qty: 30, tone: 'black' as const },
    { rsn: '', mo: 1, qty: 99, tone: 'white' as const },
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
    family: 'WW',
    tone: 'black',
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
assert.equal(detailParsed.family, 'ww');
assert.equal(detailParsed.tone, 'black');
assert.equal(parseReasonsDetailParams({}, now).rsn, '');
assert.equal(parseReasonsDetailParams({}, now).kind, 'scrap');
assert.equal(parseReasonsDetailParams({}, now).family, 'all');
assert.equal(parseReasonsDetailParams({}, now).tone, 'white');
assert.equal(parseReasonsDetailParams({ family: 'dw' }, now).tone, 'inglaze');

assert.equal(formatReasonsCodewareLabel({ pt_desc1: ' CUP 12 ', pt_desc2: 'OG', m_part: '143001' }), 'CUP 12 (OG)');
assert.equal(formatReasonsCodewareLabel({ pt_desc1: 'CUP 12', pt_desc2: 'x', m_part: '142001' }), 'CUP 12');
assert.equal(formatReasonsCodewareLabel({ pt_desc1: '  ', pt_desc2: 'OG', m_part: '143001' }), '');

assert.equal(
    reasonsFocusHref({ rsn: 'Crack', year: 2569, kind: 'reject' }),
    '/reasons?rsn=Crack&year=2569&kind=reject',
);
assert.equal(
    reasonsFocusHref({ rsn: 'Crack', year: 2569, kind: 'scrap', family: 'ww', tone: 'all' }),
    '/reasons?rsn=Crack&year=2569&kind=scrap&family=ww&tone=all',
);

const monthRows = [
    { rsn: 'Crack', mo: 1, qty: 75, tone: 'white' as const },
    { rsn: 'Crack', mo: 2, qty: 60, tone: 'white' as const },
    { rsn: 'Crack', mo: 3, qty: 10, tone: 'white' as const },
    { rsn: 'Crack', mo: 1, qty: 20, tone: 'black' as const },
    { rsn: 'OtherDefect', mo: 1, qty: 200, tone: 'white' as const },
    { rsn: 'OtherDefect', mo: 2, qty: 40, tone: 'inglaze' as const },
    { rsn: 'Crack', mo: 4, qty: 15, tone: 'inglaze' as const },
    { rsn: 'Crack', mo: 5, qty: 8, tone: 'onglaze' as const },
];
const detailRows = [
    { mo: 1, code: 'A12', qty: 40, tone: 'white' as const },
    { mo: 2, code: 'A12', qty: 60, tone: 'white' as const },
    { mo: 1, code: 'B9', qty: 30, tone: 'white' as const },
    { mo: 3, code: '', qty: 10, tone: 'white' as const },
    { mo: 1, code: 'C1', qty: 5, tone: 'white' as const },
    { mo: 1, code: 'BLK', qty: 20, tone: 'black' as const },
];
const detail = buildReasonsDetail(monthRows, detailRows, {
    rsn: 'Crack',
    year: 2026,
    kind: 'scrap',
    family: 'ww',
    tone: 'white',
}, { generatedAt: '2026-09-11 04:00', stale: true, topN: 2 });

assert.equal(detail.trend.length, 12);
assert.equal(detail.trend[0].label, REASONS_MONTH_LABELS[0]);
assert.equal(detail.trend[0].qty, 75);
assert.equal(detail.trend[1].qty, 60);
assert.equal(detail.trend[0].delta, null);
assert.equal(detail.trend[1].delta, -15);
assert.equal(detail.meta.qty, 145);
assert.equal(detail.meta.stale, true);
assert.equal(detail.meta.rsn, 'Crack');
assert.equal(detail.meta.rank, 2);
assert.equal(detail.meta.delta, -50);
assert.equal(detail.meta.peakMo, 1);
assert.ok(detail.trend[0].pct > 0);
assert.equal(detail.codeware.length, 2);
assert.equal(detail.codeware[0].code, 'A12');
assert.equal(detail.codeware[0].qty, 100);
assert.ok(detail.other);
assert.equal(detail.other?.code, 'Other');
assert.ok(detail.familyShare);
assert.equal(detail.familyShare?.length, 2);
assert.equal(detail.series, undefined);
assert.ok(REASONS_CODEWARE_TOP_N >= 15);

const allMode = buildReasonsDetail(monthRows, detailRows, {
    rsn: 'Crack',
    year: 2026,
    kind: 'scrap',
    family: 'all',
    tone: 'white',
}, { generatedAt: '2026-09-11 04:00', stale: false });
assert.equal(allMode.series?.length, 4);
assert.deepEqual(allMode.series?.map((s) => s.tone), [...REASONS_FOCUS_TONES]);
for (const series of allMode.series || []) {
    assert.equal(series.trend.length, 12);
}
assert.equal(allMode.activeTone, 'white');
assert.equal(allMode.codeware[0].code, 'A12');
assert.equal(allMode.familyShare, undefined);
const whiteQty = allMode.series?.find((s) => s.tone === 'white')?.meta.qty;
const blackQty = allMode.series?.find((s) => s.tone === 'black')?.meta.qty;
assert.equal(whiteQty, 145);
assert.equal(blackQty, 20);

const source = readFileSync(join(process.cwd(), 'src/lib/reasons-query.ts'), 'utf8');
const sqlBlocks = [...source.matchAll(/`([\s\S]*?)`/g)].map((m) => m[1]);
assert.ok(sqlBlocks.some((block) => /SELECT/i.test(block) && /GROUP BY/i.test(block)));
assert.ok(sqlBlocks.some((block) => /@rsn/.test(block) && /pt_desc1/.test(block)));
assert.ok(sqlBlocks.some((block) => /part_family/.test(block) && /unit_tone/.test(block)));
assert.match(source, /Promise\.all/);
assert.match(source, /getMonthRows/);
assert.doesNotMatch(source, /for \(const tone of REASONS_FOCUS_TONES\)/);
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
assert.match(detailRoute, /family:/);
assert.match(detailRoute, /tone:/);

const page = readFileSync(join(process.cwd(), 'src/components/dashboard/ReasonsPage.tsx'), 'utf8');
assert.match(page, /\/api\/reasons\/detail/);
assert.equal((page.match(/\/api\/reasons\/detail/g) || []).length, 1);
assert.match(page, /if \(!isFocus\)/);
assert.match(page, /if \(isFocus\)/);
assert.match(page, /family,/);
assert.match(page, /tone,/);
assert.match(page, /AbortController/);
assert.doesNotMatch(page, /setShape|setForming|setCustomer|setGlaze/);

const focus = readFileSync(join(process.cwd(), 'src/components/dashboard/ReasonsFocus.tsx'), 'utf8');
assert.match(focus, /REASONS_DW_TONE_OPTIONS/);
assert.match(focus, /REASONS_WW_TONE_OPTIONS/);
assert.match(focus, /sharedPctMax/);
assert.match(focus, /dataKey="pct"/);
assert.match(focus, /FamilyShareDonut/);
assert.match(focus, /onOpenTone/);
assert.doesNotMatch(focus, /fetch\(/);

console.log('check-reasons-list: ok');
