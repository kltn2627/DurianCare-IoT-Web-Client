# Cultivation Calendar Web Architecture

## Scope

The calendar module reuses the current Next.js App Router dashboard shell, auth session, `apiFetch()` backend proxy, Tailwind utility style, and lucide icons. It does not introduce React Query, SWR, form libraries, or new UI dependencies.

## Main Pieces

- `src/features/cultivation-calendar/CultivationCalendarWorkspace.tsx`: client workspace for the standalone cultivation calendar: dashboard, calendar, plans, activities, approvals, history, inputs, residue standards, lab samples, and compliance.
- `src/components/dashboard/CropQrBuilder.tsx`: existing Season & QR area, extended with harvest batches, export releases, and traceability snapshots.
- `src/lib/cultivation/client.ts`: typed API client over `/api/backend/...`.
- `src/lib/cultivation/types.ts`: shared frontend contracts for plans, activities, inputs, MRL, lab, harvest, compliance, export release, traceability, and audit data.
- `src/features/cultivation-calendar/permissions.ts`: frontend role-to-permission mapping for UI gates.
- `src/features/cultivation-calendar/labels.ts`: status/type labels, badge classes, and date format helpers.

## Integration

The owner calendar page renders only the API-backed cultivation calendar:

- `/dashboard/client/calendar`

Season, QR, export release, and traceability workflows live under:

- `/dashboard/client/crops`
