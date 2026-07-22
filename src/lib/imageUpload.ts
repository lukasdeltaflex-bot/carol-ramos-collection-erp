/**
 * Image Upload & Compression Utility Module
 * Carol Ramos Collection ERP
 * 
 * Centralized image processing configuration and helpers:
 * - Configurable MAX_IMAGE_SIZE_MB = 20 MB
 * - Format validation: JPG, JPEG, PNG, WEBP
 * - Automatic client-side canvas resizing & high-quality compression
 * - Progress tracking callbacks (0% to 100%)
 */

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
  onProgress?: (progressPercent: number) => void;
}

export interface ProcessImageResult {
  success: boolean;
  dataUrl?: string;
  errorMessage?: string;
}

/**
 * Validates and compresses an uploaded image file up to MAX_IMAGE_SIZE_MB (20MB)
 */
export async function processImageUpload(
  file: File,
  options: ProcessImageOptions = {}
): Promise<ProcessImageResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    onProgress
  } = options;

  if (onProgress) onProgress(10);

  // 1. Validar Tipo MIME
  const isTypeAllowed = ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase()) ||
    /\.(jpg|jpeg|png|webp)$/i.test(file.name);

  if (!isTypeAllowed) {
    return {
      success: false,
      errorMessage: `Formato de imagem não suportado (${file.name}). Utilize JPG, PNG ou WebP.`
    };
  }

  // 2. Validar Tamanho Máximo (20MB)
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      success: false,
      errorMessage: `O arquivo excede o limite máximo permitido de ${MAX_IMAGE_SIZE_MB} MB (tamanho enviado: ${sizeInMb} MB).`
    };
  }

  if (onProgress) onProgress(30);

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round(30 + (e.loaded / e.total) * 40);
        onProgress(percent);
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        errorMessage: "Falha ao ler o arquivo de imagem."
      });
    };

    reader.onload = (e) => {
      if (onProgress) onProgress(75);

      const img = new Image();
      img.onerror = () => {
        resolve({
          success: false,
          errorMessage: "Não foi possível carregar a estrutura da imagem."
        });
      };

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Redimensionamento proporcional se exceder maxWidth / maxHeight
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
          if (!ctx) {
            resolve({
              success: false,
              errorMessage: "Erro de renderização gráfica Canvas."
            });
            return;
          }

          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          // Output format WebP or JPEG/PNG
          const outputType = file.type === "image/png" ? "image/png" : "image/webp";
          const dataUrl = canvas.toDataURL(outputType, quality);

          if (onProgress) onProgress(100);

          resolve({
            success: true,
            dataUrl
          });
        } catch (err: any) {
          resolve({
            success: false,
            errorMessage: err?.message || "Erro durante a compressão da imagem."
          });
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
