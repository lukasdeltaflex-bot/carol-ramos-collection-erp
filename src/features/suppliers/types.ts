export interface Supplier {
  id: string;
  tenantId: string;
  name: string;           // Razão Social
  tradeName?: string;     // Nome Fantasia
  cnpj?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  logo?: string;          // base64 or URL
  notes?: string;
  category?: string;      // e.g. "Cosméticos", "Embalagens", "Matéria-prima"
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}
