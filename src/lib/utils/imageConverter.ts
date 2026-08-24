// src/lib/utils/imageConverter.ts

export const convertToWebP = (file: File): Promise<{ blob: Blob, fileName: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                // Смаляваме до максимум 2000px по дългата страна — достатъчно за hero/галерия
                // качество на всякакъв екран, но пази файла в разумен размер.
                // Телефонни снимки (12MP+, 4000x3000) преди това се качваха в оригинален
                // размер само конвертирани към WebP — оттам идваше забавянето при зареждане.
                const MAX_DIMENSION = 2000;
                let targetWidth = img.width;
                let targetHeight = img.height;
                if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
                    if (targetWidth >= targetHeight) {
                        targetHeight = Math.round((targetHeight / targetWidth) * MAX_DIMENSION);
                        targetWidth = MAX_DIMENSION;
                    } else {
                        targetWidth = Math.round((targetWidth / targetHeight) * MAX_DIMENSION);
                        targetHeight = MAX_DIMENSION;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context failed"));
                    return;
                }
                
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        // Сменяме разширението на .webp
                        const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                        resolve({ blob, fileName: newName });
                    } else {
                        reject(new Error("Blob creation failed"));
                    }
                }, 'image/webp', 0.82); // 82% качество
            };

            img.onerror = (err) => reject(err);
        };
        
        reader.onerror = (err) => reject(err);
    });
};