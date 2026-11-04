"use client";

import { useEffect, useMemo, useRef } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2 } from "lucide-react";

export interface PropertyMediaItem {
  key: string;
  url?: string;
  file?: File;
}

interface PropertyMediaPickerProps {
  images: PropertyMediaItem[];
  onChange: (images: PropertyMediaItem[]) => void;
  onError: (message: string) => void;
  uploadProgress: number | null;
  error?: string;
}

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function PropertyMediaPicker({
  images,
  onChange,
  onError,
  uploadProgress,
  error,
}: PropertyMediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useMemo(
    () =>
      new Map(
        images
          .filter((image): image is PropertyMediaItem & { file: File } => Boolean(image.file))
          .map((image) => [image.key, URL.createObjectURL(image.file)]),
      ),
    [images],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const selectFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFiles = Array.from(selectedFiles);
    if (images.length + newFiles.length > MAX_IMAGES) {
      onError("A listing can have no more than 10 photos.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (newFiles.some((file) => !ALLOWED_TYPES.has(file.type))) {
      onError("Choose JPEG, PNG, or WebP image files only.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (newFiles.some((file) => file.size > MAX_FILE_BYTES)) {
      onError("Each image must be 10 MB or smaller.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onError("");
    onChange([
      ...images,
      ...newFiles.map((file) => ({
        key: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
      })),
    ]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const next = [...images];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };
  const setCover = (index: number) => {
    if (index === 0) return;
    onChange([images[index], ...images.filter((_, currentIndex) => currentIndex !== index)]);
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white">Property photos</h4>
          <p className="mt-1 text-xs text-slate-500">
            Up to 10 JPEG, PNG, or WebP images; 10 MB or smaller each. First photo is the cover.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={images.length >= MAX_IMAGES || uploadProgress !== null}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
        >
          <ImagePlus className="h-4 w-4" />
          Add photos
        </button>
      </header>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => selectFiles(event.target.files)}
      />
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => {
            const previewUrl = image.url ?? previewUrls.get(image.key);
            return (
              <li key={image.key} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                  {previewUrl && (
                    <img src={previewUrl} alt={`Property photo ${index + 1}`} className="h-full w-full object-cover" />
                  )}
                  {index === 0 && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-1 text-[11px] font-semibold text-white">
                      <Star className="h-3 w-3 fill-current" /> Cover
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 p-2">
                  <button
                    type="button"
                    onClick={() => setCover(index)}
                    disabled={index === 0 || uploadProgress !== null}
                    aria-label={`Set photo ${index + 1} as cover`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-300 dark:hover:bg-emerald-950"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, -1)}
                    disabled={index === 0 || uploadProgress !== null}
                    aria-label={`Move photo ${index + 1} earlier`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, 1)}
                    disabled={index === images.length - 1 || uploadProgress !== null}
                    aria-label={`Move photo ${index + 1} later`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(images.filter((item) => item.key !== image.key))}
                    disabled={uploadProgress !== null}
                    aria-label={`Remove photo ${index + 1}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-5 text-center text-sm text-slate-500 dark:bg-slate-800/60">
          No photos selected yet.
        </p>
      )}
      {uploadProgress !== null && (
        <div aria-live="polite">
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>Uploading photos</span><span>{uploadProgress}%</span>
          </div>
          <progress className="mt-1 h-2 w-full accent-emerald-600" value={uploadProgress} max="100">
            {uploadProgress}%
          </progress>
        </div>
      )}
    </section>
  );
}
