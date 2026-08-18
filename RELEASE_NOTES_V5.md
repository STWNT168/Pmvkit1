# PMV Toolkit V5.0.0

## Admin/DPS Dashboard

V5 adds a complete daily SPM update monitoring dashboard.

### Dashboard
- Updated SPM count
- Total active SPM count
- Pending SPM count
- Completion percentage
- Progress bar
- Office-wise total/updated/pending/completion
- List of SPMs who have not updated
- Date selection for historical monitoring
- Manual refresh
- Automatic refresh while the page is visible

### Security
The dashboard endpoint is restricted server-side to Admin/DPS users. Counts are based on distinct `SPM_ID` values.

## Deployment

1. Replace the Apps Script `Code.gs` with the V5 `Code.gs`.
2. Save the Apps Script project.
3. Run `setupSheets()` if required by the project.
4. Deploy a **new web-app version**.
5. Keep the existing API URL in `config.js`.
6. Add the V5 dashboard HTML/CSS/JS files to the frontend.
7. Call `AdminDashboard.init()` when the Admin/DPS screen opens.


### v5.2.0
- Added Total Kits Came Today.
- Added Total Articles Came Today.
- Added Redirected Kits and Redirected Articles.
- Added fields to SPM entry, SPM dashboard and Admin/DPS consolidated dashboard.
- Apps Script automatically adds missing PMV_REPORTS columns when setupSheets() is run.


## v5.3.0 — Automatic receipt/redirection totals
- Removed manual editing of the four receipt/redirection totals.
- Added receipt detail rows (Kit/Article × Received/Redirected).
- Totals are calculated in the browser and recalculated server-side from receiptLines.
- Added PMV_RECEIPTS sheet for audit/detail storage.
- PMV_REPORTS continues to store the four consolidated totals for fast dashboard reporting.
\n## v5.3.1 — Corrected PMV calculations\n\n- Total Pending Kits = Invalid Mobile + Deliverable + Incomplete + Improper Details.\n- Total Pending Articles = Invalid Mobile + Deliverable + Incomplete + Improper Details.\n- Total Kits/Articles Came Today are calculated only from RECEIVED receipt lines.\n- Redirected Kits/Articles are calculated only from REDIRECTED receipt lines.\n- Receipt/redirection totals are independent of pending-status totals.\n- Apps Script recalculates all derived values server-side before saving.\n