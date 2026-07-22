import { BaseDocument } from "@/types/shared";

export interface Supplier extends BaseDocument {
  tenantId: string;
  name: string;           // Razão Social
  tradeName?: string;     // Nome Fantasia
  cnpj?: string;
  ie?: string;            // Inscrição Estadual
  im?: string;            // Inscrição Municipal
  email?: string;
  phone?: string;
  isWhatsapp?: boolean;   // Whether the main phone has WhatsApp
  whatsapp?: string;
  website?: string;
  instagram?: string;     // Instagram handler or url
  facebook?: string;      // Facebook page or url
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
  specialty?: string;     // Carro-chefe / Especialidade principal (ex: "Perfumes Importados", "Body Splash", "Hidratantes")
  specialties?: string[]; // Múltiplas especialidades / produtos comercializados
  status: 'active' | 'inactive';
  createdAt: string;
  
  // Contact representative fields (Req 2)
  contactPerson?: string;
  contactRole?: string;
  contactDepartment?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactIsWhatsapp?: boolean;

  // Commercial / Payment fields
  paymentTerms?: string;  // Condição de pagamento padrão
  leadTimeDays?: number;  // Prazo médio de entrega
  bankName?: string;      // Banco principal
  bankAgency?: string;    // Agência
  bankAccount?: string;   // Conta
  pixKey?: string;        // Chave Pix
  creditLimit?: number;   // Limite de crédito
  attachments?: Array<{ name: string; url: string; size?: number; type?: string }>; // Anexos
}
