## Plan: Burndown Chart Static Page

TL;DR: Build a static HTML page that renders a 2D burndown line chart using Chart.js. The page will accept manual input (project start date, project-level estimated completion date, total number of packages, and a table of actual completion dates with cumulative completed packages) and render two lines: the ideal burndown (linear to the estimated date) and the actual burndown.

**Steps**
1. Add form UI to `index.html` to collect: project start date, estimated completion date, total packages, and rows of actual completion entries (date + cumulative completed). Include controls to add/remove rows and a `Render` button. (*no blocking dependencies*)
2. Update `script.js` to: parse form inputs; normalize dates; build a daily date range from start to estimated completion; compute the ideal remaining-work series (linear from total packages → 0 across the date range); build the actual remaining-work series from user entries (fill missing dates by carrying last known cumulative completed forward); align both series to the same date axis.
3. Add Chart.js (CDN) to `index.html` and implement rendering code in `script.js` to draw two line datasets: `Ideal` (dashed) and `Actual` (solid). Configure date x-axis, tooltips, legend, and responsive sizing.
4. Add validation and helpful UX: require total packages and estimated date, validate chronologically, clamp values, and show error messages for invalid rows.
5. Add a sample dataset in `index.html` for quick testing and an optional `Export PNG` button using Chart.js `toBase64Image()`.

**Relevant files**
- [index.html](index.html) — add the form, include Chart.js CDN, add `<canvas>` for chart, and sample data.
- [script.js](script.js) — implement parsing, series generation, Chart.js initialization, and helper utilities.
- [README.md](README.md) — document usage and example inputs.

**Verification**
1. Open [index.html](index.html) in a browser.
2. Enter `totalPackages = 20`, set a start date and estimated completion date 10 days later, add a few actual completion rows with cumulative counts, and click `Render`.
3. Expect: `Ideal` line steadily decreases from 20 → 0 reaching 0 at estimated date; `Actual` line follows entered cumulative completes (remaining = total - cumulative); x-axis shows dates; tooltips show date and remaining value.
4. Edge checks: missing days carry forward last cumulative value; actual cumulative should never exceed totalPackages; invalid dates show validation messages.

**Decisions**
- Chart library: Chart.js (chosen for simplicity and CDN usage).
- Input method: Manual form entries (user asked for static HTML page).
- Estimate granularity: Project-level estimated completion date.
- Total packages: required numeric field; used as starting work amount.

**Further Considerations**
1. Optional CSV import/export for bulk data (add later if needed).
2. Support per-package estimated dates (more complex mapping) if you want per-item tracking.
3. Timezone/date formatting: use ISO `YYYY-MM-DD` in the form to avoid locale issues.

If this plan looks good I will implement the files: update [index.html](index.html) and modify [script.js](script.js).