export type RiskLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ToolCategory =
  | "Customer"
  | "Product"
  | "Finance"
  | "Marketplace"
  | "Reports"
  | "Tasks"
  | "Memory"
  | "System";

export interface JSONSchema {
  type: string;
  description?: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: JSONSchema;
  enum?: string[];
}

export interface AIToolResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  warnings?: string[];
  executionTime: number; // in milliseconds
  toolVersion: string;
}

export interface AIExecutionContext {
  tenantId: string;
  userId: string;
  userRole: string;
  dryRun?: boolean; // If true, the tool should only simulate the action
  transaction?: any; // e.g. Firebase Firestore Transaction/Batch object
  reasoning?: string; // Explainable AI rationale
  executionPlanId?: string;
  stepId?: string;
}

export interface AIExecutionPlanStep {
  toolId: string;
  parameters: any;
  dependsOn?: string[];
}

export interface AIExecutionPlan {
  planId: string;
  steps: AIExecutionPlanStep[];
}
