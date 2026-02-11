// src/lib/utils/imageConverter.ts

export const convertToWebP = (file: File): Promise<{ blob: Blob, fileName: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context failed"));
                    return;
                }
                
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        // Сменяме разширението на .webp
                        const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                        resolve({ blob, fileName: newName });
                    } else {
                        reject(new Error("Blob creation failed"));
                    }
                }, 'image/webp', 0.8); // 80% качество
            };
            
            img.onerror = (err) => reject(err);
        };
        
        reader.onerror = (err) => reject(err);
    });
};