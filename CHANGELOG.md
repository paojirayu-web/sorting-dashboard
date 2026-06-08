# Changelog

All notable changes to the **Sorting Dashboard** project will be documented in this file.

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
