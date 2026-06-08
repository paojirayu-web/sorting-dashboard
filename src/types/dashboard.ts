// ─── Data Item (raw row from API) ────────────────────────────
export interface DataItem {
    m_date: string;
    m_kiln: string;
    m_doc: string;
    m_job: string;
    m_part: string;
    pt_desc1: string;
    pt_desc2?: string;
    m_cp: string;
    qtyp: number;
    qtycomp: number;
    qtyscrp: number;
    qtyrjct: number;
    sub_typ: string;
    sub_qty: number;
    rsn_desc: string;
    unit: string;
    m_user: string;
}

// ─── Grouped Row (used in daily/activity tables) ─────────────
export type GroupedRow = DataItem & {
    cdReasons: Map<string, number>;
    pjReasons: Map<string, number>;
    totalScrap: number;
    totalReject: number;
};

// ─── Metrics ─────────────────────────────────────────────────
export interface Metrics {
    totalQtyp: number;
    totalQtycomp: number;
    totalScrap: number;
    totalReject: number;
    compRate: string;
    scrapRate: string;
    rejectRate: string;
}

// ─── Reason Breakdown ────────────────────────────────────────
export interface ReasonBreakdown {
    rsn_desc: string;
    qty: number;
    percentage: string;
}

// ─── CP Data (Product Analysis) ──────────────────────────────
export interface CPData {
    m_cp: string;
    metrics: Metrics;
    reasons: {
        C: ReasonBreakdown[];
        P: ReasonBreakdown[];
    };
    /** Source CP keys when m_cp is Combine (…). */
    mergedFromCp?: string[];
}

// ─── Product Stats ───────────────────────────────────────────
export interface ProductStats {
    overall: {
        metrics: Metrics;
        breakdown: {
            C: ReasonBreakdown[];
            P: ReasonBreakdown[];
        };
    };
    cpBreakdown: CPData[];
    totalStats?: {
        totalQty: number;
        totalPctA: number;
        totalPctReject: number;
        totalPctScrap: number;
        info?: { pt_desc1?: string; pt_desc2: string; m_part?: string };
    };
}

// ─── Monthly Stats ───────────────────────────────────────────
export interface MonthlyMonth {
    month: string;
    label: string;
    metrics: Metrics;
    topScrap: { rsn_desc: string; qty: number }[];
    topReject: { rsn_desc: string; qty: number }[];
    kilns: {
        m_kiln: string;
        qtyp: number;
        qtycomp: number;
        qtyscrp: number;
        qtyrjct: number;
    }[];
}

export interface MonthlyStats {
    months: MonthlyMonth[];
    cpOptions: string[];
}

// ─── Selected Reason (Product Analysis drill-down) ───────────
export interface SelectedReason {
    rsn_desc: string;
    m_cp: string;
    display_cp?: string;
    sub_type: 'C' | 'P';
    /** Omit to skip round-1 filter (e.g. merged P card). */
    is_round1?: boolean;
    /** Merged P card — reason log spans all P CPs (legacy). */
    combined_p?: boolean;
    /** Merged P card — specific CP keys for reason log filter. */
    combined_p_cps?: string[];
}

// ─── Reason Log Entry ────────────────────────────────────────
export interface ReasonLogEntry {
    m_date: string;
    m_doc: string;
    m_job: string;
    m_kiln: string;
    m_cp: string;
    qtyp: number;
    rsn_qty: number;
    pct: number;
    total_defect_qty: number;
}

// ─── Reason Monthly Data ─────────────────────────────────────
export interface ReasonMonthlyEntry {
    month: string;
    qty: number;
    pct: number;
    totalPct?: number;
}

// ─── Product Item (for searchbox autocomplete) ───────────────
export interface ProductItem {
    /** Identifier passed to APIs: pt_desc1 for 142, "DW:"+pt_desc2 for 143 */
    value: string;
    /** Display text in dropdown/input */
    label: string;
    /** Text matched against search query */
    searchText: string;
}

// ─── View Types ──────────────────────────────────────────────
export type ViewType = 'overview' | 'product-analysis' | 'monthly-analysis' | 'settings';
