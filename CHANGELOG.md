# Changelog

All notable changes to the **Sorting Dashboard** project will be documented in this file.

## [1.6.64] - 2026-09-02

### Changed
- **DW codeware:** desc1 uses the family color (Inglaze amber, Onglaze purple). desc2 is white. Onglaze no longer reuses the Inglaze orange.

---

## [1.6.63] - 2026-09-02

### Changed
- **Production Mix:** All firing pie combines P1–P5 as **P**. White / Black (All) adds Top 3 customers + Other below the pie.

---

## [1.6.62] - 2026-08-31

### Changed
- **Production Mix:** FF keeps FRIT and BOM separate (progress, pie, and Year Comparison). All still combines them as Custom.

---

## [1.6.61] - 2026-08-29

### Changed
- **Production Mix:** Production Qty and the firing pie combine FRIT + BOM as **Custom**. Order is Standard (C), Custom, Custom (C), then P1–P5.

---

## [1.6.60] - 2026-08-29

### Changed
- **Production Mix:** Filters stay one row by shrinking width. Height and icons stay the same.

---

## [1.6.59] - 2026-08-29

### Changed
- **Production Mix:** FF hides Custom (C) and keeps first-fire totals as before. Custom (C) in All is capped per product-year at that item’s FRIT/BOM qty so it cannot exceed C1. Production Qty uses a separate progress bar for each firing type.

---

## [1.6.58] - 2026-08-29

### Changed
- **Production Mix:** Production Qty keeps the large total and uses a stacked progress bar instead of written counts. Glaze filter uses the glaze code prefix: T Transparent, G Glossy, A Art, SM Semi-matte, M Matte. All firing view adds **Custom (C)** — the C qty of FRIT/BOM items that also had a C firing.

---

## [1.6.57] - 2026-08-29

### Changed
- **Production Mix:** Production Qty card uses a progress mix instead of large counts. Donut slices and legends sort from largest to smallest.

---

## [1.6.56] - 2026-08-29

### Changed
- **Production Mix:** Year Comparison All is back to Standard as bars and FRIT / BOM as lines. P is a line on the same right axis when All firings is on.

---

## [1.6.55] - 2026-08-29

### Changed
- **Production Mix:** Default is first fire only (FF). An **FF / All** switch sits next to Refresh. All includes P1–P5; the Firing filter shows P rounds only in All.

---

## [1.6.54] - 2026-08-29

### Changed
- **Production Mix:** WW kiln mix now includes P1–P5 as their own firing qty (not folded into first-fire Standard / FRIT / BOM). All totals include P. Year Comparison All adds a combined **P** series. The Firing filter has P1–P5 each.

---

## [1.6.53] - 2026-08-29

### Changed
- **Product / Monthly:** Codeware title sits flush under the top nav with no gap.

---

## [1.6.52] - 2026-08-29

### Changed
- **Product / Monthly:** Codeware title stays pinned at the top of the page while scrolling so the ware name remains visible.

---

## [1.6.51] - 2026-08-29

### Changed
- **Product / Monthly search:** Product names use the same cache pattern as Production Mix (memory + disk, warm on server start, show last list then refresh in the background). Freshness is 2 hours. Refresh still reloads immediately.

---

## [1.6.50] - 2026-08-29

### Changed
- **Production Mix:** Shape / Forming mini charts sit in a two-column grid. The qty table scrolls so the panel stays closer in height to Year Comparison.

---

## [1.6.49] - 2026-08-29

### Changed
- **Production Mix:** Shape / Forming sparklines show X/Y axes, grid, and dots on each period so monthly and yearly movement is easier to read.

---

## [1.6.48] - 2026-08-29

### Changed
- **Production Mix:** Shape / Forming trend uses small-multiple sparklines (one line per group, own scale) so monthly mix stays readable when series sizes differ.

---

## [1.6.47] - 2026-08-29

### Fixed
- **Production Mix:** Restored readable labels (middle dots, year range, Updating, and the FRIT/BOM complete note).

### Changed
- **Production Mix:** Year Comparison and Shape / Forming mix sit on one row from `lg` screens. Charts share height; tables stay compact with scroll if columns overflow.

---

## [1.6.46] - 2026-08-29

### Changed
- **Production Mix:** Shape / Forming mix is a full-width grouped bar (like Year Comparison). Shape shows Top 3 + Other so clusters stay readable.

---

## [1.6.45] - 2026-08-29

### Changed
- **Production Mix:** Customer donut is Top 3 + Other. Shape / Forming trend and ranked bars are one stacked bar (same layout as Year Comparison) with a Shape / Forming toggle.

---

## [1.6.44] - 2026-08-29

### Changed
- **Production Mix:** White or Black selected shows Customer mix (top 6 + Other) in the third card. Shape **Vessel** is labeled **Pitcher**.

---

## [1.6.43] - 2026-08-29

### Changed
- **Production Mix:** Filter chips have icons. Trend by Shape is a single qty series again (FRIT / BOM stay on Forming). White/Black donut reads tone from `unit` (W5240 / W5241). When White or Black is selected, that slot shows Forming mix for that tone.

---

## [1.6.42] - 2026-08-29

### Changed
- **Production Mix:** Qty Process is renamed to Production Mix. Tone filter is All / White / Black (same pills as other pages). Trend by Shape and Forming shows Standard / FRIT / BOM qty inside each group. The extra Firing trend tab is removed.

---

## [1.6.41] - 2026-08-29

### Added
- **Qty Process:** Line filter WW / BW (White `W5240` / Black `W5241`), Customer filter from `pt_desc2`, and Trend tab **Firing** (Standard / FRIT / BOM qty and share over time).

---

## [1.6.40] - 2026-08-28

### Changed
- **Qty Process:** FRIT / BOM complete follows Overview: first-firing `qtycomp` plus C1 special reasons (พ่นฟริต / วางบอม) moved from reject. The stacked chart shows % with a minimum segment height so small shares still show labels.

---

## [1.6.39] - 2026-08-28

### Changed
- **Qty Process:** Process vs Complete / Scrap / Reject is a stacked bar (Complete, Reject, Scrap inside Process) with qty labels, and Reject is included from `qtyrjct`.

---

## [1.6.38] - 2026-08-28

### Fixed
- **Qty Process:** White/Black donut was empty because mix cache had no `tone`. It now uses byYear White/Black when mix lacks tone, and rebuilds the cache with `unit` W5240 / W5241 on mix rows so Firing filters still split White/Black.

---

## [1.6.37] - 2026-08-28

### Changed
- **Qty Process:** White/Black donut always follows Firing / Shape / Forming. Standard firing shows Standard bars only (no FRIT/BOM lines). The firing option is labeled Custom (FRIT+BOM).

---## [1.6.36] - 2026-08-28

### Changed
- **Qty Process:** White/Black donut follows Firing (BOM / FRIT / Special) and shape/forming filters. Year Comparison uses bars when BOM, FRIT, or Special (FRIT+BOM) is selected.

---## [1.6.35] - 2026-08-27

### Changed
- **Qty Process:** Process vs Complete vs Scrap is monthly when a single year is selected, and stays yearly for All years.

---## [1.6.34] - 2026-08-27

### Fixed
- **Overview / Product Analysis:** Kiln badges (and kiln names in the row popup) use each row’s category color when All is selected — WW White teal, WW Black magenta, DW Inglaze amber, DW Onglaze purple.

---## [1.6.33] - 2026-08-27

### Fixed
- **Overview:** Daily Defects Monitor and Data Sorting Logs use each row’s category color (WW White / WW Black / DW Inglaze / DW Onglaze) when All is selected, instead of the single All accent.

---

## [1.6.32] - 2026-08-27

### Changed
- **Qty Process:** Charts and the year filter start at 2567 (All years is 2567–2569). Year Comparison and Trend stay yearly for All years, and switch to monthly when a single year is selected. Trend hides series and periods with no qty.

---## [1.6.31] - 2026-08-27

### Changed
- **Qty Process:** Initial open uses the last saved cache immediately (refresh in the background). Kiln query is split by year and uses sargable filters; the cache is warmed when the server starts.

---

## [1.6.30] - 2026-08-27

### Changed
- **Qty Process:** Faster load — WW SQL matches the presentation (one scan, no desc2 split / second date query), Overview and Product APIs are not fetched while this page is open, and the result is cached 30 minutes.

---

## [1.6.29] - 2026-08-27

### Changed
- **Qty Process:** Category toggle (All / WW / DW) is hidden. Data is WW only (kilndb), so DW is not queried.

---

## [1.6.28] - 2026-08-27

### Changed
- **Qty Process:** Extra chart captions removed.
- **Qty Process:** Process vs Complete vs Scrap is a dual-axis combo — Process qty on the left; Complete % and Scrap % share the right axis (0–100).
- **Qty Process:** Trend tabs are Shape and Forming only (Monthly removed). Qty uses small multiples; Share is stacked %.

---

## [1.6.27] - 2026-08-27

### Changed
- **Qty Process:** Trend chart tabs are Shape and Forming only; Monthly was removed.

---

## [1.6.26] - 2026-08-27

### Changed
- **Qty Process:** Process vs Complete vs Scrap right axis is Complete % and Scrap % (0–100), so year-to-year quality is independent of process volume.

---

## [1.6.25] - 2026-08-27

### Changed
- **Qty Process:** Removed extra chart captions. Process vs Complete vs Scrap is a dual-axis combo: Process bar on the left axis, Complete and Scrap lines sharing the right axis.

---

## [1.6.24] - 2026-08-27

### Changed
- **Qty Process:** Shape / Forming trend defaults to small multiples (one chart per group, own scale, first→last %) so volume up/down is readable. Share % stacked area remains as a Qty / Share toggle.

---

## [1.6.23] - 2026-08-27

### Changed
- **Qty Process:** Process vs Complete vs Scrap is a Process bar plus stacked area (Scrap bottom, Complete on top). Chart tooltips use explicit series colors and readable text.

---

## [1.6.22] - 2026-08-27

### Changed
- **Qty Process:** Process qty is blue on every chart. Complete and Scrap are lines (green / red) with matching table text colors. Shape and Forming share one panel with capsule buttons (default Forming).

---

## [1.6.21] - 2026-08-27

### Changed
- **Qty Process:** Special is split into **FRIT** (special firing, glaze code is not T) and **BOM** (special firing, glaze starts with T, e.g. `/T0040`). Firing filter: Standard / FRIT / BOM / Special.
- **Qty Process combo:** Process vs Complete vs Scrap now reads `qtycomp` / `qtyscrp` the same way as the WW presentation (`MAX` per job).

---

## [1.6.20] - 2026-08-27

### Changed
- **Qty Process:** Shape and Forming are ranked horizontal bars (qty + %) instead of donuts. Added a combo chart of Process qty vs Complete vs Scrap by year.

---

## [1.6.19] - 2026-08-27

### Changed
- **Qty Process:** Year / Firing / Shape / Forming filters moved to the top nav as dropdowns. Year comparison is a stacked bar with share %. Trend is a stacked area with Month / Shape / Forming views. Section titles and donut labels/legends are in English and show %.

---

## [1.6.18] - 2026-08-27

### Added
- **Qty Process** page: production qty by year (Buddhist 2566–2569), ปกติ/พิเศษ (C/C1), White/Black, shape, and forming — same rules as the WW qty-process presentation (C1 if the product has C1, otherwise C; no double-count of Frit). Follows the All / WW / DW category toggle.

### Changed
- **Defect Analysis** is hidden from the sidebar. The pages, APIs, and data files are kept.

### Fixed
- **DW Onglaze cards showing 0:** Overview was taking qty from the first reason row of a job (often 0 on SDB). It now uses the max job qty. Product Analysis uses Grade A `sub_qty` when `qtyp` is empty, and no longer wipes scrap/reject to 0 when reason totals are empty. Empty unused firing-cycle rows (e.g. Frit) are omitted.

---

## [1.6.17] - 2026-08-26

### Fixed
- **DW Onglaze scrap/reject popup:** Onglaze jobs have a blank `m_job`, so clicking a Data Sorting Log row loaded every reason for the product. The popup now loads only that job’s scrap/reject reasons.

---

## [1.6.16] - 2026-08-26

### Fixed
- **Product Analysis:** Changing All / WW / DW (including White, Black, Inglaze, Onglaze) now returns to the empty start screen — product, Cards/Table tab, and loaded stats are cleared.
- **DW Onglaze Data Sorting Log:** Table rows were filtered out because Onglaze product ids (`OG:`) were compared as WW names. The log now matches Onglaze jobs correctly.

---

## [1.6.15] - 2026-08-26

### Changed
- **Product Analysis Table / Data Sorting Log:** Loads job-level qty in one scan instead of exploding every defect reason. Reason details load when a row is clicked.

---

## [1.6.14] - 2026-08-26

### Changed
- **Product Analysis load:** Selecting a product no longer waits for a separate date-range request, then four stats queries, then the sorting-log scan. Stats now auto-range in one call (two SQL scans instead of four). The Table sorting log loads only when opening Table.

---

### Changed
- **WW White / Black search:** Product Analysis and Monthly Analysis search lists only products that exist on the selected unit (`W5240` / `W5241`). Stats, date range, and logs use the same unit filter.
- **WW Black** accent is magenta/pink so it is distinct from **All** (blue).

### Fixed
- **WW White / Black search:** Opening the product search no longer requires an in-app Refresh. Stale cached product lists without unit flags are reloaded automatically.

---

## [1.6.12] - 2026-08-26

### Changed
- **Category accent** now applies across the app (sidebar, Cards/Table, badges, charts, spinners), not only the header bar. DW Inglaze is amber, DW Onglaze purple.
- **WW White** accent is teal so it is distinct from **All** (blue).

---

## [1.6.11] - 2026-08-26

### Changed
- **Category toggle** is available on every page (Overview, Product Analysis, Monthly Analysis, Defect Analysis, Settings).
- Product Analysis / Monthly Analysis search popup lists only products in the selected category (All / WW / DW Inglaze / DW Onglaze). Filter is client-side on the cached product list.

### Fixed
- **DW Onglaze product search:** SDB product-list query failed on date parameters (`sql.Date` / dual pool), so Onglaze items never appeared. Date binds no longer pass mssql type tokens.

---

## [1.6.10] - 2026-08-26

### Changed
- **Category hierarchy:** Overview and Defect Analysis now use **All / WW / DW**. WW expands to **All / White / Black**. DW expands to **All / Inglaze / Onglaze**.
- White / Black unit dropdowns were folded into the WW sub-pills (same `W5240` / `W5241` filter).
- Light fade and accent skin when switching family or sub-category (skipped when `prefers-reduced-motion` or print).

---

## [1.6.9] - 2026-08-26

### Added
- **DW Onglaze source:** Parallel connection to `192.168.2.19` / `Db_Sorting_SDB` / `dbo.v_rpt_sort`.
- **Category toggle:** Overview and Defect Analysis now separate **ALL**, **WW**, **DW Inglaze** (kilndb), and **DW Onglaze** (SDB).

### Changed
- Existing kilndb DW (143) is labeled **DW Inglaze**.
- Product list includes Onglaze items tagged `OG:` so Product / Monthly Analysis query SDB.

---

## [1.6.8] - 2026-08-06

### Added
- **Overview — Data Sorting Logs Export Excel:** Button next to CP/Unit filters; POST `/api/export/overview-sorting-log/excel`; same compact Qty/% layout as Product Analysis, plus **Item number**, separate **Description1** / **Description2** columns, and a Total row.

### Fixed
- **Overview Excel date range:** Export now includes the full filtered 7-day set (UI table still shows only the latest 100 rows for performance).

---

## [1.6.1] - 2026-06-06

### Added
- **Data Sorting Log — Export Excel:** Button on Product Analysis (Table view); POST `/api/export/product-sorting-log/excel`; compact workbook with separate Qty / % columns and Total row.
- **CP card defect popup:** Click a CP card to view all scrap or reject reasons in a modal (`CpDefectModal`).
- **Data Sorting Log — Fullscreen:** Maximize/minimize control; table uses full viewport height instead of the embedded max-height box.
- **Data Sorting Log — Row popup:** Click a row to open Daily Detail Modal (scrap/reject reason breakdown), same as Overview.

### Fixed
- **Scrap reason breakdown:** Grade B lines (`sub_typ = B`) are now counted as scrap alongside C/D — popup and Top 5 reasons match `qtyscrp` totals.

### Changed
- **Data Sorting Log columns:** Date, CP, เตา (was combined Kiln/CP); sort order Date → CP → เตา.
- **Data Sorting Log layout:** Tighter rows; Job and Item columns removed.
- **Data Sorting Log filters:** Respects page Start/End dates; PA raw data refetches on date change; Kiln filter defaults to all kilns except **REWORK**.
- **CP Cards — Top 5:** Larger bold text; full `rsn_desc` with word wrap (no truncation).
- **CP Cards — Progress bar:** Gray “Other” segment when Good + Scrap + Reject is less than Process (with tooltip).
- **Product Analysis layout:** **Cards / Table** toggle moved to the top-right of the product header (`Qty by Grade` label renamed **Table**).
- **CP card defect popup:** Click a CP card to open a modal with **all** scrap or reject reasons (matches the page **Show Scrap / Reject** toggle); cards still preview Top 5 only.
- **P firing cards — Separate / Combine:** Default **Separate**; **Combine** button opens an inline dropdown to pick which P cycles merge into **Combine (P1, P2, …)** (default **All** when entering Combine). Unselected P cycles stay as separate cards.
- **Product stats API:** Per-CP reason lists are no longer capped at Top 5 (full lists for the card popup).

---

## [1.6.0] - 2026-05-25

### Added
- **Product Analysis — Qty by Grade view:** Toggle between Cards and a firing-cycle table (Grade A/B/P with qty and %).
- **Data Sorting Log in Qty view:** Job-level log with Total row at the top of metric columns; CP/Kiln multi-select dropdown with checkboxes.
- **Auto date range:** `/api/product-date-range` sets Start/End when a product is selected (shared by Product & Monthly Analysis).
- **Product list:** 2-year lookback, 1h cache, `?refresh=1` on PA/MA Refresh.

### Changed
- **Auto range rules:** Contiguous years with span >1 → latest 2-year window; missing middle years → full min→max span.
- **C1 logic:** Centralized in `c1-special-reason.ts` across dashboard, stats, and Qty by Grade.
- **Firing cycle rows:** C1 products use 1st=C1 + Frit=C; normal products use 1st=C only.

### Fixed
- **Light theme:** Qty by Grade table Grade A/B/P header text contrast (theme-based, not Tailwind `dark:`).

---

## [1.5.0] - 2026-05-16

### Added
- Daily Defects LINE automation (native images, configurable zoom, dashboard link footer).
- Automatic daily send schedule (Bangkok) in Settings.
- Manual Export Excel / Send LINE under Settings → Daily Defects Report.

### Changed
- Collapsible General Settings and Changelog sections.
- Responsive polish for tables and controls on mobile/tablet.

---

## [1.4.1] - 2026-03-09

### Changed
- **Dashboard Color Enhancement:** Updated reject data colors across all dashboard pages for better visibility:
  - Main reject text: Changed from `text-orange-600` to `text-orange-400` (softer orange tone)
  - Top 2 reject (Top Defect(P)): Changed to `text-yellow-600` (darker yellow tone for distinction)
  - Percentage opacity: Increased from `/60` and `/70` to `/80` for better readability
- **Affected Dashboard Pages:** 
  - Overview page (cards, daily activity table, weekly summary table)
  - Product Analysis view (badges and data displays)
  - Monthly Analysis view (toggle buttons and text)
  - Daily Detail Modal (summary stats)
  - Compact Cards (icons and percentages)

---

## [1.4.0] - 2026-03-05

### Performance & Optimization
- **Parallel API Queries:** Refactored `/api/product-reason-log` and `/api/product-stats` to run multiple SQL queries in parallel using `Promise.all`. This reduces data loading wait times by approximately 2-3x.
- **Skeleton Loaders:** Implemented premium animated skeleton loaders in the Product Analysis view, providing immediate visual structure while data is being fetched.
- **Fetch Logic:** Added immediate clearing of stale data before new fetch starts to ensure skeleton loaders display cleanly without "ghost" data behind them.

### UX & Layout
- **Sidebar Default:** Sidebar is now **collapsed by default** to maximize dashboard workspace.
- **Header Layout:** Moved "ALL/WW/DW" category tabs next to the page title in Overview for a cleaner navigation bar.
- **Search Optimization:** Adjusted product searchbox width in Monthly Analysis to prevent collision with filter controls.

### Visual & UI Refinements
- **Reject Color Coding:** Changed "Total Reject" chart lines and gradients from red to **yellow (`#eab308`)** to clearly distinguish them from scrap reasons.
- **Table Formatting:** Added `whitespace-nowrap` to date columns in production/test tables to ensure date strings stay on a single line.

---

## [1.3.1] - 2026-03-04

### Added
- **C1 Filter Guarantee:** `C1` is now explicitly guaranteed to appear in the Overview CP filter dropdown.

### Changed
- **Date Formatting:** Updated all date displays throughout the dashboard to use the `DD-MM-YYYY` format (Table logs, Trend charts, Headers).

### Fixed
- **C1 Filtering Logic:** Corrected `C1` filter in Overview metrics (Performance Overview, Weekly trend) to include `somboon` user + `CP='C'` records.

---

## [1.3.0] - 2026-03-04

### Changed
- **Renamed CP label:** `C(FRIT&BOM)` → `C1` across all pages (Overview, Data Sorting Logs, Daily Defects Monitor, Monthly Analysis)
- **Renamed CP label:** `Cs` → `C1` in Daily Defects Monitor and Data Sorting Logs tables

### Fixed
- **Reject count calculation:** Excluded `ต้องนำไปพ่น` and `ซ่อมขอบปั่นปาก` reasons from reject count for C1 (somboon user, CP=C) records
  - Fixed in `aggregateMetrics` (Overview cards, Weekly/Daily metrics, Trend data)
  - Fixed in `dailyActivityTable` (Daily Defects Monitor)
  - Fixed in `activityTable` (Data Sorting Logs)
- Quantities from excluded reasons are now correctly moved to `qtycomp` (completed) instead of being counted as rejects

---

## [1.2.0] - 2026-02-28

### Added
- **Dark/Light theme toggle** with persistent preference
- **Monthly Analysis page** with:
  - Monthly Performance Trends (Stacked Area Chart)
  - Top 5 Scrap/Reject Reasons by month
  - Kiln Comparison by month
- **Product Reason Log modal** for drilling into specific defect reasons

### Changed
- Improved table scrollbar styling (modern, consistent across all pages)
- CP filter now includes `C1` (formerly `C(FRIT&BOM)`) as a distinct option

---

## [1.1.0] - 2026-02-26

### Added
- **Data Sorting Logs table** with search, CP filter, and unit filter
- **Daily Defects Monitor** with threshold-based highlighting
- **Overview cards** showing daily/weekly metrics and trend data
- **Product stats breakdown** by Control Point (CP) with top 5 defect reasons

### Changed
- Standalone build output (`output: 'standalone'` in `next.config.ts`)
- Production packaging script (`package_production.bat`) for easy server deployment

---

## [1.0.0] - 2026-02-20

### Added
- Initial release of Sorting Dashboard
- Real-time data from SQL Server database (`dbo.v_rpt_sort_1`)
- Overview page with production metrics
- CP breakdown cards with visual metrics bar
- Responsive design with dark mode support
- Category tabs: WW (White/Black), BW, DW
