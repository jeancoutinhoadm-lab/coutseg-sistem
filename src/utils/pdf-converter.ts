import * as pdfjs from 'pdfjs-dist';

// Define the worker source
if (typeof window !== 'undefined' && 'Worker' in window) {
  // Use a reliable worker source. 
  // For Vite development, this is often the most stable way to load the worker.
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
}

/**
 * Converts a PDF file into a single concatenated image or returns an array of images.
 * For AI analysis, we typically want the first 3 pages as images.
 */
export async function convertPdfToImages(file: File, maxPages: number = 3): Promise<{ base64: string; mimeType: string }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const images: { base64: string; mimeType: string }[] = [];
  const pagesToProcess = Math.min(pdf.numPages, maxPages);
  
  for (let i = 1; i <= pagesToProcess; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    if (base64) {
      images.push({ base64, mimeType: 'image/png' });
    }
  }
  
  return images;
}

/**
 * Helper to get first image from PDF or the file itself if it's already an image.
 */
export async function getFileForIA(file: File): Promise<{ base64: string; mimeType: string }> {
  if (file.type === 'application/pdf') {
    const images = await convertPdfToImages(file, 3);
    if (images.length === 0) throw new Error("Não foi possível converter o PDF em imagem.");
    
    if (images.length > 1) {
      return stitchImages(images);
    }
    
    return images[0];
  }

  // Regular image processing
  const base64Result = await new Promise<string | ArrayBuffer | null>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  
  if (typeof base64Result !== 'string') {
    throw new Error("Falha ao ler arquivo de imagem");
  }

  const base64Data = base64Result.split(',')[1];
  if (!base64Data) {
    throw new Error("Dados da imagem inválidos");
  }
  
  return {
    base64: base64Data,
    mimeType: file.type
  };
}

async function stitchImages(images: { base64: string; mimeType: string }[]): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;
    
    images.forEach((imgData, index) => {
      const img = new Image();
      img.onload = () => {
        loadedImages[index] = img;
        loadedCount++;
        if (loadedCount === images.length) {
          const totalHeight = loadedImages.reduce((sum, img) => sum + img.height, 0);
          const maxWidth = Math.max(...loadedImages.map(img => img.width));
          
          const canvas = document.createElement('canvas');
          canvas.width = maxWidth;
          canvas.height = totalHeight;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(images[0]);
            return;
          }
          
          let currentY = 0;
          loadedImages.forEach(img => {
            if (img) {
              ctx.drawImage(img, 0, currentY);
              currentY += img.height;
            }
          });
          
          const stitchedBase64 = canvas.toDataURL('image/png').split(',')[1];
          if (stitchedBase64) {
            resolve({
              base64: stitchedBase64,
              mimeType: 'image/png'
            });
          } else {
            resolve(images[0]);
          }
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === images.length) {
          resolve(images[0]);
        }
      };
      img.src = `data:image/png;base64,${imgData.base64}`;
    });
  });
}

