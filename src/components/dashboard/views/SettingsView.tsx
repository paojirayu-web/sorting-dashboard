"use client";

import { Settings as SettingsIcon, Sun, Moon } from 'lucide-react';
import type { Theme, ThemeName } from '@/lib/themes';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { ExportDailyDefectsActions } from '@/components/dashboard/ExportDailyDefectsActions';
import { DailyReportAutomationSettings } from '@/components/dashboard/DailyReportAutomationSettings';
import { SettingsCollapsible } from '@/components/dashboard/SettingsCollapsible';

interface SettingsViewProps {
    theme: Theme;
    currentTheme: ThemeName;
    setCurrentTheme: (t: ThemeName) => void;
}

export function SettingsView({ theme, currentTheme, setCurrentTheme }: SettingsViewProps) {
    return (
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                <SectionHeader title="Settings" subtitle="Application Settings and Version History" theme={theme} />

                <SettingsCollapsible
                    title="General Settings"
                    icon={<SettingsIcon size={24} className={theme.accentText} />}
                    theme={theme}
                >
                    <SettingsCollapsible
                        nested
                        title="Theme Preference"
                        subtitle="Toggle between dark and light mode."
                        theme={theme}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setCurrentTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                                className={`p-2.5 rounded-xl ${theme.inputBg} ${theme.textWhite} border ${theme.borderColor} transition-all flex items-center gap-2 hover:opacity-80`}
                                title="Toggle Theme"
                            >
                                {currentTheme === 'dark' ? (
                                    <Sun size={16} className="text-yellow-400" />
                                ) : (
                                    <Moon size={16} className="text-slate-700" />
                                )}
                                <span className="text-xs font-bold">
                                    {currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                </span>
                            </button>
                        </div>
                    </SettingsCollapsible>

                    <SettingsCollapsible
                        nested
                        title="Daily Defects Report"
                        subtitle="Manual export / LINE send and automatic schedule."
                        theme={theme}
                    >
                        <p className={`text-xs ${theme.textSecondary} -mt-1`}>
                            Manual export: pick a report date below. Automatic LINE uses today
                            (Bangkok) — see schedule settings.
                        </p>
                        <ExportDailyDefectsActions theme={theme} showDatePicker layout="stacked" />
                        <DailyReportAutomationSettings theme={theme} />
                    </SettingsCollapsible>
                </SettingsCollapsible>

                <SettingsCollapsible
                    title="Changelog & Updates"
                    subtitle="Track what's new and what has been fixed in the Sorting Dashboard."
                    theme={theme}
                >
                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8`}>
                    <h3 className={`text-xl font-bold ${theme.accentText} mb-4`}>v1.6.8 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-08-06</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Added</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Overview — Data Sorting Logs Export Excel:</strong> Button next to CP / Unit / Search filters; downloads via <code className={`${theme.inputBg} px-1 rounded`}>/api/export/overview-sorting-log/excel</code>.</li>
                                <li><strong>Excel columns:</strong> Same compact Qty / % layout as Product Analysis, plus <strong>Item number</strong> and separate <strong>Description1</strong> / <strong>Description2</strong> columns, with a Total row.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Fixed</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Overview Excel date range:</strong> Export now includes the full filtered <strong>7-day</strong> set (UI table still shows only the latest 100 rows for performance).</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8`}>
                    <h3 className={`text-xl font-bold ${theme.accentText} mb-4`}>v1.6.7 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-08-04</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Product / Monthly Analysis — product select freeze</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Race fix:</strong> Selecting a ware now waits for auto date-range to finish before loading PA/MA stats — aborted requests no longer clear the loading flag of the in-flight request (UI looked frozen with no data).</li>
                                <li><strong>Browser compat:</strong> Polyfilled <code className={`${theme.inputBg} px-1 rounded`}>AbortSignal.any</code> for older Chrome / Edge / Safari that otherwise failed silently after product pick.</li>
                                <li><strong>Abort-safe loading:</strong> Raw data, monthly stats, and reason-log fetches only clear their own loading state when they are still the active request.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Product Analysis — Top Scrap / Reject data log</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Timeout align:</strong> Reason-log client timeout raised to <strong>120s</strong> to match the DB request timeout (was 60s → skeleton then empty).</li>
                                <li><strong>Faster query:</strong> <code className={`${theme.inputBg} px-1 rounded`}>/api/product-reason-log</code> reduced to two light scans with <code className={`${theme.inputBg} px-1 rounded`}>NOLOCK</code> (clicked reason + monthly totals) instead of pulling every scrap/reject reason or stacking many CTEs.</li>
                                <li><strong>Clear errors:</strong> Timeout / API failures show an explicit message instead of a blank “No records” state; reason selection clears when switching product.</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8`}>
                    <h3 className={`text-xl font-bold ${theme.accentText} mb-4`}>v1.6.6 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-07-20</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Product Analysis — Planning Yield (Table)</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Actual vs Plan:</strong> Yield / Scrap cards show <code className={`${theme.inputBg} px-1 rounded`}>actual% (↑/↓diff%) / plan%</code> on one line; plan % comes from shipment <code className={`${theme.inputBg} px-1 rounded`}>yield_pct</code> via <code className={`${theme.inputBg} px-1 rounded`}>/api/product-planning-yield</code>.</li>
                                <li><strong>Scrap plan:</strong> Scrap plan uses <code className={`${theme.inputBg} px-1 rounded`}>100 − plan yield</code> with inverted better/worse coloring.</li>
                                <li><strong>Card order:</strong> Baseline → Yield → Scrap → Reject (Reject narrower).</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Product Analysis — Table timeline filter</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Separate filters:</strong> Cards and Table keep independent date ranges so switching tabs does not overwrite the other.</li>
                                <li><strong>Month / Year bar:</strong> Table tab uses a labeled period bar (Month or Year unit); drag across cells to set the range; month labels appear on the bar itself.</li>
                                <li><strong>Date capsules:</strong> Days with sorting data in range appear as capsules; selecting them filters the whole Table page (Firing Cycle, Yield cards, and Sorting Log).</li>
                                <li><strong>Hit-test:</strong> Each month/year cell is its own click target so selection matches the cell under the cursor.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Product Analysis — loading &amp; stability</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Stay on Table tab:</strong> Changing the timeline no longer remounts the whole page (which previously reset back to Cards).</li>
                                <li><strong>Skeleton load:</strong> Only Firing Cycle / Yield (and Cards content) show skeleton while stats refresh; Sorting Log uses its own loading state.</li>
                                <li><strong>Debounced fetch:</strong> Timeline range updates wait ~500ms after the last change before calling product-stats / raw APIs — avoids SQL timeout storms while dragging.</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8`}>
                    <h3 className={`text-xl font-bold ${theme.accentText} mb-4`}>v1.6.5 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-06-24</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Defect Analysis — ware breakdown (Top 10)</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Top 10 panel:</strong> Ware ranking shown directly in the right breakdown panel (no popup); default month = latest month in the trend.</li>
                                <li><strong>Ranking rule:</strong> Sorted by <strong>defect %</strong> (<code className={`${theme.inputBg} px-1 rounded`}>qty ÷ qtyproc</code>) high → low; only wares with <strong>qtyproc ≥ 500</strong> are eligible.</li>
                                <li><strong>C/P = ALL:</strong> Each ware row shows a <strong>C / P / C1</strong> badge and ranks separately per C/P (no longer merged across rounds).</li>
                                <li><strong>Unit tabs:</strong> <strong>White / Black</strong> tabs on the breakdown panel filter ware + kiln data; trend chart still uses combined unit scope.</li>
                                <li><strong>Lazy load:</strong> Breakdown loads per selected month only; click a point on the <strong>Defect %</strong> line to switch month.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Defect Analysis — kiln breakdown</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Collapsed by default:</strong> Kiln share hidden until you click a ware row (chevron indicator).</li>
                                <li><strong>Lazy load:</strong> Kiln data fetched only when a ware is expanded.</li>
                                <li><strong>WW fix:</strong> Kiln query no longer requires empty <code className={`${theme.inputBg} px-1 rounded`}>pt_desc2</code> — WW wares with brand sub-lines (e.g. IITTALA) load kiln data correctly.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Defect Analysis — loading &amp; performance</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Defect switch:</strong> Changing defect clears stale chart data immediately and shows <strong>Loading defect trend…</strong> instead of the previous defect&apos;s graph.</li>
                                <li><strong>Synced panels:</strong> Breakdown waits for the trend to finish, then loads — both sides show loading states to avoid mixed old/new data.</li>
                                <li><strong>Faster breakdown:</strong> Split API into <code className={`${theme.inputBg} px-1 rounded`}>part=chart</code> / <code className={`${theme.inputBg} px-1 rounded`}>breakdown</code> / <code className={`${theme.inputBg} px-1 rounded`}>kilns</code>; monthly breakdown scoped to one month with client-side cache.</li>
                                <li><strong>API fix:</strong> Removed server cache on breakdown responses that exceeded Next.js 2&nbsp;MB limit (was causing <strong>Failed to load month breakdown</strong> / HTTP 500).</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8`}>
                    <h3 className={`text-xl font-bold ${theme.accentText} mb-4`}>v1.6.4 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-06-22</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Defect Analysis — layout &amp; trend chart</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Side-by-side layout:</strong> Trend chart and monthly breakdown on one row (70% / 30%); filters (From / To / C/P) moved to the same row as the defect title.</li>
                                <li><strong>Dual-axis trend:</strong> Left axis = %Total Scrap or Reject; right axis = Defect % (of output), scaled independently so defect up/down is easier to read.</li>
                                <li><strong>Tooltip:</strong> Shows total %, defect %, and <strong>share of total scrap/reject</strong> with qty detail.</li>
                                <li><strong>Removed</strong> the secondary defect zoom chart below the main trend.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Defect Analysis — monthly breakdown</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Always expanded:</strong> Removed month collapse/expand; Top 3 ware or kiln per month shown directly.</li>
                                <li><strong>Colors by mode:</strong> Scrap mode uses red; Reject mode uses orange (ware and kiln).</li>
                                <li><strong>DW codeware:</strong> Ware rows show <code className={`${theme.inputBg} px-1 rounded`}>pt_desc1</code> on top and <code className={`${theme.inputBg} px-1 rounded`}>pt_desc2</code> below (143 series).</li>
                                <li><strong>Scroll:</strong> Breakdown matches trend panel height; scroll when months exceed visible area.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Defect Analysis — C/P C1 fix</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>C1 filter:</strong> Trend and breakdown queries now group by <code className={`${theme.inputBg} px-1 rounded`}>m_user</code> (not <code className={`${theme.inputBg} px-1 rounded`}>MAX(m_user)</code>) so somboon + CP=C rows classify as C1 correctly and <code className={`${theme.inputBg} px-1 rounded`}>sub_qty</code> is not lost when filtering C1.</li>
                                <li><strong>Reject trend:</strong> Total line uses %Total Reject (<code className={`${theme.inputBg} px-1 rounded`}>qtyrjct</code> / <code className={`${theme.inputBg} px-1 rounded`}>qtyp</code>) in Reject mode.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Product Analysis — Data Sorting Log (mobile)</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Qty + %:</strong> Mobile cards now show Good / Scrap / Reject as <strong>quantity (percent)</strong>, not percent only.</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8`}>
                    <h3 className={`text-xl font-bold ${theme.accentText} mb-4`}>v1.6.3 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-06-22</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Defect Analysis (new page)</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Scrap / Reject toggle (header):</strong> Choose defect type before search — list and trend load only matching <code className={`${theme.inputBg} px-1 rounded`}>rsn_desc</code> rows.</li>
                                <li><strong>Defect search:</strong> Search box lists <code className={`${theme.inputBg} px-1 rounded`}>rsn_desc</code> filtered by WW/DW/ALL and selected Scrap or Reject mode.</li>
                                <li><strong>Monthly trend:</strong> Line chart and table for the selected defect, with C/P filter.</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8`}>
                    <h3 className={`text-xl font-bold ${theme.accentText} mb-4`}>v1.6.2 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-06-22</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Product Analysis — Yield Planning</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Yield KPI cards (Table view):</strong> Shown between <strong>Analysis Defects by Firing Cycle</strong> and <strong>Data Sorting Log</strong> — no separate Defect/Yield toggle.</li>
                                <li><strong>KPIs:</strong> <strong>Baseline Process</strong> (C or C1), <strong>Actual Yield (Total)</strong>, <strong>Reject Total</strong>, and <strong>Scrap Total</strong> — cumulative Good / Reject / Scrap vs baseline Process for production planning.</li>
                                <li><strong>Through round:</strong> Dropdown to include firing cycles from the base round through the selected C/P (e.g. through P2); defaults to the last round with Process qty.</li>
                                <li><strong>Planning note:</strong> P1/P2 totals may include carry-over from prior rounds; yield is a reference KPI, not strict lot-to-lot yield.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Product Analysis — Data Sorting Log</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Table scroll:</strong> Fixed desktop layout so all columns (Good / Scrap / Reject) remain reachable via horizontal scroll; removed inner <code className={`${theme.inputBg} px-1 rounded`}>overflow-hidden</code> clipping.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>UI fixes</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Dark theme:</strong> <strong>Through round</strong> filter text is readable (explicit select/option colors).</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8`}>
                    <h3 className={`text-xl font-bold ${theme.accentText} mb-4`}>v1.6.1 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-06-06</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Product Analysis — Data Sorting Log</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Table columns:</strong> Split <code className={`${theme.inputBg} px-1 rounded`}>Kiln / CP</code> into <strong>Date</strong>, <strong>CP</strong>, and <strong>เตา</strong> (Date leftmost). Rows sorted by Date (newest first) → CP → เตา.</li>
                                <li><strong>Compact rows:</strong> Tighter row padding; <strong>Job</strong> and <strong>Item</strong> hidden from the table.</li>
                                <li><strong>Date range filter:</strong> Log respects page <code className={`${theme.inputBg} px-1 rounded`}>From</code> / <code className={`${theme.inputBg} px-1 rounded`}>To</code> dates; raw data refetches when the range changes.</li>
                                <li><strong>Default Kiln filter:</strong> <strong>REWORK</strong> is unchecked by default (all other kilns selected).</li>
                                <li><strong>Row detail popup:</strong> Click a row to open the same <strong>Daily Detail Modal</strong> as Overview (Process / Good / Scrap / Reject + full defect reasons).</li>
                                <li><strong>Fullscreen:</strong> Maximize button expands the log to nearly full screen and removes the short embedded height cap.</li>
                                <li><strong>Export Excel:</strong> <strong>Export Excel</strong> button downloads filtered rows via <code className={`${theme.inputBg} px-1 rounded`}>/api/export/product-sorting-log/excel</code> — compact layout with separate Qty and % columns (Good, Scrap, Reject) plus a Total row.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Scrap / Reject reasons</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Grade B scrap:</strong> Reason lines with <code className={`${theme.inputBg} px-1 rounded`}>sub_typ = B</code> are now included in scrap breakdowns (popup, Top 5, stats APIs) so they match ERP <code className={`${theme.inputBg} px-1 rounded`}>qtyscrp</code>.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Product Analysis — Layout &amp; CP Cards</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Cards / Table toggle:</strong> Moved to the top-right of the product header; table view label is <strong>Table</strong> (was Qty by Grade).</li>
                                <li><strong>CP card popup:</strong> Click a card to open all defect reasons for that CP — <strong>Scrap</strong> or <strong>Reject</strong> only, matching the page toggle; Top 5 preview remains on the card.</li>
                                <li><strong>Combine card:</strong> <strong>Separate</strong> (default) vs <strong>Combine</strong> toggle; Combine opens a dropdown on the button to pick which P cycles merge into one <strong>Combine (P1, P2, …)</strong> card (default <strong>All</strong>).</li>
                                <li><strong>Top 5 Scrap / Reject:</strong> Larger <strong>bold</strong> text; <code className={`${theme.inputBg} px-1 rounded`}>rsn_desc</code> shows in full (wraps to multiple lines, no truncation).</li>
                                <li><strong>Progress bar:</strong> Gray segment labeled <strong>Other</strong> when Process qty does not equal Good + Scrap + Reject (hover for qty / %).</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8`}>
                    <h3 className={`text-xl font-bold ${theme.accentText} mb-4`}>v1.6.0 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-05-25</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Product Analysis — Qty by Grade</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Layout toggle:</strong> Switch between <strong>Cards</strong> (CP breakdown cards) and <strong>Qty by Grade</strong> (firing-cycle quantity table).</li>
                                <li><strong>Firing Cycle table:</strong> Rows for 1st / Frit / P1 / P2 firing with <strong>Grade A</strong> (Completed), <strong>Grade B</strong> (Scrap), and <strong>Grade P</strong> (Reject) — each shows Qty and % with bar indicators.</li>
                                <li><strong>C1 special layout:</strong> Products with C1 (somboon + CP=C) use <strong>1st Firing = C1</strong> and <strong>Frit Firing = C</strong>; normal products use <strong>1st = C</strong> only and Frit row stays empty.</li>
                                <li><strong>Data Sorting Log (Qty view):</strong> Job-level log under the grade table; <strong>Total</strong> row moved to the <strong>top</strong> of each metric column (desktop header + mobile summary bar).</li>
                                <li><strong>Multi-filter CP &amp; Kiln:</strong> Dropdown-style filters with <strong>checkboxes</strong> — select more than one CP or kiln at once; <strong>ALL</strong> shows everything.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Auto date range (Product &amp; Monthly Analysis)</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Shared date range:</strong> Product Analysis and Monthly Analysis use the same <code className={`${theme.inputBg} px-1 rounded`}>Start</code> / <code className={`${theme.inputBg} px-1 rounded`}>End</code> dates; changing product updates both pages together.</li>
                                <li><strong>Auto-select on product pick:</strong> Choosing a product calls <code className={`${theme.inputBg} px-1 rounded`}>/api/product-date-range</code> and sets the range from actual sorting data (lookback <strong>2 years</strong>).</li>
                                <li><strong>Contiguous years rule:</strong> If every calendar year from first→last has data and the span is more than one year, the dashboard shows only the <strong>latest 2-year window</strong> (<code className={`${theme.inputBg} px-1 rounded`}>maxYear−1</code> … <code className={`${theme.inputBg} px-1 rounded`}>maxYear</code>).</li>
                                <li><strong>Gap years rule:</strong> If a year in between is missing (e.g. data in 2024 and 2026 but not 2025), the range expands to the <strong>full min→max</strong> span so nothing is hidden.</li>
                                <li><strong>Manual override:</strong> You can still change Start/End dates after auto-fill; charts and tables respect the chosen range.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Product list &amp; data scope</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Wider product search:</strong> Product dropdown/search loads codes from the last <strong>2 years</strong> (was effectively 1 year), so older active codes (e.g. 2024) appear again.</li>
                                <li><strong>Cached list:</strong> <code className={`${theme.inputBg} px-1 rounded`}>/api/products</code> cached ~1 hour; <strong>Refresh</strong> on PA/MA passes <code className={`${theme.inputBg} px-1 rounded`}>?refresh=1</code> to reload immediately.</li>
                                <li><strong>API lookback:</strong> Product stats / PA raw data: 2 years; Monthly stats: 3 years; Overview: 7 days (unchanged).</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>C1 metrics (shared logic)</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li>Centralized in <code className={`${theme.inputBg} px-1 rounded`}>c1-special-reason.ts</code>: somboon + CP=C displays as <strong>C1</strong>; reject reasons <code className={`${theme.inputBg} px-1 rounded`}>ต้องนำไปพ่น</code>, <code className={`${theme.inputBg} px-1 rounded`}>ซ่อมขอบปั่นปาก</code>, and exact <code className={`${theme.inputBg} px-1 rounded`}>P พ่นฟริต</code> / <code className={`${theme.inputBg} px-1 rounded`}>P ปั่นปากวางบอม</code> move qty from reject → completed.</li>
                                <li>Applied consistently on Overview, Daily Defects, Product/Monthly stats, unit filters, and Qty by Grade aggregation.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>UI fixes</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Light theme:</strong> Grade A / B / P header labels in the Qty by Grade table now use dark text on tinted backgrounds (no longer tied to OS <code className={`${theme.inputBg} px-1 rounded`}>dark:</code> classes).</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8`}>
                    <h3 className={`text-xl font-bold ${theme.accentText} mb-4`}>v1.5.0 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-05-16</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Daily Defects LINE Automation</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>LINE report images:</strong> Sends WW(white) and WW(black) table screenshots as native LINE images (not external links).</li>
                                <li><strong>Larger LINE layout:</strong> Dedicated print view with configurable zoom via <code className={`${theme.inputBg} px-1 rounded`}>LINE_SCREENSHOT_ZOOM</code>.</li>
                                <li><strong>Dashboard link footer:</strong> Closing message points to the full web app (<code className={`${theme.inputBg} px-1 rounded`}>APP_BASE_URL/dashboard</code>) instead of an Excel download link.</li>
                                <li><strong>Automatic schedule:</strong> Configurable daily send time in Settings (Bangkok timezone); cron uses today&apos;s date automatically.</li>
                                <li><strong>Manual actions in Settings:</strong> Export Excel and Send LINE moved to Settings → General Settings → Daily Defects Report.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Settings &amp; UI</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Collapsible sections:</strong> General Settings and Changelog fold to headings by default to reduce page length.</li>
                                <li><strong>Responsive polish:</strong> Improved mobile/tablet layout for dashboard tables and controls.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Configuration</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><code className={`${theme.inputBg} px-1 rounded`}>APP_BASE_URL</code> — public LAN URL for links in LINE (e.g. <code className={`${theme.inputBg} px-1 rounded`}>http://192.168.2.30:8021</code>).</li>
                                <li><code className={`${theme.inputBg} px-1 rounded`}>SCREENSHOT_BASE_URL</code> — local URL for Puppeteer on the server (e.g. <code className={`${theme.inputBg} px-1 rounded`}>http://127.0.0.1:8021</code>).</li>
                                <li>Schedule persisted in <code className={`${theme.inputBg} px-1 rounded`}>data/daily-report-automation.json</code>; compatible with pm2 / standalone production package.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8`}>
                    <h3 className={`text-xl font-bold ${theme.accentText} mb-4`}>v1.4.1 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-03-09</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Dashboard Color Enhancement</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Reject Color Update:</strong> Changed main reject text from <code className={`${theme.inputBg} px-1 rounded text-orange-600`}>text-orange-600</code> to <code className={`${theme.inputBg} px-1 rounded text-orange-400`}>text-orange-400</code> for a softer orange tone.</li>
                                <li><strong>Top 2 Reject Distinction:</strong> Updated Top 2 reject (Top Defect(P)) to use <code className={`${theme.inputBg} px-1 rounded text-yellow-600`}>text-yellow-600</code> for better visual distinction.</li>
                                <li><strong>Percentage Visibility:</strong> Increased percentage opacity from <code className={`${theme.inputBg} px-1 rounded`}>/60</code> and <code className={`${theme.inputBg} px-1 rounded`}>/70</code> to <code className={`${theme.inputBg} px-1 rounded`}>/80</code> for improved readability.</li>
                                <li><strong>Global Update:</strong> Applied color changes across all dashboard pages including Overview, Product Analysis, Monthly Analysis, Daily Detail Modal, and Compact Cards.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8`}>
                    <h3 className={`text-xl font-bold ${theme.accentText} mb-4`}>v1.4.0 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-03-05</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Product Analysis (Popup Function)</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Chart Comparison:</strong> Added <strong>Total Scrap / Total Reject</strong> trend lines to clearly compare against the selected defect reason.</li>
                                <li><strong>Visual Styling:</strong> Changed the selected defect reason line color to <strong>Dashed Blue</strong> for better visibility.</li>
                                <li><strong>Default Table View:</strong> Set Production and Test tables to display <strong>Latest Top 10</strong> records by default.</li>
                                <li><strong>Table Data Addition:</strong> Included total <strong>Scrap/Reject</strong> count columns in the log tables for comprehensive data view.</li>
                                <li><strong>Interactive Filtering:</strong> Enabled chart-to-table interactivity; clicking a month on the chart now filters the log tables for that specific month.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Monthly Analysis</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>UI Optimization:</strong> Adjusted search box width to prevent overlapping with filter controls.</li>
                                <li><strong>Core Speedup:</strong> Implemented parallel data fetching to significantly improve page responsiveness.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-6 shadow-sm mb-4`}>
                    <h3 className={`text-xl font-bold ${theme.accentText} mb-4`}>v1.3.1 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-03-04</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Added</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>C1 Filter Guarantee:</strong> <code className={`${theme.inputBg} px-1 rounded`}>C1</code> is now explicitly guaranteed to appear in the Overview CP filter dropdown.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Changed</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Date Formatting:</strong> Updated all date displays throughout the dashboard to use the <code className={`${theme.inputBg} px-1 rounded`}>DD-MM-YYYY</code> format.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Fixed</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>C1 Filtering Logic:</strong> Corrected <code className={`${theme.inputBg} px-1 rounded`}>C1</code> filter in Overview metrics cards and Trend charts to correctly include <code className={`${theme.inputBg} px-1 rounded text-yellow-400`}>somboon</code> user + <code className={`${theme.inputBg} px-1 rounded`}>CP=&apos;C&apos;</code> records.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-6 shadow-sm`}>
                    <h3 className={`text-xl font-bold ${theme.accentText} mb-4`}>v1.3.0 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-03-04</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Changed</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li>Renamed CP label: <code className={`${theme.inputBg} px-1 rounded`}>C(FRIT&BOM)</code> → <code className={`${theme.inputBg} px-1 text-blue-400 rounded`}>C1</code> across all pages (Overview, Data Sorting Logs, Daily Defects Monitor, Monthly Analysis).</li>
                                <li>Renamed CP label: <code className={`${theme.inputBg} px-1 rounded`}>Cs</code> → <code className={`${theme.inputBg} px-1 text-blue-400 rounded`}>C1</code> in Daily Defects Monitor and Data Sorting Logs tables.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Fixed</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Reject count calculation:</strong> Excluded <code className={`${theme.inputBg} px-1 rounded`}>ต้องนำไปพ่น</code> and <code className={`${theme.inputBg} px-1 rounded`}>ซ่อมขอบปั่นปาก</code> reasons from reject count for C1 (somboon user, CP=C) records.</li>
                                <li>Quantities from these excluded reasons are now correctly moved to <code className={`${theme.inputBg} px-1 rounded`}>qtycomp</code> (Completed) instead of being counted as Reject.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-6 shadow-sm`}>
                    <h3 className={`text-xl font-bold ${theme.textWhite} mb-4`}>v1.2.0 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-02-28</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Added</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Dark/Light theme toggle</strong> with persistent preference.</li>
                                <li><strong>Monthly Analysis page</strong> with Performance Trends (Stacked Area Chart), Top 5 Scrap/Reject Reasons by month, and Kiln Comparison.</li>
                                <li><strong>Product Reason Log modal</strong> for drilling into specific defect reasons.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Changed</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li>Improved table scrollbar styling to be modern and consistent across all pages.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-6 shadow-sm`}>
                    <h3 className={`text-xl font-bold ${theme.textWhite} mb-4`}>v1.1.0 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-02-26</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Added</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li><strong>Data Sorting Logs table</strong> with search, CP filter, and unit filter.</li>
                                <li><strong>Daily Defects Monitor</strong> with threshold-based highlighting.</li>
                                <li><strong>Overview cards</strong> showing daily/weekly metrics and trend data.</li>
                                <li>Product stats breakdown by Control Point (CP) with top 5 defect reasons.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Changed</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li>Deployed as Standalone build (<code className={`${theme.inputBg} px-1 rounded`}>output: &apos;standalone&apos;</code>) for enhanced server performance.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-6 shadow-sm`}>
                    <h3 className={`text-xl font-bold ${theme.textWhite} mb-4`}>v1.0.0 <span className={`text-sm font-normal ${theme.textMuted} ml-2`}>2026-02-20</span></h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Added</h4>
                            <ul className={`list-disc list-inside text-sm ${theme.textSecondary} space-y-1`}>
                                <li>Initial release of Sorting Dashboard.</li>
                                <li>Real-time dashboard reporting for metrics grouped by category.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                </SettingsCollapsible>

        </div>
    );
}
