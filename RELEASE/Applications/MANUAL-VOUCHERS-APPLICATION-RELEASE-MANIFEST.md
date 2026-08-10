# Manual Vouchers — Application Release Manifest

Branch: `rescue/manual-vouchers-inventory-core`

## Production-ready application

| Application | Source path | Status |
|---|---|---|
| Manual Stock Vouchers | `PWA/warehouse/vouchers.html` | READY |

## Deployment note

`PWA/warehouse/vouchers.html` remains the single source-of-truth application file. The release directory contains this manifest rather than a duplicate copy of the HTML source.

Deploy the application only after the corresponding Edge Functions are deployed.
