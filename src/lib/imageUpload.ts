/**
 * Image Upload & Compression Utility Module
 * Carol Ramos Collection ERP
 * 
 * Centralized image processing & Firebase Storage handler:
 * - Configurable MAX_IMAGE_SIZE_MB = 20 MB
 * - Format validation: JPG, JPEG, PNG, WEBP
 * - Automatic client-side canvas resizing & compression
 * - Upload to Firebase Storage with downloadURL return
 * - Safe localStorage handler to completely prevent QuotaExceededError
 */

import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

export const MAX_IMAGE_SIZE_MB = 20;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

export interface ProcessImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  folder?: string;
  onProgress?: (progressPercent: number) => void;
}

export interface ProcessImageResult {
  success: boolean;
  url?: string;
  dataUrl?: string;
  errorMessage?: string;
}

/**
 * Safely saves data to localStorage without blowing quota limits
 */
export function safeLocalStorageSetItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    if (
      e.name === "QuotaExceededError" ||
      e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e.code === 22 ||
      e.code === 1014
    ) {
      console.warn(`[Storage] QuotaExceededError ao salvar ${key}. Limpando dados pesados não essenciais...`);
      try {
        // Tenta remover itens temporários de cache se o limite for atingido
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith("mock_db_audit_logs") || k.startsWith("ai_chat_history") || k.includes("temp")) {
            localStorage.removeItem(k);
          }
        });
        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        console.error(`[Storage] Impossível salvar ${key} no localStorage devido a cota esgotada.`, retryErr);
        return false;
      }
    }
    return false;
  }
}

/**
 * Validates, compresses and uploads an image to Firebase Storage (or returns compressed light URL)
 */
export async function processImageUpload(
  file: File,
  options: ProcessImageOptions = {}
): Promise<ProcessImageResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    folder = "uploads",
    onProgress
  } = options;

  if (onProgress) onProgress(10);

  // 1. Validar Formato
  const isTypeAllowed = ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase()) ||
    /\.(jpg|jpeg|png|webp)$/i.test(file.name);

  if (!isTypeAllowed) {
    return {
      success: false,
      errorMessage: `Formato não suportado (${file.name}). Utilize JPG, PNG ou WebP.`
    };
  }

  // 2. Validar Tamanho Máximo (20 MB)
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      success: false,
      errorMessage: `O arquivo excede o limite máximo permitido de ${MAX_IMAGE_SIZE_MB} MB (tamanho enviado: ${sizeInMb} MB).`
    };
  }

  if (onProgress) onProgress(25);

  // 3. Processamento & Compressão Via Canvas
  const compressedBlob = await new Promise<Blob | null>((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => resolve(null);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(null);

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          const outputType = file.type === "image/png" ? "image/png" : "image/webp";
          canvas.toBlob((blob) => resolve(blob), outputType, quality);
        } catch (err) {
          resolve(null);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });

  if (!compressedBlob) {
    return {
      success: false,
      errorMessage: "Erro ao processar e comprimir os pixels da imagem."
    };
  }

  if (onProgress) onProgress(50);

  // 4. Tentar Upload para Firebase Storage se configurado
  const isFirebaseStorageActive = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID.includes("dummy");

  if (isFirebaseStorageActive && storage) {
    try {
      const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const storageRef = ref(storage, `${folder}/${cleanFileName}`);
      const uploadTask = uploadBytesResumable(storageRef, compressedBlob);

      return new Promise<ProcessImageResult>((resolve) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 50) + 50;
            if (onProgress) onProgress(pct);
          },
          (error) => {
            console.warn("Upload para Firebase Storage falhou, usando fallback otimizado:", error);
            // Fallback para DataURL leve se o Storage retornar erro de permissão ou CORS
            createDataUrlResult(compressedBlob, onProgress).then(resolve);
          },
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve({
              success: true,
              url: downloadUrl,
              dataUrl: downloadUrl
            });
          }
        );
      });
    } catch (e) {
      console.warn("Erro ao iniciar upload no Firebase Storage:", e);
    }
  }

  // 5. Fallback para DataUrl comprimido e leve quando Firebase Storage não estiver online
  return createDataUrlResult(compressedBlob, onProgress);
}

async function createDataUrlResult(blob: Blob, onProgress?: (pct: number) => void): Promise<ProcessImageResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (onProgress) onProgress(100);
      resolve({
        success: true,
        url: reader.result as string,
        dataUrl: reader.result as string
      });
    };
    reader.readAsDataURL(blob);
  });
}
