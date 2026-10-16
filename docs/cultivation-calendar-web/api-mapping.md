# Cultivation API Mapping

The frontend calls backend APIs through `apiFetch`, so browser requests go through `/api/backend`.

| UI area | Client method | Backend endpoint |
| --- | --- | --- |
| Plans | `listPlans`, `createPlan`, `getPlan`, `getPlanCalendar` | `/api/v1/cultivation-plans` |
| Activities | `listActivities`, `createActivity`, `updateActivity`, status actions | `/api/v1/cultivation-activities` |
| Care history | `careHistory`, `chemicalHistory`, `getSafeHarvestDate` | `/api/v1/cultivation-seasons/{id}/...` |
| Inputs | `listAgriculturalInputs`, `createAgriculturalInput` | `/api/v1/agricultural-inputs` |
| MRL | `listResidueStandards`, `createResidueStandard`, `importResidueStandards` | `/api/v1/residue-standards` |
| Lab | `listLabSamples`, `getLabSample`, `createLabSample`, `createLabResult` | `/api/v1/lab-samples`, `/api/v1/lab-results` |
| Harvest | `listHarvestBatches`, `getHarvestBatch`, `createHarvestBatch` | `/api/v1/harvest-batches` |
| Compliance | `assessCompliance`, `assessExportRelease` | `/api/v1/cultivation-seasons/{id}/compliance-assessments`, `/api/v1/export-releases/assess` |
| Export | `listExportReleases`, `createExportRelease`, submit/approve/release/recall | `/api/v1/export-releases` |
| Traceability | `traceability` | `/api/v1/export-releases/{id}/traceability` |
| Audit | `auditLogs` | `/api/v1/audit-logs` |

Missing list/detail endpoints needed by the web client were added on the backend cultivation service before frontend integration.

