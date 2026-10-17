import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Camera, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";
import { shrinkImage } from "@/lib/image";
import { cn } from "@/lib/utils";

/** Picks or snaps a photo, shrinks it, uploads it to Convex storage and reports its id. */
export function PhotoPicker({
  label,
  onChange,
  disabled,
}: {
  label: string;
  onChange: (storageId: Id<"_storage"> | null) => void;
  disabled?: boolean;
}) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    onChange(null);
    try {
      const blob = await shrinkImage(file);
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      setPreview(URL.createObjectURL(blob));
      onChange(storageId);
    } catch (e) {
      setPreview(null);
      toast.error(errorMessage(e, "Couldn't upload that photo. Please try again."));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={label}
        disabled={disabled || uploading}
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => input.current?.click()}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed p-4 text-sm transition-colors",
          preview ? "border-success/40 bg-success-soft" : "border-border bg-subtle hover:border-primary/50",
          "disabled:opacity-60",
        )}
      >
        {preview ? (
          <>
            <img src={preview} alt="Selected photo" className="max-h-48 rounded-lg object-contain" />
            <span className="inline-flex items-center gap-1.5 font-medium text-success">
              <Check className="size-4" aria-hidden /> Uploaded. Tap to replace
            </span>
          </>
        ) : uploading ? (
          <span className="inline-flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Uploading…
          </span>
        ) : (
          <span className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Camera className="size-6" aria-hidden />
            {label}
          </span>
        )}
      </button>
    </div>
  );
}
