import type { ActivityExecution, ActivityInputUsage, CareHistoryResponse } from "@/lib/cultivation/types";

export function groupHistoryRecords(history: Pick<CareHistoryResponse, "executions" | "inputUsages">) {
  const executionsByActivity = new Map<string, ActivityExecution[]>();
  const usagesByExecution = new Map<string, ActivityInputUsage[]>();
  for (const execution of history.executions) {
    executionsByActivity.set(execution.cultivationActivityId, [...(executionsByActivity.get(execution.cultivationActivityId) ?? []), execution]);
  }
  for (const usage of history.inputUsages) {
    usagesByExecution.set(usage.activityExecutionId, [...(usagesByExecution.get(usage.activityExecutionId) ?? []), usage]);
  }
  return { executionsByActivity, usagesByExecution };
}
