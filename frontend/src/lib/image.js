/** Reads an image file, shrinks it and returns a compact data URL (so it can be stored safely). */
export function fileToDataUrl(file, max, mime) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return reject(new Error('Please choose a PNG, JPG or WEBP image.'));
    if (file.size > 12 * 1024 * 1024) return reject(new Error('That image is too large (max 12 MB).'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * r);
      c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL(mime, 0.88));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    img.src = url;
  });
}
