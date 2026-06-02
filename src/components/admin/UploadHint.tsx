import { Info } from "lucide-react";

interface UploadHintProps {
  /** e.g. "1200 × 675 px (16:9)" */
  recommended?: string;
  /** e.g. "JPG, PNG, WebP" */
  formats?: string;
  /** e.g. "Max 25 MB" */
  maxSize?: string;
  className?: string;
}

/**
 * Small inline tip shown under image/file upload controls so admins know
 * the recommended dimensions, accepted formats, and size limit.
 */
export default function UploadHint({ recommended, formats, maxSize, className = "" }: UploadHintProps) {
  return (
    <p className={`mt-1 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground ${className}`}>
      <Info className="h-3 w-3 mt-0.5 shrink-0 text-[#1a4d8f]" />
      <span>
        {recommended && (
          <>Recommended: <span className="font-medium text-foreground">{recommended}</span>. </>
        )}
        {formats && <>Formats: {formats}. </>}
        {maxSize && <>{maxSize}.</>}
      </span>
    </p>
  );
}

// Shared presets for consistency across the admin
export const UPLOAD_PRESETS = {
  listingThumbnail: { recommended: "1200 × 675 px (16:9)", formats: "JPG, PNG, WebP", maxSize: "Max 25 MB" },
  listingGallery: { recommended: "1920 × 1080 px (16:9)", formats: "JPG, PNG, WebP", maxSize: "Max 25 MB" },
  propertyImage: { recommended: "1200 × 800 px (3:2)", formats: "JPG, PNG, WebP", maxSize: "Max 25 MB" },
  courseThumbnail: { recommended: "1280 × 720 px (16:9)", formats: "JPG, PNG, WebP", maxSize: "Max 25 MB" },
  courseVideo: { recommended: "1080p MP4 (H.264)", formats: "MP4, WebM, MOV", maxSize: "Max 2 GB" },
  documentPdf: { recommended: "PDF preferred", formats: "PDF, DOC, PPT, JPG, PNG", maxSize: "Max 100 MB" },
  avatar: { recommended: "400 × 400 px (square)", formats: "JPG, PNG", maxSize: "Max 5 MB" },
};
