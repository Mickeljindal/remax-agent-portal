import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Upload server base URL.
 * Uploads run on the SAME origin as the app (the Node server serves both the
 * React build and the /api/upload endpoints), so this is empty by default.
 * Override with VITE_UPLOAD_SERVER_URL only if you run a separate upload host.
 */
const UPLOAD_SERVER = (import.meta.env.VITE_UPLOAD_SERVER_URL as string | undefined)?.replace(/\/$/, "") || "";

export interface UploadProgress {
  percent: number;
  status: "idle" | "uploading" | "done" | "error";
  error?: string;
  url?: string;
  storagePath?: string;
  loadedBytes?: number;
  totalBytes?: number;
}

interface UploadResult {
  url: string;
  storagePath: string;
  fileName: string;
  size: number;
}

/**
 * Uploads a file to the KloudBean upload server with real progress tracking.
 */
async function uploadToServer(
  bucket: string,
  file: File,
  folder: string,
  onProgress: (p: UploadProgress) => void
): Promise<UploadResult | null> {
  // Get the current user's access token to authenticate with the upload server
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || "";

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const url = `${UPLOAD_SERVER}/api/upload/${bucket}${folder ? `?folder=${encodeURIComponent(folder)}` : ""}`;
    xhr.open("POST", url);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress({
          percent,
          status: "uploading",
          loadedBytes: e.loaded,
          totalBytes: e.total,
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          onProgress({ percent: 100, status: "done", url: res.url, storagePath: res.path });
          resolve({ url: res.url, storagePath: res.path, fileName: res.fileName, size: res.size });
        } catch {
          onProgress({ percent: 0, status: "error", error: "Invalid server response" });
          resolve(null);
        }
      } else {
        let msg = "Upload failed";
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch { /* ignore */ }
        onProgress({ percent: 0, status: "error", error: msg });
        resolve(null);
      }
    };

    xhr.onerror = () => {
      onProgress({ percent: 0, status: "error", error: "Network error — is the upload server running?" });
      resolve(null);
    };

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}

async function deleteFromServer(storagePath: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || "";
  try {
    const res = await fetch(`${UPLOAD_SERVER}/files/${storagePath}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Standalone helper for one-shot uploads without progress UI (images, documents).
 */
export async function uploadFileToServer(
  bucket: string,
  file: File,
  folder: string
): Promise<UploadResult | null> {
  return uploadToServer(bucket, file, folder, () => {});
}

/**
 * Hook to upload course videos to the KloudBean server with a live progress bar.
 */
export function useVideoUpload() {
  const [progress, setProgress] = useState<UploadProgress>({ percent: 0, status: "idle" });
  const startRef = useRef<number>(0);
  const [speed, setSpeed] = useState<string>("");

  const uploadVideo = async (
    file: File,
    courseId: string,
    _moduleTitle: string
  ): Promise<{ url: string; storagePath: string } | null> => {
    startRef.current = Date.now();
    setSpeed("");
    const result = await uploadToServer("course-videos", file, courseId, (p) => {
      setProgress(p);
      if (p.status === "uploading" && p.loadedBytes) {
        const elapsed = (Date.now() - startRef.current) / 1000;
        if (elapsed > 0) {
          const mbps = p.loadedBytes / 1024 / 1024 / elapsed;
          setSpeed(`${mbps.toFixed(1)} MB/s`);
        }
      }
    });
    return result ? { url: result.url, storagePath: result.storagePath } : null;
  };

  const deleteVideo = (storagePath: string) => deleteFromServer(storagePath);
  const reset = () => { setProgress({ percent: 0, status: "idle" }); setSpeed(""); };

  return { progress, speed, uploadVideo, deleteVideo, reset };
}

/**
 * Hook to upload property images to the KloudBean server.
 */
export function usePropertyImageUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File, propertyId: string): Promise<string | null> => {
    setUploading(true);
    const result = await uploadToServer("property-images", file, propertyId, () => {});
    setUploading(false);
    return result?.url || null;
  };

  const deleteImage = async (url: string) => {
    const match = url.match(/\/files\/(.+)$/);
    if (!match) return false;
    return deleteFromServer(match[1]);
  };

  return { uploading, uploadImage, deleteImage };
}

/**
 * Generic file uploader (used for pre-con images, documents) with progress.
 */
export function useFileUpload(bucket: string) {
  const [progress, setProgress] = useState<UploadProgress>({ percent: 0, status: "idle" });

  const upload = async (file: File, folder: string): Promise<UploadResult | null> => {
    return uploadToServer(bucket, file, folder, setProgress);
  };

  const reset = () => setProgress({ percent: 0, status: "idle" });

  return { progress, upload, reset };
}
