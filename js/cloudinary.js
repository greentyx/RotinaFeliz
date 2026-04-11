/**
 * cloudinary.js — Upload de imagens via Cloudinary (unsigned)
 *
 * Cloud Name : ddqpi6qne
 * Upload Preset: RotinaFeliz  (deve estar como "Unsigned" no painel)
 *
 * Uso:
 *   import { uploadImage, resizeImage } from './cloudinary.js';
 *   const url = await uploadImage(file, 'avatars');   // folder opcional
 */

const CLOUD_NAME    = 'ddqpi6qne';
const UPLOAD_PRESET = 'RotinaFeliz';
const UPLOAD_URL    = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Faz upload de um File/Blob para o Cloudinary.
 * @param {File|Blob} file       - arquivo de imagem
 * @param {string}    folder     - pasta no Cloudinary (ex: 'avatars', 'tasks')
 * @param {string}    publicId   - nome público do arquivo (opcional)
 * @returns {Promise<string>}    - URL segura (https) da imagem
 */
export async function uploadImage(file, folder = 'uploads', publicId = null) {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', folder);
  if (publicId) form.append('public_id', publicId);

  const res = await fetch(UPLOAD_URL, { method: 'POST', body: form });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Cloudinary erro ${res.status}`);
  }

  const data = await res.json();
  // Retorna URL otimizada: qualidade automática + formato moderno (webp/avif)
  return data.secure_url.replace('/upload/', '/upload/q_auto,f_auto/');
}

/**
 * Redimensiona uma imagem no browser antes do upload.
 * @param {File}   file      - arquivo original
 * @param {number} maxWidth  - largura máxima em px
 * @param {number} quality   - qualidade JPEG (0–1, padrão 0.85)
 * @returns {Promise<Blob>}
 */
export function resizeImage(file, maxWidth = 512, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale  = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
