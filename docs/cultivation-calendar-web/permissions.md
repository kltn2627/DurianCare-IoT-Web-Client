# Cultivation Permissions

Frontend permission gates are intentionally UI-only. Backend validation remains authoritative.

| Role | Main permissions |
| --- | --- |
| `FARMER` | View/manage plans, execute activities, request chemical use, manage harvest batches |
| `EXPERT` | View plans, execute activities, approve chemical activities, review export releases |
| `ADMIN` | Full cultivation, residue, lab, harvest, export, and audit access |
| `GUEST` | No cultivation access |

The mapping is implemented in `src/features/cultivation-calendar/permissions.ts`.

