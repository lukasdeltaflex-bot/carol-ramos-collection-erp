export interface BaseDocument {
  id: string;
  createdAt: any; // Firestore Timestamp, Date, or ISO string
  updatedAt: any;
  createdBy: string; // uid of user
  updatedBy: string; // uid of user
  tenantId?: string; // Tenant context
}
