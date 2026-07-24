import { JSONSchema, RiskLevel, ToolCategory, AIExecutionContext, AIToolResponse } from "./types";

export interface AITool<TParams = any, TResult = any> {
  id: string;
  version: string;
  name: string;
  category: ToolCategory;
  description: string;
  parameters: JSONSchema;
  permissions: string[];
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  enabled: boolean;
  execute: (params: TParams, context: AIExecutionContext) => Promise<AIToolResponse<TResult>>;
}
