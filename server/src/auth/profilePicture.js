import crypto from 'node:crypto';
import { HttpError } from '../middleware/errors.js';

const MAX_BYTES = 256 * 1024;
function invalid(message) {
  throw new HttpError(400, 'Please choose another profile picture.', { profilePicture: message });
}

/** The browser converts supported uploads to small JPEGs before sending them. */
export function validateProfilePicture(value) {
  if (value == null) return { picture: null, version: null };
  if (typeof value !== 'string' || value.length > Math.ceil(MAX_BYTES / 3) * 4 + 30)
    invalid('Choose a smaller picture. The saved image must be under 256 KB.');
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) invalid('Choose a PNG, JPEG, or WebP image using the upload button.');
  const picture = Buffer.from(match[1], 'base64');
  if (picture.length > MAX_BYTES || picture.toString('base64') !== match[1])
    invalid('The image is too large or could not be read.');
  if (picture.length < 12 || picture.readUInt16BE(0) !== 0xffd8 || picture.readUInt16BE(picture.length - 2) !== 0xffd9)
    invalid('The picture is not a valid JPEG image.');

  // Read frame dimensions instead of trusting the data URL's label.
  let offset = 2;
  let validFrame = false;
  while (offset + 4 < picture.length) {
    if (picture[offset++] !== 0xff) break;
    while (picture[offset] === 0xff) offset++;
    const marker = picture[offset++];
    if (marker === 0xda || marker === 0xd9 || offset + 2 > picture.length) break;
    const length = picture.readUInt16BE(offset);
    if (length < 2 || offset + length > picture.length) break;
    if ((marker === 0xc0 || marker === 0xc2) && length >= 8) {
      const height = picture.readUInt16BE(offset + 3);
      const width = picture.readUInt16BE(offset + 5);
      validFrame = width > 0 && height > 0 && width <= 512 && height <= 512;
      break;
    }
    offset += length;
  }
  if (!validFrame) invalid('Upload a readable image. Saved avatars must be no larger than 512 × 512 pixels.');
  return { picture, version: crypto.createHash('sha256').update(picture).digest('hex').slice(0, 16) };
}
