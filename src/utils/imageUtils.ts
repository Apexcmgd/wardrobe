/**
 * Utility functions for image compression, conversion, and clothing artwork generation.
 */

export async function compressImage(
  file: File | Blob,
  maxWidth = 1400,
  maxHeight = 1400,
  quality = 0.85
): Promise<string> {
  // 1. Try modern createImageBitmap first (best for mobile devices, automatically handles EXIF orientation)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const origWidth = bitmap.width;
      const origHeight = bitmap.height;

      // Scale proportionally, do not upscale if smaller
      const scale = Math.min(maxWidth / origWidth, maxHeight / origHeight, 1);
      const width = Math.round(origWidth * scale);
      const height = Math.round(origHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        return dataUrl;
      }
    } catch {
      // Fall through to FileReader fallback
    }
  }

  // 2. Reliable FileReader fallback
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;

        // Calculate scaling factor while strictly preserving aspect ratio
        const scale = Math.min(maxWidth / origWidth, maxHeight / origHeight, 1);
        const width = Math.round(origWidth * scale);
        const height = Math.round(origHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Draw image keeping exact aspect ratio
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try webp first, fallback to jpeg
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('图片解析失败'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('读取图片文件失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * Format timestamp to readable Chinese date and time.
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}年${month}月${day}日`;
}

/**
 * Format timestamp to short date.
 */
export function formatShortDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

/**
 * Generate a default name for clothing item if left blank by user.
 */
export function generateDefaultClothingName(
  categoryName: string,
  subcategoryName: string | null | undefined,
  existingCount: number = 0
): string {
  const base = subcategoryName ? subcategoryName : categoryName;
  const num = existingCount + 1;
  return `${base} #${num}`;
}

/**
 * Generate elegant placeholder SVG illustration for sample clothing items
 */
export function generateClothingArtwork(type: 'tshirt' | 'hoodie' | 'pants' | 'shorts' | 'downjacket' | 'jacket', colorHex: string, bgHex: string): string {
  const width = 600;
  const height = 600;
  
  let pathD = '';
  let detailsD = '';
  
  if (type === 'tshirt') {
    pathD = `M 220 150 Q 300 200 380 150 L 460 210 L 410 270 L 370 240 L 370 470 L 230 470 L 230 240 L 190 270 L 140 210 Z`;
    detailsD = `M 260 168 Q 300 195 340 168`;
  } else if (type === 'shorts') {
    pathD = `M 210 200 L 390 200 L 405 380 L 330 380 L 305 270 L 280 270 L 255 380 L 195 380 Z`;
    detailsD = `M 210 230 L 390 230 M 295 230 L 295 270`;
  } else if (type === 'pants') {
    pathD = `M 220 160 L 380 160 L 395 480 L 325 480 L 305 260 L 285 260 L 265 480 L 205 480 Z`;
    detailsD = `M 220 190 L 380 190`;
  } else if (type === 'downjacket') {
    pathD = `M 230 160 Q 300 190 370 160 L 470 220 L 430 420 L 380 390 L 380 470 L 220 470 L 220 390 L 170 420 L 130 220 Z`;
    detailsD = `M 300 178 L 300 470 M 220 250 L 380 250 M 220 320 L 380 320 M 220 390 L 380 390`;
  } else {
    pathD = `M 220 150 Q 300 190 380 150 L 460 210 L 420 430 L 370 410 L 370 470 L 230 470 L 230 410 L 180 430 L 140 210 Z`;
    detailsD = `M 300 170 L 300 470 M 260 160 L 300 240 L 340 160`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="${bgHex}"/>
      </radialGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="rgba(15, 23, 42, 0.12)"/>
      </filter>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
    <g filter="url(#shadow)">
      <path d="${pathD}" fill="${colorHex}" stroke="#334155" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${detailsD}" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
