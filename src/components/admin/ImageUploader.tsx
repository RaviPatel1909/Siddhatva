import React, { useRef, useState } from 'react';
import { uploadImage } from '../../api/admin';

export interface UploaderImage {
  url: string;
  publicId?: string | null;
  alt?: string;
}

interface InFlight {
  id: string;
  name: string;
  progress: number;
  error?: boolean;
}

interface ImageUploaderProps {
  images: UploaderImage[];
  onChange: (images: UploaderImage[]) => void;
  max?: number;
}

// Reusable image manager: drag/drop or pick, upload with progress (Cloudinary
// direct or local dev store — abstracted by uploadImage), preview, remove,
// reorder, and designate the primary (index 0). Used by product CRUD and,
// later, home content.
export const ImageUploader: React.FC<ImageUploaderProps> = ({ images, onChange, max = 8 }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [inflight, setInflight] = useState<InFlight[]>([]);

  const remaining = max - images.length - inflight.length;

  const handleFiles = async (files: FileList | File[]) => {
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/'));
    let current = images;
    for (const file of picked) {
      if (current.length >= max) break;
      const id = `${file.name}-${Math.random().toString(36).slice(2)}`;
      setInflight((prev) => [...prev, { id, name: file.name, progress: 0 }]);
      try {
        const uploaded = await uploadImage(file, (pct) =>
          setInflight((prev) => prev.map((u) => (u.id === id ? { ...u, progress: pct } : u)))
        );
        current = [...current, { url: uploaded.url, publicId: uploaded.publicId, alt: file.name }];
        onChange(current);
        setInflight((prev) => prev.filter((u) => u.id !== id));
      } catch {
        setInflight((prev) => prev.map((u) => (u.id === id ? { ...u, error: true } : u)));
      }
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const removeAt = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const makePrimary = (i: number) => {
    if (i === 0) return;
    const next = [...images];
    const [item] = next.splice(i, 1);
    next.unshift(item);
    onChange(next);
  };

  return (
    <div className="space-y-md">
      {remaining > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-xs rounded-xl border-2 border-dashed px-lg py-xl cursor-pointer transition-colors ${
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-outline-variant hover:border-primary/60 bg-surface-container-lowest/40'
          }`}
        >
          <span className="material-symbols-outlined text-primary text-3xl">cloud_upload</span>
          <p className="text-sm text-on-surface">Drag &amp; drop images, or click to browse</p>
          <p className="text-xs text-on-surface-variant">{remaining} more allowed · PNG, JPG, WebP</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {(images.length > 0 || inflight.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
          {images.map((img, i) => (
            <div
              key={img.publicId ?? img.url}
              className="relative group aspect-square rounded-lg overflow-hidden border border-outline-variant/40 bg-surface-container-high"
            >
              <img src={img.url} alt={img.alt ?? ''} className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Primary
                </span>
              )}
              <div className="absolute inset-0 bg-on-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-xs">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move left"
                  className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-on-surface disabled:opacity-30 hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => makePrimary(i)}
                    aria-label="Set as primary"
                    className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-on-surface hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-[16px]">star</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label="Remove image"
                  className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-on-surface hover:text-error"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === images.length - 1}
                  aria-label="Move right"
                  className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-on-surface disabled:opacity-30 hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          ))}
          {inflight.map((u) => (
            <div
              key={u.id}
              className="aspect-square rounded-lg border border-outline-variant/40 bg-surface-container-high flex flex-col items-center justify-center gap-xs p-sm"
            >
              {u.error ? (
                <>
                  <span className="material-symbols-outlined text-error">error</span>
                  <p className="text-[10px] text-error text-center">Upload failed</p>
                </>
              ) : (
                <>
                  <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${u.progress}%` }} />
                  </div>
                  <p className="text-[10px] text-on-surface-variant">{u.progress}%</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
