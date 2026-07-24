export type AIPlanStatus = 
  | "pending" 
  | "waiting_confirmation" 
  | "approved" 
  | "running" 
  | "partially_completed" 
  | "completed" 
  | "failed" 
  | "cancelled";

export type AIPlanStepStatus = 
  | "pending" 
  | "running" 
  | "completed" 
  | "failed" 
  | "cancelled"
  | "skipped";

export interface AIPlanStep {
  id: string;              // Ex: step_1
  order: number;
  toolName: string;
  parameters: Record<string, any>;
  dependsOn?: string[];    // Array of step IDs it depends on
  status: AIPlanStepStatus;
  retries: number;
  maxRetries: number;
  estimatedDuration?: number;
  actualDuration?: number;
  startedAt?: string;
  finishedAt?: string;
  result?: any;            // O resultado real após a execução (success = true)
  error?: string;
  intent: string;          // Descrição do que esse step faz (Ex: "Criar Fornecedor")
}

export interface AIExecutionPlan {
  id: string;
  tenantId: string;
  userId: string;
  objective: string;       // Prompt original ou resumo do objetivo
  status: AIPlanStatus;
  steps: AIPlanStep[];
  estimatedDuration?: number;
  actualDuration?: number;
  createdAt: string;
  approvedAt?: string;
  startedAt?: string;
  finishedAt?: string;
  cancelledAt?: string;
  executionMode: "sync" | "async";
  totalRetries: number;
  errorSummary?: string;
}
