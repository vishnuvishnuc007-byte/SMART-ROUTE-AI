export async function blurImage(imageUrl: string, blurAmount: number = 40): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject('Canvas not supported'); return; }

      // Apply heavy blur
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.drawImage(img, 0, 0);

      // Second pass for extra blur
      ctx.filter = `blur(${blurAmount / 2}px)`;
      ctx.drawImage(canvas, 0, 0);

      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => reject('Failed to load image');
    img.src = imageUrl;
  });
}

export function captureVideoFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.8);
}
