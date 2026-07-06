import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../env';

// ============================================================================
// ImageStore — one interface, two symmetric adapters. Product images (and later
// home content) go through this only, so everything downstream (DB persistence
// of url+publicId, delete-pairing, <ImageUploader>) is production-correct.
//
//  - CloudinaryImageStore (real): signed direct-from-browser upload authorized
//    by /admin/upload-signature, f_auto/q_auto optimized delivery, delete by
//    public_id. The API secret never leaves the server.
//  - LocalImageStore (dev fallback): stores files in a local dir and serves
//    them, returning the same { url, publicId } shape; delete removes the file.
//
// Selection is by env: CLOUDINARY_* present → Cloudinary, else Local.
// Activating Cloudinary later is credentials-only, zero code change.
// ============================================================================

export interface UploadAuthorization {
  mode: 'cloudinary' | 'local';
  // Cloudinary signed direct upload:
  cloudName?: string;
  apiKey?: string;
  timestamp?: number;
  signature?: string;
  folder?: string;
  // Local dev upload target:
  uploadUrl?: string;
}

export interface StoredImage {
  url: string;
  publicId: string;
}

export interface ImageStore {
  readonly mode: 'cloudinary' | 'local';
  // What the client needs to perform an upload for this store.
  authorizeUpload(folder?: string): UploadAuthorization;
  // Remove an asset by its public id (paired with deleting the DB row).
  destroy(publicId: string): Promise<void>;
  // Optimized delivery URL (Cloudinary f_auto/q_auto/responsive; else passthrough).
  toDeliveryUrl(url: string): string;
}

const PRODUCTS_FOLDER = 'siddhatva/products';

class CloudinaryImageStore implements ImageStore {
  readonly mode = 'cloudinary' as const;

  constructor() {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
  }

  authorizeUpload(folder: string = PRODUCTS_FOLDER): UploadAuthorization {
    const timestamp = Math.floor(Date.now() / 1000);
    // Sign exactly the params the client will send (sorted) with the secret.
    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp },
      env.cloudinary.apiSecret
    );
    return {
      mode: 'cloudinary',
      cloudName: env.cloudinary.cloudName,
      apiKey: env.cloudinary.apiKey,
      timestamp,
      signature,
      folder,
    };
  }

  async destroy(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  }

  toDeliveryUrl(url: string): string {
    // Insert transformations after `/upload/` for Cloudinary-hosted assets only.
    const marker = '/image/upload/';
    const idx = url.indexOf(marker);
    if (!url.includes('res.cloudinary.com') || idx === -1) return url;
    const head = url.slice(0, idx + marker.length);
    const tail = url.slice(idx + marker.length);
    if (tail.startsWith('f_auto')) return url; // already transformed
    return `${head}f_auto,q_auto,w_1200,c_limit/${tail}`;
  }
}

class LocalImageStore implements ImageStore {
  readonly mode = 'local' as const;
  private readonly dir = path.resolve(process.cwd(), 'uploads');

  constructor() {
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
  }

  authorizeUpload(): UploadAuthorization {
    // Relative to the API base (VITE_API_URL) — the client prepends that.
    return { mode: 'local', uploadUrl: '/admin/upload-dev' };
  }

  // Local-only: the dev upload endpoint hands bytes here (Cloudinary uploads
  // direct from the browser, so it has no equivalent server-side step).
  saveUpload(file: { originalname: string; buffer: Buffer }): StoredImage {
    const ext = (path.extname(file.originalname) || '.bin').toLowerCase();
    const name = `${randomUUID()}${ext}`;
    writeFileSync(path.join(this.dir, name), file.buffer);
    return { url: `${env.publicUrl}/uploads/${name}`, publicId: name };
  }

  async destroy(publicId: string): Promise<void> {
    const target = path.join(this.dir, path.basename(publicId));
    if (existsSync(target)) rmSync(target);
  }

  toDeliveryUrl(url: string): string {
    return url; // local files aren't transformable
  }
}

function createImageStore(): ImageStore {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  if (cloudName && apiKey && apiSecret) {
    // eslint-disable-next-line no-console
    console.log('[imageStore] Cloudinary configured — using CloudinaryImageStore.');
    return new CloudinaryImageStore();
  }
  // eslint-disable-next-line no-console
  console.log('[imageStore] Cloudinary not configured — using LocalImageStore (dev).');
  return new LocalImageStore();
}

export const imageStore = createImageStore();
export { LocalImageStore };
