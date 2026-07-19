import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Máscara de Data: DD/MM/AAAA
export function maskDate(val: string): string {
  const clean = val.replace(/\D/g, "");
  return clean
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1")
    .substring(0, 10);
}

// 1. Formata moeda padrão pt-BR: R$ 1.250,00
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

// 2. Formata data padrão brasileiro: DD/MM/AAAA
export function formatDate(dateInput: any): string {
  if (!dateInput) return "";
  
  let date: Date;
  if (typeof dateInput === "string") {
    // Se for string YYYY-MM-DD
    if (dateInput.includes("-")) {
      const parts = dateInput.split("-");
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        date = new Date(dateInput);
      }
    } else if (dateInput.includes("/")) {
      // Se já for DD/MM/AAAA, retorna direto
      return dateInput;
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = dateInput;
  }
  
  if (isNaN(date.getTime())) return String(dateInput);
  
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// 3. Calcula idade dinamicamente baseado em DD/MM/AAAA ou YYYY-MM-DD
export function calculateAge(birthdayStr: string | undefined | null): string {
  if (!birthdayStr) return "";
  
  let parts: string[] = [];
  if (birthdayStr.includes("/")) {
    parts = birthdayStr.split("/");
  } else if (birthdayStr.includes("-")) {
    parts = birthdayStr.split("-");
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      return getAgeString(new Date(year, month, day));
    }
  }
  
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    return getAgeString(new Date(year, month, day));
  }
  
  return "";
}

function getAgeString(birthDate: Date): string {
  if (isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age} anos`;
}

// 4. Máscara de CPF: 000.000.000-00
export function maskCpf(val: string): string {
  const clean = val.replace(/\D/g, "");
  return clean
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .substring(0, 14);
}

// 5. Máscara de CNPJ: 00.000.000/0000-00
export function maskCnpj(val: string): string {
  const clean = val.replace(/\D/g, "");
  return clean
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
    .substring(0, 18);
}

// 6. Máscara de Telefone: (11) 99999-9999 ou (11) 3333-3333
export function maskPhone(val: string): string {
  const clean = val.replace(/\D/g, "");
  if (clean.length > 10) {
    // Celular
    return clean
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d{4})$/, "$1-$2")
      .substring(0, 15);
  } else {
    // Telefone Fixo
    return clean
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{4})$/, "$1-$2")
      .substring(0, 14);
  }
}

// 7. Máscara de CEP: 00000-000
export function maskCep(val: string): string {
  const clean = val.replace(/\D/g, "");
  return clean
    .replace(/(\d{5})(\d)/, "$1-$2")
    .substring(0, 9);
}

// 8. Validador de CPF Real
export function validateCpf(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) return false;
  
  return true;
}

// 9. Validador de CNPJ Real
export function validateCnpj(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return false;
  if (/^(\d)\1+$/.test(clean)) return false;
  
  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let results = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (results !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  results = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (results !== parseInt(digits.charAt(1))) return false;
  
  return true;
}
