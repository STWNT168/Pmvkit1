# PMV Toolkit Report Dashboard — Setup

## Existing backend configuration used

- Google Apps Script API:
  `https://script.google.com/macros/s/AKfycbwqvDnfAC6ICego36HMebIJPm-n2NW_zr_UOa9Hxmyi-KvH5uHARSkCAUD9zl9r1qHDvg/exec`
- Google Spreadsheet ID:
  `1vEjY1z-147b38XTWV7vRm_9pjXVMfJmjdQtrKRkkLy8`

These values are already wired into `js/config.js` and `backend/Code.gs`.

## New image-aligned report fields

The SPM form now records both:

1. Kits
2. Tool-kit articles

for every line in the supplied report:

- Total pending kits at SO — calculated automatically
- Kits bearing invalid mobile number
- Number of kits Deliverable
- Incomplete Kits
- Kits without proper article details/address
- Total tool-kit articles — calculated automatically

The two totals are calculated from the four detail categories.

## Spreadsheet

The backend adds a new `PMV_REPORTS` sheet without deleting or changing existing `DAILY_DATA`.

Run `setupSheets()` once in Apps Script. It creates the new tab if it does not exist.

`PMV_REPORTS` columns:

`ID, DATE, OFFICE_ID, OFFICE_NAME, SPM_ID, SPM_NAME, TOTAL_PENDING_KITS, TOTAL_PENDING_ARTICLES, INVALID_MOBILE_KITS, INVALID_MOBILE_ARTICLES, DELIVERABLE_KITS, DELIVERABLE_ARTICLES, INCOMPLETE_KITS, INCOMPLETE_ARTICLES, IMPROPER_DETAILS_KITS, IMPROPER_DETAILS_ARTICLES, SUBMITTED_AT, UPDATED_AT, STATUS`

## Dashboards

### SPM
- Own office report
- Date selector
- Total pending kits/articles
- Deliverable kits/articles
- Full category-wise table
- Submission status
- Delete today's report and resubmit correction

### DPS/Admin
- Consolidated date-wise totals
- SPM update completion percentage
- Office-wise consolidated report
- Kits + article counts for every category
- List of SPMs who have not updated

## Important

The sample numbers visible in the supplied image are treated as a field/layout reference only. They are not hard-coded into the application.
