# Cultivation Calendar Test Cases

## Automated

- `npm run lint`
- `npm run build`

## Manual Smoke Tests

- Open `/dashboard/client/calendar` as a farmer account and confirm the standalone calendar loads from backend APIs.
- Create a cultivation plan with farm, plot, season, dates, and target markets.
- Create a biological activity and confirm it appears in calendar and activity list.
- Create a chemical activity and confirm warning UI plus pending approval workflow.
- Complete an activity and confirm care history refreshes.
- Create agricultural input, MRL, and lab sample from the calendar tabs.
- Run compliance assessment with a season ID and target market.
- Open `/dashboard/client/crops`, review harvest batches, create an export release, and load its traceability snapshot.
- Confirm unauthorized roles see the no-access panel.
