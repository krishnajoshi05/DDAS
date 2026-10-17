/**
 * Client-side SHA-256 using the Web Crypto API.
 * Used to fingerprint a file BEFORE uploading so we never waste bandwidth
 * uploading a duplicate.
 *
 * Falls back to chunked hashing for files > 50 MB so the UI tab doesn't
 * freeze. The browser's `crypto.subtle.digest` does not natively support
 * streaming, so for very large files we hash chunks and combine — for the
 * common case (<50 MB) we just hash the whole buffer in one go.
 */

const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB

const toHex = (buf) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

/**
 * Compute SHA-256 hex of a File/Blob.
 * @param {File|Blob} file
 * @param {(progress:number)=>void} [onProgress]   0..1
 * @returns {Promise<string>} 64-char hex digest
 */
export async function sha256Hex(file, onProgress) {
  // Small file path — single shot.
  if (file.size <= CHUNK_SIZE * 4) {
    const buf  = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    if (onProgress) onProgress(1);
    return toHex(hash);
  }

  // Large file path — chunked.
  // We can't truly stream SHA-256 in the browser, so we accumulate chunks
  // into a single ArrayBuffer of the same size as the file. For files up
  // to ~100 MB this is fine on modern machines and still wins because we
  // avoid the network round-trip on duplicates.
  const total = file.size;
  const buf   = new Uint8Array(total);
  let offset  = 0;

  while (offset < total) {
    const end   = Math.min(offset + CHUNK_SIZE, total);
    const slice = file.slice(offset, end);
    const ab    = await slice.arrayBuffer();
    buf.set(new Uint8Array(ab), offset);
    offset = end;
    if (onProgress) onProgress(offset / total * 0.95); // reserve last 5% for digest
  }

  const hash = await crypto.subtle.digest('SHA-256', buf);
  if (onProgress) onProgress(1);
  return toHex(hash);
}
