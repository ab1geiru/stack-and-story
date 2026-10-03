const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const FILE_MAX = 2 * 1024 * 1024;
const AVATAR_SIZE = 256;

/** Keep pictures small and predictable before sending them to the existing JSON API. */
export async function prepareProfilePicture(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP image.');
  if (file.size > FILE_MAX) throw new Error('Choose an image no larger than 2 MB.');

  // Data URLs work with the app's existing image policy, including the built version.
  const url = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('That image could not be read. Try a different picture.'));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('That image could not be read. Try a different picture.'));
    image.src = url;
  });
  const scale = Math.min(1, AVATAR_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The picture could not be prepared. Try again.');
  // Transparent PNGs get a neutral background when converted to JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}
