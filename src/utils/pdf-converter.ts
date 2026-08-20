import * as pdfjs from 'pdfjs-dist';

// Define the worker source
if (typeof window !== 'undefined' && 'Worker' in window) {
  // We point to the local node_modules worker file which Vite will bundle
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
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
    images.push({ base64, mimeType: 'image/png' });
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
    
    // If multiple pages, we could concatenate them, but usually the first page is enough for most data.
    // However, the instructions say "converte a primeira página (ou as até 3 primeiras páginas)".
    // For now, let's return the first page to keep the server functions compatible with single image input.
    // If the server function supports multiple, we'd change it. 
    // Since current processDocumentWithIA takes one image, we'll return the first one or a stitched one.
    
    if (images.length > 1) {
      // Stitch images vertically
      return stitchImages(images);
    }
    
    return images[0];
  }

  // Regular image processing
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
  
  return {
    base64: base64.split(',')[1],
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
            resolve(images[0]); // Fallback
            return;
          }
          
          let currentY = 0;
          loadedImages.forEach(img => {
            ctx.drawImage(img, 0, currentY);
            currentY += img.height;
          });
          
          resolve({
            base64: canvas.toDataURL('image/png').split(',')[1],
            mimeType: 'image/png'
          });
        }
      };
      img.src = `data:image/png;base64,${imgData.base64}`;
    });
  });
}
