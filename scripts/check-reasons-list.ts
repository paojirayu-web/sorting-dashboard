import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    buildReasonsDetail,
    buildReasonsList,
    buildReasonsOverview,
    buildReasonsPareto,
    buildReasonsRatePareto,
    buildReasonsStratify,
    filterReasonsCodewareGroup,
    rankReasonsCodeware,
    reasonsCodewareTotal,
    reasonsParetoGroupOptions,
    sliceReasonsCodeware,
    sortReasonsCodeware,
    stratifyYearCompare,
    classifyReasonsTone,
    defaultToneForFamily,
    formatReasonsCodewareLabel,
    parseReasonsCp,
    parseReasonsDetailParams,
    parseReasonsFamily,
    parseReasonsForming,
    parseReasonsGlaze,
    reasonsCpMatches,
    reasonsGroupIsHidden,
    reasonsRowsFromMixPayload,
    parseReasonsGroups,
    parseReasonsListParams,
    parseReasonsTone,
    paretoTopItems,
    paretoAllItems,
    parseReasonsYearParam,
    reasonsControlChart,
    reasonsFocusHref,
    reasonsYearOptions,
    toneFitsFamily,
    nextToneForFamily,
    toneOptionsForFamily,
    yearsForReasonsParam,
    formatReasonsYearLabel,
    compareTonesForSlice,
    originLabelFromQty,
    toneOriginLabelFromQty,
    mergeReasonsYearOverviews,
    yearQueryWindow,
    REASONS_ALL_TONE_OPTIONS,
    REASONS_CODEWARE_MIN_QTYPROC,
    REASONS_CODEWARE_TOP_N,
    REASONS_CP_OPTIONS,
    REASONS_DEFAULT_CP,
    REASONS_DW_TONE_OPTIONS,
    REASONS_FOCUS_TONES,
    REASONS_MAX_PAGE_SIZE,
    REASONS_MONTH_LABELS,
    REASONS_WW_TONE_OPTIONS,
} from '../src/lib/reasons';
import { displayCp, qtyProcCodewareSize, qtyProcGroupSize, qtyProcMajorGroup, qtyProcResolveSize } from '../src/lib/qtyproc';
import { buildReasonsCodewareDisposition, buildReasonsCodewareFilename } from '../src/lib/reasons-codeware-excel';

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
assert.equal(parseReasonsListParams({}, now).cp, REASONS_DEFAULT_CP);
assert.deepEqual(reasonsYearOptions(now), [2026, 2025]);
assert.equal(parseReasonsYearParam('all', now), 'all');
assert.equal(parseReasonsYearParam(undefined, now), 2026);
assert.equal(parseReasonsYearParam('', now), 2026);
assert.deepEqual(yearsForReasonsParam('all', now), [2026, 2025]);
assert.equal(formatReasonsYearLabel('all', now), '2025–2026');
assert.deepEqual(compareTonesForSlice('ww', 'all'), ['white', 'black']);
assert.deepEqual(compareTonesForSlice('dw', 'all'), ['inglaze', 'onglaze']);
assert.equal(compareTonesForSlice('all', 'all'), null);
assert.equal(compareTonesForSlice('ww', 'white'), null);
assert.equal(parseReasonsListParams({ year: '2025' }, now).year, 2025);
assert.equal(parseReasonsListParams({ year: '2024' }, now).year, 2026);
assert.equal(parseReasonsCp(null), 'C');
assert.equal(parseReasonsCp('all'), 'all');
assert.equal(parseReasonsCp('p1'), 'P1');
assert.equal(parseReasonsCp('C+C1'), 'C');
assert.equal(parseReasonsCp('FF'), 'C');
assert.ok(reasonsCpMatches('C', 'C'));
assert.ok(reasonsCpMatches('C', 'C1'));
assert.ok(reasonsCpMatches('C', 'CS'));
assert.ok(!reasonsCpMatches('C', 'P1'));
assert.ok(reasonsCpMatches('C1', 'C(FRIT&BOM)'));
assert.ok(!reasonsCpMatches('C1', 'C'));
assert.ok(reasonsGroupIsHidden('unclassified'));
assert.ok(reasonsGroupIsHidden('Unknown'));
assert.ok(!reasonsGroupIsHidden('unclassified', 'inglaze'));
assert.ok(!reasonsGroupIsHidden('unclassified', 'onglaze'));
assert.ok(!reasonsGroupIsHidden('MUG&CUP'));
assert.ok(!reasonsGroupIsHidden(''));
assert.ok(!reasonsGroupIsHidden(undefined));
assert.ok(reasonsCpMatches('C1', 'C', 1));
assert.ok(reasonsCpMatches('C', 'C', 1));
assert.ok(reasonsCpMatches('C', 'C', 0));
assert.equal(displayCp('C', 1), 'C1');
assert.equal(displayCp('C', 0), 'C');
assert.equal(REASONS_DEFAULT_CP, 'C');
assert.ok(!REASONS_CP_OPTIONS.some((opt) => opt.value === 'FF' || opt.label === 'C+C1'));
assert.ok(REASONS_CP_OPTIONS.some((opt) => opt.value === 'C' && opt.label === 'C'));

const windowNow = new Date(2026, 8, 11);
assert.equal(yearQueryWindow(2026, windowNow).start, '2026-01-01');
assert.equal(yearQueryWindow(2026, windowNow).endExcl, '2027-01-01');
assert.equal(yearQueryWindow(2025, windowNow).endExcl, '2026-01-01');
assert.equal(yearQueryWindow(2027, windowNow).endExcl, '2027-01-01');

assert.equal(parseReasonsFamily(undefined), 'ww');
assert.equal(parseReasonsFamily('all'), 'all');
assert.equal(parseReasonsFamily('WW'), 'ww');
assert.equal(parseReasonsFamily('dw'), 'dw');
assert.equal(originLabelFromQty(10, 0), 'WW');
assert.equal(originLabelFromQty(0, 10), 'DW');
assert.equal(originLabelFromQty(10, 5), 'WW+DW');
assert.equal(originLabelFromQty(0, 0), undefined);
assert.equal(toneOriginLabelFromQty({ white: 10 }), 'White');
assert.equal(toneOriginLabelFromQty({ inglaze: 5 }), 'Inglaze');
assert.equal(toneOriginLabelFromQty({ white: 10, onglaze: 5 }), 'White+Onglaze');
assert.equal(toneOriginLabelFromQty({ white: 4, black: 2 }), 'White+Black');
assert.equal(toneOriginLabelFromQty({}), undefined);
assert.equal(parseReasonsTone('ww', null), 'all');
assert.equal(parseReasonsTone('ww', 'black'), 'black');
assert.equal(parseReasonsTone('ww', 'white'), 'white');
assert.equal(parseReasonsTone('dw', null), 'all');
assert.equal(parseReasonsTone('dw', 'onglaze'), 'onglaze');
assert.equal(parseReasonsTone('all', null), 'all');
assert.equal(defaultToneForFamily('ww'), 'all');
assert.equal(defaultToneForFamily('dw'), 'all');
assert.equal(defaultToneForFamily('all'), 'all');
assert.deepEqual(REASONS_WW_TONE_OPTIONS.map((o) => o.value), ['all', 'white', 'black']);
assert.deepEqual(REASONS_DW_TONE_OPTIONS.map((o) => o.value), ['all', 'inglaze', 'onglaze']);
assert.deepEqual(REASONS_ALL_TONE_OPTIONS.map((o) => o.value), ['all', 'white', 'black', 'inglaze', 'onglaze']);
assert.deepEqual(toneOptionsForFamily('all'), []);
assert.deepEqual(toneOptionsForFamily('ww').map((o) => o.value), ['all', 'white', 'black']);
assert.equal(parseReasonsTone('all', 'white'), 'white');
assert.equal(parseReasonsTone('all', 'onglaze'), 'onglaze');
assert.equal(toneFitsFamily('all', 'white'), true);
assert.equal(toneFitsFamily('ww', 'inglaze'), false);
assert.equal(toneFitsFamily('dw', 'onglaze'), true);
assert.equal(nextToneForFamily('dw', 'white'), 'all');
assert.equal(nextToneForFamily('ww', 'black'), 'black');
assert.equal(nextToneForFamily('all', 'inglaze'), 'all');

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
    cp: 'C',
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
    cp: 'C',
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
    cp: 'C',
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
    group: 'MUG&CUP,BOWL',
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
assert.equal(parseReasonsDetailParams({}, now).family, 'ww');
assert.equal(parseReasonsDetailParams({}, now).year, 2026);
assert.equal(parseReasonsDetailParams({}, now).tone, 'all');
assert.equal(parseReasonsDetailParams({ family: 'dw' }, now).tone, 'all');
assert.equal(parseReasonsDetailParams({}, now).cp, 'C');
assert.equal(parseReasonsDetailParams({ year: 'all' }, now).year, 'all');
assert.equal(detailParsed.cp, 'C1');
assert.deepEqual(detailParsed.group, ['MUG&CUP', 'BOWL']);
assert.equal(detailParsed.forming, 'JIG');
assert.equal(detailParsed.glaze, 'T');
assert.deepEqual(parseReasonsGroups(null), []);
assert.deepEqual(parseReasonsGroups('all'), []);
assert.deepEqual(parseReasonsGroups('MUG&CUP, BOWL'), ['MUG&CUP', 'BOWL']);
assert.equal(parseReasonsForming('JIG'), 'JIG');
assert.equal(parseReasonsGlaze('t'), 'T');
assert.equal(parseReasonsGlaze('nope'), 'all');

assert.equal(formatReasonsCodewareLabel({ pt_desc1: ' CUP 12 ', pt_desc2: 'OG', m_part: '143001' }), 'CUP 12 (OG)');
assert.equal(formatReasonsCodewareLabel({ pt_desc1: 'CUP 12', pt_desc2: 'OG', tone: 'onglaze' }), 'CUP 12 (OG)');
assert.equal(formatReasonsCodewareLabel({ pt_desc1: 'CUP 12', pt_desc2: 'OG', tone: 'inglaze' }), 'CUP 12 (OG)');
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
    { mo: 1, code: 'D9', qty: 8, tone: 'white' as const },
    { mo: 1, code: 'BLK', qty: 20, tone: 'black' as const },
];
const prodRows = [
    { mo: 1, qtyproc: 400, tone: 'white' as const, desc1: 'A12' },
    { mo: 1, qtyproc: 400, tone: 'white' as const, desc1: 'B9' },
    { mo: 1, qtyproc: 50, tone: 'white' as const, desc1: 'C1' },
    { mo: 1, qtyproc: 150, tone: 'white' as const },
    { mo: 2, qtyproc: 100, tone: 'white' as const, desc1: 'A12' },
    { mo: 2, qtyproc: 300, tone: 'white' as const, desc1: 'D9' },
    { mo: 2, qtyproc: 400, tone: 'white' as const },
    { mo: 3, qtyproc: 400, tone: 'white' as const },
    { mo: 1, qtyproc: 400, tone: 'black' as const },
    { mo: 1, qtyproc: 400, tone: 'black' as const, desc1: 'BLK' },
    { mo: 4, qtyproc: 300, tone: 'inglaze' as const },
    { mo: 5, qtyproc: 200, tone: 'onglaze' as const },
];
const detail = buildReasonsDetail(monthRows, detailRows, prodRows, {
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
assert.equal(detail.codeware[0].qtyproc, 500);
assert.ok(Math.abs(detail.codeware[0].pct - 20) < 1e-9);
assert.equal(detail.codeware[1].code, 'B9');
assert.equal(detail.codeware[1].qtyproc, 400);
assert.ok(detail.other);
assert.equal(detail.other?.code, 'Other');
assert.equal(detail.other?.qty, 8);
assert.equal(detail.other?.qtyproc, 300);
assert.ok(detail.familyShare);
assert.equal(detail.familyShare?.length, 1);
assert.equal(detail.familyShare?.[0].tone, 'white');
assert.equal(detail.series, undefined);
assert.equal(detail.compare, undefined);

const wwAllTrend = buildReasonsDetail(monthRows, detailRows, prodRows, {
    rsn: 'Crack',
    year: 2026,
    kind: 'scrap',
    family: 'ww',
    tone: 'all',
}, { generatedAt: '2026-09-11 04:00', stale: false });
assert.equal(wwAllTrend.compare?.length, 2);
assert.deepEqual(wwAllTrend.compare?.map((s) => s.key), ['white', 'black']);
assert.equal(wwAllTrend.compare?.[0].trend[0].qty, 75);
assert.equal(wwAllTrend.compare?.[1].trend[0].qty, 20);
assert.ok(wwAllTrend.codeware.some((row) => row.tone === 'white' && row.code === 'A12'));
assert.ok(wwAllTrend.codeware.some((row) => row.tone === 'black' && row.code === 'BLK'));
assert.equal(detail.codeware[0].tone, undefined);
assert.equal(REASONS_CODEWARE_MIN_QTYPROC, 300);
assert.equal(REASONS_CODEWARE_TOP_N, 10);
assert.ok(!detail.codeware.some((row) => row.code === 'C1'));

const allMode = buildReasonsDetail(monthRows, detailRows, prodRows, {
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

const familyAllFocus = buildReasonsDetail(monthRows, detailRows, prodRows, {
    rsn: 'Crack',
    year: 2026,
    kind: 'scrap',
    family: 'all',
    tone: 'all',
}, { generatedAt: '2026-09-11 04:00', stale: false });
assert.deepEqual(familyAllFocus.compare?.map((s) => s.key), ['white', 'black', 'inglaze', 'onglaze']);
assert.ok(familyAllFocus.familyShare?.every((item) => item.qty > 0));
assert.equal(familyAllFocus.familyShare?.length, 4);
assert.ok(familyAllFocus.codeware.some((row) => row.tone === 'white' && row.code === 'A12'));
assert.ok(familyAllFocus.codeware.some((row) => row.tone === 'black' && row.code === 'BLK'));

const sparseAllFocus = buildReasonsDetail(
    monthRows.filter((row) => row.tone === 'white' || row.tone === 'black'),
    detailRows.filter((row) => row.tone === 'white' || row.tone === 'black'),
    prodRows.filter((row) => row.tone === 'white' || row.tone === 'black'),
    {
        rsn: 'Crack',
        year: 2026,
        kind: 'scrap',
        family: 'all',
        tone: 'all',
    },
    { generatedAt: '2026-09-11 04:00', stale: false },
);
assert.deepEqual(sparseAllFocus.compare?.map((s) => s.key), ['white', 'black']);
assert.ok(!sparseAllFocus.compare?.some((s) => s.key === 'inglaze' || s.key === 'onglaze'));
assert.deepEqual(sparseAllFocus.familyShare?.map((item) => item.tone), ['white', 'black']);

const groupedDetailRows = [
    { mo: 1, code: 'A12', qty: 40, tone: 'white' as const, group: 'MUG&CUP', groupLabel: 'MUG&CUP (S)' },
    { mo: 2, code: 'A12', qty: 60, tone: 'white' as const, group: 'MUG&CUP', groupLabel: 'MUG&CUP (M)' },
    { mo: 1, code: 'B9', qty: 30, tone: 'white' as const, group: 'BOWL', groupLabel: 'BOWL (L)' },
    { mo: 1, code: 'C1', qty: 5, tone: 'white' as const, group: 'MUG&CUP', groupLabel: 'MUG&CUP (S)' },
    { mo: 1, code: 'D1', qty: 10, tone: 'white' as const, group: 'ACC', groupLabel: 'ACCESSORIES' },
];
const groupedProds = [
    { mo: 1, qtyproc: 400, tone: 'white' as const, desc1: 'A12', group: 'MUG&CUP' },
    { mo: 2, qtyproc: 100, tone: 'white' as const, desc1: 'A12', group: 'MUG&CUP' },
    { mo: 1, qtyproc: 400, tone: 'white' as const, desc1: 'B9', group: 'BOWL' },
    { mo: 1, qtyproc: 50, tone: 'white' as const, desc1: 'C1', group: 'MUG&CUP' },
    { mo: 1, qtyproc: 300, tone: 'white' as const, desc1: 'D1', group: 'ACC' },
];
const groupedFocus = buildReasonsDetail(monthRows, groupedDetailRows, groupedProds, {
    rsn: 'Crack',
    year: 2026,
    kind: 'scrap',
    family: 'ww',
    tone: 'white',
    group: ['MUG&CUP'],
}, { generatedAt: '2026-09-11 04:00', stale: false });
assert.ok(detail.pareto?.length);
assert.ok(!detail.pareto.some((row) => row.other));
assert.ok((detail.pareto[0].pct || 0) >= (detail.pareto[detail.pareto.length - 1]?.pct || 0));
assert.ok(Math.abs((detail.pareto[detail.pareto.length - 1]?.cum || 0) - 100) < 1e-6);
assert.ok((groupedFocus.stratify?.group.length || 0) === 1);
assert.equal(groupedFocus.stratify?.group[0]?.key, 'MUG&CUP');

const openGroupFocus = buildReasonsDetail(monthRows, groupedDetailRows, groupedProds, {
    rsn: 'Crack',
    year: 2026,
    kind: 'scrap',
    family: 'ww',
    tone: 'white',
}, { generatedAt: '2026-09-11 04:00', stale: false });
assert.ok((openGroupFocus.stratify?.group.length || 0) > 1);
assert.equal(openGroupFocus.paretoCodeware?.find((row) => row.code === 'A12')?.group, 'MUG&CUP');
assert.equal(openGroupFocus.paretoCodeware?.find((row) => row.code === 'B9')?.group, 'BOWL');
assert.deepEqual(reasonsParetoGroupOptions(openGroupFocus.paretoCodeware || []).map((opt) => opt.value), ['MUG&CUP', 'BOWL', 'ACCESSORIES']);
assert.deepEqual(filterReasonsCodewareGroup(openGroupFocus.paretoCodeware || [], 'BOWL').map((row) => row.code), ['B9']);

const controlPct = reasonsControlChart(
    REASONS_MONTH_LABELS.map((label, i) => ({
        mo: i + 1,
        label,
        qty: i === 5 ? 200 : 50,
        pct: i === 5 ? 20 : 5,
        qtyproc: 1000,
        delta: null,
    })),
    'pct',
);
assert.equal(controlPct?.kind, 'p');
assert.ok(controlPct?.outLabels.includes('Jun'));
assert.equal(reasonsControlChart(detail.trend.slice(0, 3), 'pct'), null);

const strat = buildReasonsStratify(groupedDetailRows);
assert.ok(strat.group.length >= 2);
assert.deepEqual(strat.size.map((row) => row.key), ['S', 'M', 'L']);
assert.equal(strat.size.find((row) => row.key === 'S')?.qty, 45);
assert.ok(!strat.size.some((row) => row.key === '—' || row.label === 'ACCESSORIES'));
assert.ok(Math.abs(strat.size.reduce((sum, row) => sum + row.pct, 0) - 100) < 1e-6);
assert.ok(strat.group.every((row) => row.pct > 0));
assert.equal(qtyProcGroupSize('MUG&CUP (S)'), 'S');
assert.equal(qtyProcGroupSize('PLATE EMB/DMB (XXL)'), 'XXL');
assert.equal(qtyProcGroupSize('BOWL'), '');
assert.equal(qtyProcGroupSize('ACCESSORIES'), '');
assert.equal(qtyProcCodewareSize('W/W JMSC76/T0040'), 'S');
assert.equal(qtyProcCodewareSize('JMME38'), 'M');
assert.equal(qtyProcCodewareSize('JMXA64'), 'XL');
assert.equal(qtyProcCodewareSize('NOCODE'), '');
assert.equal(qtyProcResolveSize('MUG&CUP (L)', 'W/W JMSC76/T0040'), 'L');
assert.equal(qtyProcResolveSize('ACCESSORIES', 'W/W JMSC76/T0040'), 'S');
assert.equal(qtyProcResolveSize('ACCESSORIES', 'NOCODE'), '');
assert.equal(qtyProcMajorGroup('MUG&CUP (S)'), 'MUG&CUP');
const sizeFromCode = buildReasonsStratify([
    { mo: 1, code: 'A12', qty: 40, tone: 'white' as const, group: 'MUG&CUP', groupLabel: 'MUG&CUP (S)', desc1: 'W/W JMMC76/T0040' },
    { mo: 1, code: 'D1', qty: 10, tone: 'white' as const, group: 'ACC', groupLabel: 'ACCESSORIES', desc1: 'W/W JMSC76/T0040' },
    { mo: 1, code: 'E1', qty: 7, tone: 'white' as const, group: 'ACC', groupLabel: 'ACCESSORIES', desc1: 'NOCODE' },
]);
assert.equal(sizeFromCode.size.find((row) => row.key === 'S')?.qty, 50);
assert.ok(!sizeFromCode.size.some((row) => row.key === '—' || row.label === 'ACCESSORIES'));
assert.ok(!sizeFromCode.size.some((row) => row.key === 'M'));
assert.deepEqual(rankReasonsCodeware([
    { code: 'A', qty: 80, qtyproc: 1000, pct: 8 },
    { code: 'B', qty: 15, qtyproc: 100, pct: 15 },
    { code: 'C', qty: 5, qtyproc: 50, pct: 10 },
], 'qty').map((row) => row.code), ['A', 'B', 'C']);
assert.deepEqual(rankReasonsCodeware([
    { code: 'A', qty: 80, qtyproc: 1000, pct: 8 },
    { code: 'B', qty: 15, qtyproc: 100, pct: 15 },
    { code: 'C', qty: 5, qtyproc: 50, pct: 10 },
], 'rate').map((row) => row.code), ['B', 'C', 'A']);
assert.equal(rankReasonsCodeware(
    Array.from({ length: 12 }, (_, index) => ({
        code: `C${index}`,
        qty: 12 - index,
        qtyproc: 100,
        pct: 20 - index,
    })),
    'qty',
).length, REASONS_CODEWARE_TOP_N);
assert.deepEqual(reasonsCodewareTotal([
    { code: 'A', qty: 80, qtyproc: 1000, pct: 8 },
    { code: 'B', qty: 20, qtyproc: 200, pct: 10 },
]), { code: 'Total', qty: 100, qtyproc: 1200, pct: (100 / 1200) * 100 });
const twelveWares = Array.from({ length: 12 }, (_, index) => ({
    code: `C${index}`,
    qty: 12 - index,
    qtyproc: 100,
    pct: 12 - index,
}));
const slicedQty = sliceReasonsCodeware(sortReasonsCodeware(twelveWares, 'qty'));
assert.equal(slicedQty.codeware.length, REASONS_CODEWARE_TOP_N);
assert.equal(slicedQty.other?.code, 'Other');
assert.equal(slicedQty.other?.qty, 3);
assert.equal(
    slicedQty.codeware.reduce((sum, row) => sum + row.qty, 0) + (slicedQty.other?.qty || 0),
    reasonsCodewareTotal(twelveWares).qty,
);
assert.deepEqual(stratifyYearCompare(
    [{ key: 'A', label: 'A', color: '#111', months: [], qty: 120, pct: 60 }],
    [{ key: 'A', label: 'A', color: '#111', months: [], qty: 100, pct: 50 }, { key: 'B', label: 'B', color: '#222', months: [], qty: 40, pct: 20 }],
).map((row) => ({ key: row.key, currentQty: row.currentQty, prevQty: row.prevQty, deltaPct: row.deltaPct })), [
    { key: 'A', currentQty: 120, prevQty: 100, deltaPct: 20 },
    { key: 'B', currentQty: 0, prevQty: 40, deltaPct: -100 },
]);
assert.equal(buildReasonsRatePareto(
    Array.from({ length: 12 }, (_, index) => ({
        code: `C${index}`,
        qty: 12 - index,
        qtyproc: 100,
        pct: 20 - index,
        desc1: `Ware ${index}`,
    })),
).length, REASONS_CODEWARE_TOP_N);
assert.deepEqual(buildReasonsPareto([
    { code: 'A', qty: 80, qtyproc: 100, pct: 80, desc1: 'Ware A' },
    { code: 'B', qty: 15, qtyproc: 100, pct: 15, desc1: 'Ware B' },
    { code: 'C', qty: 5, qtyproc: 100, pct: 5, desc1: 'Ware C' },
]).map((row) => row.code), ['A', 'B', 'C']);
assert.deepEqual(buildReasonsPareto([
    { code: 'A', qty: 80, qtyproc: 100, pct: 80, desc1: 'Ware A' },
    { code: 'B', qty: 15, qtyproc: 100, pct: 15, desc1: 'Ware B' },
    { code: 'C', qty: 5, qtyproc: 100, pct: 5, desc1: 'Ware C' },
]).map((row) => row.name), ['Ware A', 'Ware B', 'Ware C']);
const manyPareto = buildReasonsPareto(
    Array.from({ length: 12 }, (_, index) => ({
        code: `C${index}`,
        qty: 12 - index,
        qtyproc: 100,
        pct: 12 - index,
        desc1: `Ware ${index}`,
    })),
);
assert.equal(manyPareto.length, 12);
assert.ok(!manyPareto.some((row) => row.other));
assert.equal(manyPareto[0].name, 'Ware 0');
assert.equal(groupedFocus.codeware[0].code, 'A12');
assert.ok(!groupedFocus.codeware.some((row) => row.code === 'B9'));
assert.ok(groupedFocus.codeware.some((row) => row.code === 'C1'));

const smallGroupFocus = buildReasonsDetail(monthRows, [
    { mo: 1, code: 'C1', qty: 5, tone: 'white' as const, group: 'MUG&CUP' },
], [
    { mo: 1, qtyproc: 50, tone: 'white' as const, desc1: 'C1', group: 'MUG&CUP' },
], {
    rsn: 'Crack',
    year: 2026,
    kind: 'scrap',
    family: 'ww',
    tone: 'white',
    group: ['MUG&CUP'],
}, { generatedAt: '2026-09-11 04:00', stale: false });
assert.equal(smallGroupFocus.codeware.length, 1);
assert.equal(smallGroupFocus.codeware[0].code, 'C1');

const glazeFocus = buildReasonsDetail(monthRows, [
    { mo: 1, code: 'JMSB30/T0040', qty: 40, tone: 'white' as const, desc1: 'JMSB30/T0040' },
    { mo: 1, code: 'JBSB30/G0010', qty: 30, tone: 'white' as const, desc1: 'JBSB30/G0010' },
], [
    { mo: 1, qtyproc: 400, tone: 'white' as const, desc1: 'JMSB30/T0040' },
    { mo: 1, qtyproc: 400, tone: 'white' as const, desc1: 'JBSB30/G0010' },
], {
    rsn: 'Crack',
    year: 2026,
    kind: 'scrap',
    family: 'ww',
    tone: 'white',
    glaze: 'T',
}, { generatedAt: '2026-09-11 04:00', stale: false });
assert.equal(glazeFocus.codeware.length, 1);
assert.equal(glazeFocus.codeware[0].code, 'JMSB30/T0040');

const dwFocus = buildReasonsDetail(
    [{ rsn: 'Crack', mo: 1, qty: 40, tone: 'inglaze' as const }],
    [{ mo: 1, code: 'CUP 12 (OG)', qty: 40, tone: 'inglaze' as const, desc1: 'CUP 12', desc2: 'OG', mPart: '143001' }],
    [{ mo: 1, qtyproc: 400, tone: 'inglaze' as const, desc1: 'CUP 12', desc2: 'OG', mPart: '143001' }],
    {
        rsn: 'Crack',
        year: 2026,
        kind: 'scrap',
        family: 'dw',
        tone: 'all',
    },
    { generatedAt: '2026-09-11 04:00', stale: false },
);
assert.equal(dwFocus.codeware[0].desc1, 'CUP 12');
assert.equal(dwFocus.codeware[0].desc2, 'OG');
assert.equal(dwFocus.codeware[0].code, 'CUP 12 (OG)');

assert.ok(Math.abs(detail.trend[0].pct - (75 / 1000) * 100) < 1e-9);
assert.ok(Math.abs(detail.meta.pct - (145 / 2200) * 100) < 1e-9);

const mixDefects = [
    { rsn: 'Crack', mo: 1, qty: 10, tone: 'white' as const, desc1: 'JMSB30/T0040', cp: 'C', group: 'MUG&CUP' },
    { rsn: 'Pin hole', mo: 1, qty: 50, tone: 'white' as const, desc1: 'JBSB30/G0010', cp: 'C', group: 'BOWL' },
];
const mixProds = [
    { mo: 1, qtyproc: 100, tone: 'white' as const, desc1: 'JMSB30/T0040', cp: 'C', group: 'MUG&CUP' },
    { mo: 1, qtyproc: 1000, tone: 'white' as const, desc1: 'JBSB30/G0010', cp: 'C', group: 'BOWL' },
];
const mixAll = {
    year: 2026 as const,
    kind: 'scrap' as const,
    family: 'ww' as const,
    tone: 'white' as const,
    cp: 'C',
    group: [] as string[],
    forming: 'all',
    glaze: 'all',
};
const c1SliceDefects = [
    { rsn: 'Crack', mo: 1, qty: 10, tone: 'white' as const, cp: 'C1' },
    { rsn: 'Pin hole', mo: 1, qty: 5, tone: 'white' as const, cp: 'C' },
];
const c1SliceProds = [
    { mo: 1, qtyproc: 100, tone: 'white' as const, cp: 'C1' },
    { mo: 1, qtyproc: 100, tone: 'white' as const, cp: 'C' },
];
const overviewC1Only = buildReasonsOverview(c1SliceDefects, c1SliceProds, { ...mixAll, cp: 'C1' });
assert.equal(overviewC1Only.top?.[0].rsn, 'Crack');
assert.equal(overviewC1Only.top?.length, 1);
assert.equal(overviewC1Only.meta.qty, 10);
const overviewCOnly = buildReasonsOverview(c1SliceDefects, c1SliceProds, { ...mixAll, cp: 'C' });
assert.equal(overviewCOnly.top?.length, 2);
assert.equal(overviewCOnly.meta.qty, 15);
assert.equal(overviewCOnly.meta.qtyproc, 200);
const overviewAllCp = buildReasonsOverview(c1SliceDefects, c1SliceProds, { ...mixAll, cp: 'all' });
assert.equal(overviewAllCp.top?.length, 2);

const fromMix = reasonsRowsFromMixPayload({
    reasons: [{
        y: 2569,
        m: 1,
        rsn_desc: 'Crack',
        kind: 'scrap',
        shape: 'mug',
        forming: 'JIG',
        group: 'MUG&CUP',
        groupLabel: 'MUG&CUP',
        cp: 'C',
        tone: 'WHITE',
        customer: '',
        glaze: 'T',
        qty: 10,
    }, {
        y: 2569,
        m: 1,
        rsn_desc: 'FritCrack',
        kind: 'scrap',
        shape: 'mug',
        forming: 'JIG',
        group: 'MUG&CUP',
        groupLabel: 'MUG&CUP',
        cp: 'FRIT',
        tone: 'WHITE',
        customer: '',
        glaze: 'T',
        qty: 5,
    }],
    mix: [{
        y: 2569,
        m: 1,
        shape: 'mug',
        forming: 'JIG',
        group: 'MUG&CUP',
        groupLabel: 'MUG&CUP',
        cp: 'C',
        tone: 'WHITE',
        customer: '',
        glaze: 'T',
        qtyproc: 100,
        qtycomp: 80,
        qtyscrp: 10,
        qtyrjct: 10,
    }],
}, 2026, 'scrap');
const overviewFromMix = buildReasonsOverview(fromMix.defects, fromMix.prods, { ...mixAll, cp: 'C' });
assert.equal(fromMix.prods[0]?.qtyscrp, 10);
assert.equal(overviewFromMix.meta.qty, 10);
assert.equal(overviewFromMix.meta.qtyproc, 100);
assert.ok(Math.abs((overviewFromMix.meta.qty / overviewFromMix.meta.qtyproc) * 100 - 10) < 1e-9);
assert.ok(Math.abs((overviewFromMix.trend?.[0].pct || 0) - 10) < 1e-9);
assert.equal(overviewFromMix.top?.length, 2);
assert.equal(overviewFromMix.top?.reduce((sum, row) => sum + row.qty, 0), 15);
const mixFocusRows = [{
    mo: 1,
    code: 'W/W JMSC76/T0040(VG)',
    qty: 10,
    tone: 'white' as const,
    desc1: 'W/W JMSC76/T0040(VG)',
}];
const mixFocusEmptyProc = buildReasonsDetail(fromMix.defects, mixFocusRows, fromMix.prods, {
    rsn: 'Crack',
    year: 2026,
    kind: 'scrap',
    family: 'ww',
    tone: 'all',
});
assert.equal(mixFocusEmptyProc.codeware[0]?.qtyproc, 0);
const mixFocusWithCodeProds = buildReasonsDetail(fromMix.defects, mixFocusRows, fromMix.prods, {
    rsn: 'Crack',
    year: 2026,
    kind: 'scrap',
    family: 'ww',
    tone: 'all',
}, {
    codeProds: [{ mo: 1, qtyproc: 400, tone: 'white', desc1: 'W/W JMSC76/T0040(VG)' }],
});
assert.equal(mixFocusWithCodeProds.codeware[0]?.qtyproc, 400);
assert.ok((mixFocusWithCodeProds.codeware[0]?.pct || 0) > 0);
assert.ok((mixFocusWithCodeProds.pareto?.[0]?.pct || 0) > 0);

const overviewAll = buildReasonsOverview(mixDefects, mixProds, mixAll);
assert.equal(overviewAll.mode, 'scope');
assert.equal(overviewAll.cards?.[0].top[0].rsn, 'Pin hole');
assert.equal(overviewAll.top?.[0].rsn, 'Pin hole');
assert.equal(overviewAll.top?.length, 2);
assert.ok(!overviewAll.top?.some((item) => item.other || item.rsn === 'Other'));
assert.ok(Math.abs((overviewAll.cards?.[0].top[0].pct || 0) - (50 / 1100) * 100) < 1e-9);
assert.ok(Math.abs((overviewAll.cards?.[0].top[0].share || 0) - (50 / 60) * 100) < 1e-9);
assert.ok(Math.abs((overviewAll.cards?.[0].top[1].cum || 0) - 100) < 1e-9);
assert.equal(overviewAll.meta.qtyproc, 1100);
assert.equal(overviewAll.cards?.length, 1);
assert.equal(overviewAll.cards?.[0].tone, 'white');
assert.equal(overviewAll.cards?.[0].trend.length, 12);
assert.ok(Math.abs((overviewAll.cards?.[0].trend[0].pct || 0) - (60 / 1100) * 100) < 1e-9);
assert.equal(overviewAll.trend?.length, 12);
assert.equal(overviewAll.compare, undefined);
const pareto = paretoTopItems([
    { rsn: 'B', qty: 20, pct: 2, spark: [] },
    { rsn: 'A', qty: 80, pct: 1, spark: [] },
    { rsn: 'C', qty: 10, pct: 9, spark: [] },
], 2);
assert.deepEqual(pareto.map((item) => item.rsn), ['A', 'B', 'Other']);
assert.equal(pareto[2].other, true);
assert.ok(Math.abs((pareto[0].share || 0) - (80 / 110) * 100) < 1e-9);
assert.ok(Math.abs((pareto[1].cum || 0) - (100 / 110) * 100) < 1e-9);
assert.ok(Math.abs((pareto[2].share || 0) - (10 / 110) * 100) < 1e-9);
assert.ok(Math.abs((pareto[2].cum || 0) - 100) < 1e-9);
const paretoGrouped = paretoTopItems([
    { rsn: 'A', qty: 40, pct: 1, spark: [] },
    { rsn: 'B', qty: 18, pct: 1, spark: [] },
    { rsn: 'C', qty: 16, pct: 1, spark: [] },
    { rsn: 'D', qty: 12, pct: 1, spark: [] },
    { rsn: 'E', qty: 6, pct: 1, spark: [] },
    { rsn: 'F', qty: 5, pct: 1, spark: [] },
], 2);
assert.deepEqual(paretoGrouped.map((item) => item.rsn), ['A', 'B', 'Other']);
assert.equal(paretoGrouped[2].qty, 39);
assert.equal(paretoGrouped[2].otherCount, 4);
assert.ok(paretoGrouped[2].qty > paretoGrouped[1].qty);
const pareto15 = paretoTopItems([
    ...['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'].map((rsn, index) => ({
        rsn,
        qty: 16 - index,
        pct: 1,
        spark: [] as number[],
    })),
], 15);
assert.equal(pareto15.filter((item) => !item.other).length, 15);
assert.equal(pareto15.at(-1)?.other, true);
assert.equal(pareto15.at(-1)?.qty, 1);
assert.equal(pareto15.at(-1)?.otherCount, 1);
const paretoAll = paretoAllItems([
    { rsn: 'B', qty: 20, pct: 2, spark: [] },
    { rsn: 'A', qty: 80, pct: 1, spark: [] },
    { rsn: 'C', qty: 10, pct: 9, spark: [] },
]);
assert.deepEqual(paretoAll.map((item) => item.rsn), ['A', 'B', 'C']);
assert.ok(!paretoAll.some((item) => item.other));
assert.ok(Math.abs((paretoAll[2].cum || 0) - 100) < 1e-9);

const overviewWwAll = buildReasonsOverview(mixDefects, mixProds, { ...mixAll, tone: 'all' });
assert.equal(overviewWwAll.compare?.length, 2);
assert.deepEqual(overviewWwAll.compare?.map((s) => s.key), ['white', 'black']);

const overviewY2025 = buildReasonsOverview(mixDefects, mixProds, { ...mixAll, year: 2025 });
const overviewCombinedYears = buildReasonsOverview(mixDefects, mixProds, { ...mixAll, year: 'all' });
const overviewYears = mergeReasonsYearOverviews(
    [
        { year: 2026, payload: overviewAll },
        { year: 2025, payload: overviewY2025 },
    ],
    overviewCombinedYears,
);
assert.equal(overviewYears.meta.year, 'all');
assert.equal(overviewYears.compare?.length, 2);
assert.deepEqual(overviewYears.compare?.map((s) => s.label), ['2026', '2025']);
assert.equal(overviewYears.yearStats?.length, 2);
assert.equal(overviewYears.yearStats?.[0].year, 2026);
assert.equal(overviewYears.yearStats?.[1].year, 2025);

const overviewFamilyAll = buildReasonsOverview(mixDefects, mixProds, { ...mixAll, family: 'all', tone: 'all' });
assert.equal(overviewFamilyAll.mode, 'quad');
assert.equal(overviewFamilyAll.cards?.length, 4);
assert.equal(overviewFamilyAll.cards?.find((card) => card.tone === 'white')?.top.length, 2);
assert.equal(overviewFamilyAll.top?.[0].rsn, 'Pin hole');
assert.deepEqual(overviewFamilyAll.rsnOptions, ['Pin hole', 'Crack']);
assert.equal(overviewFamilyAll.trend?.length, 12);

const originDefects = [
    { rsn: 'C ฟุตบิ่น', mo: 1, qty: 40, tone: 'white' as const, cp: 'C' },
    { rsn: 'C รูปลอก', mo: 1, qty: 30, tone: 'inglaze' as const, cp: 'C' },
    { rsn: 'Crack', mo: 1, qty: 20, tone: 'white' as const, cp: 'C' },
    { rsn: 'Crack', mo: 1, qty: 10, tone: 'onglaze' as const, cp: 'C' },
];
const originProds = [
    { mo: 1, qtyproc: 200, tone: 'white' as const, cp: 'C' },
    { mo: 1, qtyproc: 200, tone: 'inglaze' as const, cp: 'C' },
    { mo: 1, qtyproc: 200, tone: 'onglaze' as const, cp: 'C' },
];
const overviewOrigin = buildReasonsOverview(originDefects, originProds, { ...mixAll, family: 'all', tone: 'all' });
assert.equal(overviewOrigin.top?.find((item) => item.rsn === 'C ฟุตบิ่น')?.origin, 'WW');
assert.equal(overviewOrigin.top?.find((item) => item.rsn === 'C ฟุตบิ่น')?.toneOrigin, 'White');
assert.equal(overviewOrigin.top?.find((item) => item.rsn === 'C รูปลอก')?.origin, 'DW');
assert.equal(overviewOrigin.top?.find((item) => item.rsn === 'C รูปลอก')?.toneOrigin, 'Inglaze');
assert.equal(overviewOrigin.top?.find((item) => item.rsn === 'Crack')?.origin, 'WW+DW');
assert.equal(overviewOrigin.top?.find((item) => item.rsn === 'Crack')?.toneOrigin, 'White+Onglaze');

const overviewOriginWw = buildReasonsOverview(originDefects, originProds, { ...mixAll, family: 'ww', tone: 'all' });
assert.equal(overviewOriginWw.top?.find((item) => item.rsn === 'C ฟุตบิ่น')?.origin, 'White');
assert.equal(overviewOriginWw.top?.find((item) => item.rsn === 'Crack')?.origin, 'White');
assert.ok(!overviewOriginWw.top?.some((item) => item.rsn === 'C รูปลอก'));

const overviewOriginDw = buildReasonsOverview(originDefects, originProds, { ...mixAll, family: 'dw', tone: 'all' });
assert.equal(overviewOriginDw.top?.find((item) => item.rsn === 'C รูปลอก')?.origin, 'Inglaze');
assert.equal(overviewOriginDw.top?.find((item) => item.rsn === 'Crack')?.origin, 'Onglaze');

const overviewGroup = buildReasonsOverview(mixDefects, mixProds, { ...mixAll, group: ['MUG&CUP'] });
assert.equal(overviewGroup.cards?.[0].top[0].rsn, 'Crack');
assert.equal(overviewGroup.cards?.[0].top.length, 1);
assert.ok(Math.abs((overviewGroup.cards?.[0].top[0].pct || 0) - 10) < 1e-9);
assert.equal(overviewGroup.meta.qtyproc, 100);

const overviewGlazeT = buildReasonsOverview(mixDefects, mixProds, { ...mixAll, glaze: 'T' });
assert.equal(overviewGlazeT.cards?.[0].top[0].rsn, 'Crack');
assert.equal(overviewGlazeT.meta.qty, 10);

const hiddenGroupDefects = [
    { rsn: 'Crack', mo: 1, qty: 10, tone: 'white' as const, cp: 'C', group: 'MUG&CUP' },
    { rsn: 'Ghost', mo: 1, qty: 99, tone: 'white' as const, cp: 'C', group: 'unclassified' },
    { rsn: 'Shade', mo: 1, qty: 50, tone: 'white' as const, cp: 'C', group: 'unknown' },
];
const hiddenGroupProds = [
    { mo: 1, qtyproc: 100, tone: 'white' as const, cp: 'C', group: 'MUG&CUP' },
    { mo: 1, qtyproc: 900, tone: 'white' as const, cp: 'C', group: 'unclassified' },
];
const overviewHiddenGroup = buildReasonsOverview(hiddenGroupDefects, hiddenGroupProds, mixAll);
assert.equal(overviewHiddenGroup.top?.length, 1);
assert.equal(overviewHiddenGroup.top?.[0].rsn, 'Crack');
assert.equal(overviewHiddenGroup.meta.qty, 10);
assert.equal(overviewHiddenGroup.meta.qtyproc, 100);

const dwUnclassifiedDefects = [
    { rsn: 'Pin hole', mo: 1, qty: 40, tone: 'inglaze' as const, cp: 'C', group: 'unclassified' },
    { rsn: 'Shade', mo: 1, qty: 25, tone: 'onglaze' as const, cp: 'C', group: 'unclassified' },
    { rsn: 'Ghost', mo: 1, qty: 99, tone: 'white' as const, cp: 'C', group: 'unclassified' },
];
const dwUnclassifiedProds = [
    { mo: 1, qtyproc: 400, qtyscrp: 40, tone: 'inglaze' as const, cp: 'C', group: 'unclassified' },
    { mo: 1, qtyproc: 250, qtyscrp: 25, tone: 'onglaze' as const, cp: 'C', group: 'unclassified' },
    { mo: 1, qtyproc: 900, qtyscrp: 99, tone: 'white' as const, cp: 'C', group: 'unclassified' },
];
const overviewDwUnclassified = buildReasonsOverview(dwUnclassifiedDefects, dwUnclassifiedProds, {
    ...mixAll,
    family: 'all',
    tone: 'all',
});
assert.equal(overviewDwUnclassified.meta.qty, 65);
assert.equal(overviewDwUnclassified.meta.qtyproc, 650);
const dwCards = Object.fromEntries((overviewDwUnclassified.cards || []).map((card) => [card.tone, card]));
assert.equal(dwCards.inglaze?.qty, 40);
assert.equal(dwCards.inglaze?.qtyproc, 400);
assert.equal(dwCards.onglaze?.qty, 25);
assert.equal(dwCards.onglaze?.qtyproc, 250);
assert.equal(dwCards.white?.qty || 0, 0);
const overviewDwOnly = buildReasonsOverview(dwUnclassifiedDefects, dwUnclassifiedProds, {
    ...mixAll,
    family: 'dw',
    tone: 'all',
});
assert.equal(overviewDwOnly.meta.qty, 65);
assert.equal(overviewDwOnly.meta.qtyproc, 650);

const source = readFileSync(join(process.cwd(), 'src/lib/reasons-query.ts'), 'utf8');
const sqlBlocks = [...source.matchAll(/`([\s\S]*?)`/g)].map((m) => m[1]);
assert.ok(sqlBlocks.some((block) => /SELECT/i.test(block) && /GROUP BY/i.test(block)));
assert.ok(sqlBlocks.some((block) => /@rsn/.test(block) && /pt_desc1/.test(block)));
assert.ok(sqlBlocks.some((block) => /part_family/.test(block) && /unit_tone/.test(block)));
assert.ok(sqlBlocks.some((block) => /MAX\(ISNULL\(qtyp, 0\)\)/.test(block) && /m_job/.test(block)));
assert.match(source, /Promise\.all/);
assert.match(source, /stampReasonsGroups\(await queryReasonsDetailRows/);
assert.match(source, /getMonthRows/);
assert.match(source, /getProdRows/);
assert.match(source, /kilnDirect: true/);
assert.equal((source.match(/kilnDirect: true/g) || []).length, 2);
assert.match(source, /yearsForReasonsParam/);
assert.match(source, /mergeReasonsYearOverviews/);
assert.match(source, /mergeReasonsYearDetails/);
assert.match(source, /stratifyPrev/);
assert.match(source, /fetchYears/);
assert.match(source, /m_cp/);
assert.match(source, /is_round1/);
assert.match(source, /displayCp/);
assert.match(source, /CACHE_VERSION = 'v10'/);
assert.match(source, /MAX\(ISNULL\(qtyscrp, 0\)\)/);
assert.match(source, /MAX\(ISNULL\(qtyrjct, 0\)\)/);
assert.match(source, /RTRIM\(LTRIM\(ISNULL\(m_part, ''\)\)\) AS m_part/);
assert.match(source, /reasonsRowsFromMixPayload/);
assert.match(source, /getQtyProcResponse/);
assert.doesNotMatch(source, /mcpWhereSql/);
assert.doesNotMatch(source, /for \(const tone of REASONS_FOCUS_TONES\)/);
for (const block of sqlBlocks) {
    assert.doesNotMatch(block, /\b(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|ALTER|DROP|CREATE)\b/i);
}

const route = readFileSync(join(process.cwd(), 'src/app/api/reasons/route.ts'), 'utf8');
assert.match(route, /export async function GET/);
assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);

const overviewRoute = readFileSync(join(process.cwd(), 'src/app/api/reasons/overview/route.ts'), 'utf8');
assert.match(overviewRoute, /group:/);
assert.match(overviewRoute, /forming:/);
assert.match(overviewRoute, /glaze:/);

const detailRoute = readFileSync(join(process.cwd(), 'src/app/api/reasons/detail/route.ts'), 'utf8');
assert.match(detailRoute, /export async function GET/);
assert.doesNotMatch(detailRoute, /export async function (POST|PUT|PATCH|DELETE)/);
assert.match(detailRoute, /rsn is required/);
assert.match(detailRoute, /family:/);
assert.match(detailRoute, /tone:/);
assert.match(detailRoute, /cp:/);
assert.match(detailRoute, /group:/);
assert.match(detailRoute, /forming:/);
assert.match(detailRoute, /glaze:/);

const page = readFileSync(join(process.cwd(), 'src/components/dashboard/ReasonsPage.tsx'), 'utf8');
assert.match(page, /\/api\/reasons\/detail/);
assert.equal((page.match(/\/api\/reasons\/detail/g) || []).length, 1);
assert.match(page, /if \(isFocus\)/);
assert.match(page, /if \(!isFocus \|\| !rsn\)/);
assert.match(page, /family,/);
assert.match(page, /tone,/);
assert.match(page, /cp,/);
assert.match(page, /group,/);
assert.match(page, /forming,/);
assert.match(page, /glaze,/);
assert.match(page, /parseReasonsCp/);
assert.match(page, /parseReasonsGroups/);
assert.match(page, /parseReasonsForming/);
assert.match(page, /parseReasonsGlaze/);
assert.match(page, /REASONS_DEFAULT_CP/);
assert.match(page, /Defects Focus/);
assert.match(page, /isFocus \? \(/);
assert.match(page, /ภาพรวม/);
assert.match(page, /showYear=\{!isFocus\}/);
assert.match(page, /next === 'reject'/);
assert.match(page, /rsn: null/);
assert.doesNotMatch(page, /title=\{rsn\}/);
assert.match(page, /currentTheme=\{currentTheme\}/);
assert.match(page, /AbortController/);
assert.match(page, /GroupMultiSelect/);
assert.doesNotMatch(page, /setCustomer/);
assert.doesNotMatch(page, /parseReasonsShape/);

assert.match(page, /toneOptionsForFamily/);
assert.match(page, /applyFamily/);
assert.match(page, /applyTone/);
assert.match(page, /parseReasonsYearParam/);
assert.match(page, /title="Select year"/);
assert.doesNotMatch(page, /year: next === 'all' \? null/);
assert.doesNotMatch(page, /· latest/);
assert.match(page, /DefectPicker/);
assert.match(page, /Select defect/);
assert.doesNotMatch(page, /tone: null,\s*rsn: null/);

const overviewUi = readFileSync(join(process.cwd(), 'src/components/dashboard/ReasonsOverview.tsx'), 'utf8');
assert.match(overviewUi, /Pareto · all defects/);
assert.match(overviewUi, /Pareto top 15 \+ Other/);
assert.match(overviewUi, /Top 15 \+ Other/);
assert.match(overviewUi, /paretoView/);
assert.match(overviewUi, /REASONS_PARETO_CHART_N/);
assert.match(overviewUi, /dataKey="origin"/);
assert.match(overviewUi, /WW \/ DW on each bar/);
assert.match(overviewUi, /White \/ Black on each bar/);
assert.match(overviewUi, /toneOrigin/);
assert.match(overviewUi, /CategoryRatePie/);
assert.match(overviewUi, /qtyscrp'\}\/qtyproc/);
assert.match(overviewUi, /Scrap mix|kindLabel\} mix/);
assert.match(overviewUi, /\(ปีก่อน\)/);
assert.doesNotMatch(overviewUi, /RatePieCard/);
assert.match(overviewUi, /ComposedChart/);
assert.match(overviewUi, /dataKey="cum"/);
assert.match(overviewUi, /Rate vs qtyproc/);
assert.match(overviewUi, /card\.rate/);
assert.match(overviewUi, /Overall trend/);
assert.ok(overviewUi.indexOf('<OverallTrend') < overviewUi.indexOf('{paretoBlock}'));
assert.match(overviewUi, /LineChart/);
assert.match(overviewUi, /_pct/);
assert.match(overviewUi, /YearCompareKpis/);
assert.match(overviewUi, /yearStats/);
assert.match(overviewUi, /grid-cols-\[minmax\(0,3fr\)_minmax\(0,2fr\)\]/);
assert.match(overviewUi, /CombinedTop10/);
assert.match(overviewUi, /HistoryCompare/);
assert.match(overviewUi, /CategoryRatePie/);
assert.match(overviewUi, /PieChart/);
assert.match(overviewUi, /Month/);
assert.match(overviewUi, /Year/);
assert.equal((overviewUi.match(/grid-cols-\[minmax\(0,3fr\)_minmax\(0,2fr\)\]/g) || []).length, 2);
assert.match(overviewUi, /labelAngle/);
assert.match(overviewUi, /ParetoAxisTick/);
assert.match(overviewUi, /labelAngle = fitAll \? -90 : -42/);
assert.match(overviewUi, /longest \* tickFont \* 0\.55/);
assert.match(overviewUi, /RateBarLabel/);
assert.match(overviewUi, /fitAll/);
assert.match(overviewUi, /Maximize2/);
assert.match(overviewUi, /Exit fullscreen/);
assert.match(overviewUi, /show every bar/);
assert.doesNotMatch(overviewUi, /CategoryPareto/);
assert.doesNotMatch(overviewUi, /CategoryTopLists/);
assert.doesNotMatch(overviewUi, /Top 10 by rate/);
assert.doesNotMatch(overviewUi, /label="Categories"/);

const focus = readFileSync(join(process.cwd(), 'src/components/dashboard/ReasonsFocus.tsx'), 'utf8');
assert.doesNotMatch(focus, /function AllMode/);
assert.doesNotMatch(focus, /sharedPctMax/);
assert.doesNotMatch(focus, /family === 'all' && tone === 'all'/);
assert.match(focus, /Pareto/);
assert.doesNotMatch(focus, /UCL/);
assert.match(focus, /stratify/);
assert.doesNotMatch(focus, /Control chart/);
assert.doesNotMatch(focus, /label: 'Control'/);
assert.match(focus, /label: 'All'/);
assert.match(focus, /label: 'Size'/);
assert.match(focus, /function ParetoAxisTick/);
assert.match(focus, /paretoTickLabel/);
assert.match(focus, /labelAngle = -42/);
assert.match(focus, /W\\\/W\\s\+/);
assert.match(focus, /BarChart/);
assert.match(focus, /h-\[22rem\]/);
assert.match(focus, /fmtPct\(item\.pct\)/);
assert.match(focus, /setParetoGroup/);
assert.match(focus, /reasonsParetoGroupOptions/);
assert.match(focus, /filterReasonsCodewareGroup/);
assert.match(focus, /Top \$\{REASONS_CODEWARE_TOP_N\} by rate/);
assert.match(focus, /sortReasonsCodeware/);
assert.match(focus, /sliceReasonsCodeware/);
assert.match(focus, /reasonsCodewareTotal/);
assert.match(focus, /isTotal/);
assert.match(focus, /isOther/);
assert.match(focus, /isTotal \? 'Total'/);
assert.match(focus, /isOther \? 'Other'/);
assert.match(focus, /paretoMetric/);
assert.match(focus, /buildReasonsPareto/);
assert.match(focus, /80% line/);
assert.match(focus, /dataKey="cum"/);
assert.match(focus, /flex-nowrap/);
assert.match(focus, /w-\[10\.75rem\]/);
assert.match(focus, /label: 'Month'/);
assert.match(focus, /label: 'Year'/);
assert.match(focus, /function StratifyYearChart/);
assert.match(focus, /\/api\/export\/reasons-codeware\/excel/);
assert.doesNotMatch(focus, /Stacked by \$\{activeLayer\}/);
assert.match(focus, /function trendDotStyle/);
assert.match(focus, /strokeLinecap="round"/);
assert.match(focus, /lollipop/);
assert.match(focus, /function MiniTrendPanel/);
assert.match(focus, /function CombinedOverlayChart/);
assert.match(focus, /splitPanels/);
assert.match(focus, /LineChart/);
assert.match(focus, /domain=\{\['auto', 'auto'\]\}/);
assert.match(focus, /connectNulls/);
assert.match(focus, /h-\[6\.25rem\]/);
assert.match(focus, /Mix-style line/);
assert.match(focus, /own scale/);
assert.match(focus, /Share of month/);
assert.match(focus, /flex flex-col gap-1\.5/);
assert.match(focus, /min-h-\[6\.25rem\]/);
assert.match(focus, /fmtPct\(share\)/);
assert.match(focus, /Ranked \$\{activeLayer\}/);
assert.match(focus, /items-stretch/);
assert.doesNotMatch(focus, /sharedMax/);
assert.doesNotMatch(focus, /function SparkPeakLabel/);
assert.doesNotMatch(focus, /maxBarSize=\{16\}/);
assert.doesNotMatch(focus, /function HistogramBarLabel/);
assert.doesNotMatch(focus, />Histogram</);
assert.doesNotMatch(focus, /One bar per/);
assert.doesNotMatch(focus, /qty vs share %/);
assert.doesNotMatch(focus, /overlayDotDodge/);
assert.doesNotMatch(focus, /Monthly qty · each/);
assert.match(focus, /b\.qty - a\.qty/);
assert.match(focus, /FamilyShareDonut/);
assert.match(focus, /onOpenTone/);
assert.match(focus, /Rate vs qtyproc/);
assert.match(focus, /REASONS_CODEWARE_MIN_QTYPROC/);
assert.match(focus, />Proc</);
assert.match(focus, /compare=/);
assert.match(focus, /<Line/);
assert.match(focus, /YearStatRow/);
assert.match(focus, /yearStats/);
assert.match(focus, /item\.tone/);
assert.match(focus, /stackDw/);
assert.match(focus, /\(ปีก่อน\)/);
assert.match(focus, /text-3xl/);
assert.match(focus, /hasShare/);
assert.match(focus, /title="Select year"/);
assert.doesNotMatch(focus, /· latest/);
assert.match(focus, /onYear/);
assert.match(focus, /\/api\/export\/reasons-codeware\/excel/);
assert.doesNotMatch(focus, /\/api\/reasons\/detail/);
assert.doesNotMatch(focus, /ภาพรวม/);
assert.doesNotMatch(focus, />Rank</);

const excelLib = readFileSync(join(process.cwd(), 'src/lib/reasons-codeware-excel.ts'), 'utf8');
assert.match(excelLib, /Rate %/);
assert.match(excelLib, /Description 1/);
assert.match(excelLib, /Description 2/);
assert.doesNotMatch(excelLib, /header: 'Code'/);
assert.match(excelLib, /Defects/);
assert.match(excelLib, /Qty share %/);
assert.match(excelLib, /'Total'/);
assert.match(excelLib, /x20-\\x7E/);
const excelRoute = readFileSync(join(process.cwd(), 'src/app/api/export/reasons-codeware/excel/route.ts'), 'utf8');
assert.match(excelRoute, /buildReasonsCodewareWorkbook/);
assert.match(excelRoute, /buildReasonsCodewareDisposition/);
const thaiFile = buildReasonsCodewareFilename({
    rsn: 'C ฟุตบิ่น',
    year: 2026,
    kind: 'scrap',
    family: 'ww',
    rows: [],
});
assert.ok([...thaiFile].every((ch) => ch.charCodeAt(0) <= 127));
assert.ok([...buildReasonsCodewareDisposition(thaiFile)].every((ch) => ch.charCodeAt(0) <= 127));

console.log('check-reasons-list: ok');
