import fs from 'fs';

const data = JSON.parse(
    fs.readFileSync(new URL('./tmp-pa-data.json', import.meta.url), 'utf8'),
);
const product = 'W/W CMLJ51/G0800(SDA)';
const mCp = 'P2';

const rows = data.filter(
    (r) =>
        (r.pt_desc1 || '').trim() === product &&
        (r.m_cp || '').trim().toUpperCase() === mCp,
);

const subTypMap = new Map();
for (const r of rows) {
    if (!r.rsn_desc || !String(r.rsn_desc).trim()) continue;
    const st = String(r.sub_typ ?? '').trim();
    const key = st || '(blank)';
    subTypMap.set(key, (subTypMap.get(key) || 0) + (r.sub_qty || 0));
}

const subTypDist = [...subTypMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sub_typ, total_sub_qty]) => ({ sub_typ, total_sub_qty }));

const jobKeys = new Set();
let totalQtyscrp = 0;
for (const r of rows) {
    const k = [r.m_doc, r.m_job, r.m_date, r.m_kiln].join('|');
    if (!jobKeys.has(k)) {
        jobKeys.add(k);
        totalQtyscrp += r.qtyscrp || 0;
    }
}

const sumCD = rows
    .filter((r) => ['C', 'D'].includes(String(r.sub_typ || '').trim()) && r.rsn_desc)
    .reduce((s, r) => s + (r.sub_qty || 0), 0);
const sumB = rows
    .filter((r) => String(r.sub_typ || '').trim() === 'B' && r.rsn_desc)
    .reduce((s, r) => s + (r.sub_qty || 0), 0);
const sumP = rows
    .filter(
        (r) =>
            ['P', 'เจียร์'].includes(String(r.sub_typ || '').trim()) && r.rsn_desc,
    )
    .reduce((s, r) => s + (r.sub_qty || 0), 0);

const bReasons = new Map();
for (const r of rows) {
    if (String(r.sub_typ || '').trim() !== 'B' || !r.rsn_desc) continue;
    const d = String(r.rsn_desc).trim();
    bReasons.set(d, (bReasons.get(d) || 0) + (r.sub_qty || 0));
}
const topB = [...bReasons.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([rsn_desc, total_qty]) => ({ rsn_desc, total_qty }));

const cdReasons = new Map();
for (const r of rows) {
    const st = String(r.sub_typ || '').trim();
    if (!['C', 'D'].includes(st) || !r.rsn_desc) continue;
    const d = String(r.rsn_desc).trim();
    cdReasons.set(d, (cdReasons.get(d) || 0) + (r.sub_qty || 0));
}
const topCD = [...cdReasons.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([rsn_desc, total_qty, sub_typ]) => ({ rsn_desc, total_qty }));

console.log(
    JSON.stringify(
        {
            total_rows: rows.length,
            unique_jobs: jobKeys.size,
            sub_typ_distribution: subTypDist,
            total_qtyscrp_jobs: totalQtyscrp,
            sum_sub_qty_C_D: sumCD,
            sum_sub_qty_B: sumB,
            sum_sub_qty_P: sumP,
            gap_qtyscrp_minus_CD: totalQtyscrp - sumCD,
            gap_after_including_B: totalQtyscrp - sumCD - sumB,
            top_B_reasons: topB,
            top_C_D_reasons: topCD,
        },
        null,
        2,
    ),
);
