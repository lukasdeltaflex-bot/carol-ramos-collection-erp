export type FieldType = "text" | "number" | "date" | "status" | "category" | "select";

export type FilterOperator =
  // Texto
  | "contains"
  | "not_contains"
  | "equals"
  | "not_equals"
  | "starts_with"
  | "is_filled"
  | "is_empty"
  // Número / Moeda
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  // Data
  | "before"
  | "after"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  // Status / Select
  | "in";

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  secondValue?: any; // Para operadores 'between'
}

export type LogicalOperator = "AND" | "OR";

export interface CustomFilterGroup {
  logicalOperator: LogicalOperator;
  conditions: FilterCondition[];
}

export interface ColumnDefinition<T = any> {
  id: string;
  label: string;
  type: FieldType;
  getValue: (item: T) => any;
  options?: Array<{ value: string; label: string }>;
  defaultVisible?: boolean;
  alwaysVisible?: boolean;
  align?: "left" | "center" | "right";
  formatValue?: (value: any, item: T) => React.ReactNode;
}

export interface ColumnPreference {
  id: string;
  visible: boolean;
}
