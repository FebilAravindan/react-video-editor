"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useStudioStore } from "@/stores/studio-store";
import { useProjectStore } from "@/stores/project-store";
import { Image, Video, Audio, Placeholder, Log } from "openvideo";
import { Loader2, Package, Play, Upload, Music, Trash2 } from "lucide-react";
import { storageService } from "@/lib/storage/storage-service";
import type { MediaFile, MediaType } from "@/types/media";
import { uploadFile } from "@/lib/upload-utils";

const STUDIO_BASE = "http://localhost:3000";
const UPLOADS_STORAGE_KEY = "designcombo_uploads";
const UPLOADS_PROJECT_ID = "local-uploads";

// ── Project asset types (from studio API) ──────────────────────────────────

interface ProjectAsset {
  id: string;
  filename: string;
  localPath: string;
  type: "image" | "video";
  name: string;
  source: "pixabay" | "pexels" | "unsplash";
  sourceUrl: string;
  addedAt: string;
}

// ── Uploaded asset types (local OPFS/R2) ──────────────────────────────────

interface UploadedAsset {
  id: string;
  type: MediaType;
  src: string;
  name: string;
  duration?: number;
}

function detectFileType(file: File): MediaType {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext))
    return "audio";
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "avi", "mkv"].includes(ext))
    return "video";
  return "image";
}

// ── Video thumbnail (captures first frame via canvas) ─────────────────────

function VideoThumbnail({ src }: { src: string }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const onSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 160;
        canvas.height = video.videoHeight || 90;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setThumbnail(canvas.toDataURL("image/jpeg", 0.7));
        }
      } catch {
        // tainted canvas or CORS — leave null (plain dark bg)
      }
      video.src = "";
    };

    const onMeta = () => {
      video.currentTime = 0.01;
    };

    video.addEventListener("loadedmetadata", onMeta, { once: true });
    video.addEventListener("seeked", onSeeked, { once: true });
    video.src = src;

    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("seeked", onSeeked);
      video.src = "";
    };
  }, [src]);

  return (
    <>
      {thumbnail ? (
        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-secondary/80" />
      )}
      <div className="absolute bottom-1 left-1 bg-black/60 rounded p-0.5">
        <Play size={10} className="text-white fill-white" />
      </div>
    </>
  );
}

// ── Section label ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1 mb-2">
      {children}
    </p>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

export default function PanelProjectAssets() {
  const params = useParams();
  const projectId = params?.projectId as string | undefined;
  const { studio } = useStudioStore();
  const { canvasSize } = useProjectStore();

  // Project assets state
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  // Uploads state
  const [uploads, setUploads] = useState<UploadedAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadedUploads, setIsLoadedUploads] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch project assets from studio API ──────────────────────────────

  useEffect(() => {
    if (!projectId) {
      setIsLoadingAssets(false);
      return;
    }

    const controller = new AbortController();

    const fetchAssets = async () => {
      setIsLoadingAssets(true);
      setAssetsError(null);
      try {
        const res = await fetch(`${STUDIO_BASE}/api/projects/${projectId}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAssets(data.project?.assets ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setAssetsError("Could not load project assets.");
        Log.error("PanelProjectAssets fetch failed:", err);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    fetchAssets();
    return () => controller.abort();
  }, [projectId]);

  // ── Load uploads from OPFS / localStorage ────────────────────────────

  const loadUploads = useCallback(async () => {
    try {
      if (!storageService.isOPFSSupported()) {
        const stored = localStorage.getItem(UPLOADS_STORAGE_KEY);
        setUploads(stored ? JSON.parse(stored) : []);
        setIsLoadedUploads(true);
        return;
      }

      const opfsFiles = await storageService.loadAllMediaFiles({ projectId: UPLOADS_PROJECT_ID });

      if (opfsFiles.length === 0) {
        const stored = localStorage.getItem(UPLOADS_STORAGE_KEY);
        setUploads(stored ? JSON.parse(stored) : []);
        setIsLoadedUploads(true);
        return;
      }

      const oldEntries: UploadedAsset[] = JSON.parse(
        localStorage.getItem(UPLOADS_STORAGE_KEY) || "[]",
      );

      const recovered: UploadedAsset[] = opfsFiles.map((file) => {
        const blobUrl = file.url || URL.createObjectURL(file.file);
        const old = oldEntries.find((e) => e.id === file.id || e.name === file.name);
        const isR2 = old?.src && !old.src.startsWith("blob:");
        return {
          id: file.id,
          name: file.name,
          src: isR2 ? old!.src : blobUrl,
          type: file.type,
          duration: file.duration,
        };
      });

      setUploads(recovered);
      localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(recovered));
    } catch (err) {
      Log.error("Failed to load uploads:", err);
      const stored = localStorage.getItem(UPLOADS_STORAGE_KEY);
      setUploads(stored ? JSON.parse(stored) : []);
    } finally {
      setIsLoadedUploads(true);
    }
  }, []);

  useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  // ── Upload handler ────────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAssets: UploadedAsset[] = [];

    try {
      for (const file of Array.from(files)) {
        const id = crypto.randomUUID();
        const type = detectFileType(file);

        let src = URL.createObjectURL(file);
        try {
          const result = await uploadFile(file);
          if (result?.url) src = result.url;
        } catch {
          // R2 upload failed — use local blob URL
        }

        if (storageService.isOPFSSupported()) {
          await storageService.saveMediaFile({
            projectId: UPLOADS_PROJECT_ID,
            mediaItem: { id, file, name: file.name, type, url: src } as MediaFile,
          });
        }

        newAssets.push({ id, name: file.name, src, type, size: file.size } as UploadedAsset);
      }

      const updated = [...newAssets, ...uploads];
      setUploads(updated);
      localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      Log.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Delete upload ─────────────────────────────────────────────────────

  const handleDeleteUpload = async (id: string) => {
    try {
      if (storageService.isOPFSSupported()) {
        await storageService.deleteMediaFile({ projectId: UPLOADS_PROJECT_ID, id });
      }
      const updated = uploads.filter((u) => u.id !== id);
      setUploads(updated);
      localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      Log.error("Failed to delete upload:", err);
    }
  };

  // ── Add project asset to timeline ─────────────────────────────────────

  const addProjectImage = async (asset: ProjectAsset) => {
    if (!studio) return;
    try {
      const src = `${STUDIO_BASE}${asset.localPath}`;
      const clip = await Image.fromUrl(src);
      clip.name = asset.name;
      clip.display = { from: 0, to: 5 * 1e6 };
      clip.duration = 5 * 1e6;
      await clip.scaleToFit(canvasSize.width, canvasSize.height);
      clip.centerInScene(canvasSize.width, canvasSize.height);
      await studio.addClip(clip);
    } catch (err) {
      Log.error("Failed to add image asset:", err);
    }
  };

  const addProjectVideo = async (asset: ProjectAsset) => {
    if (!studio) return;
    try {
      const src = `${STUDIO_BASE}${asset.localPath}`;
      const placeholder = new Placeholder(
        src,
        { width: canvasSize.width, height: canvasSize.height, duration: 10 * 1e6 },
        "Video",
      );
      placeholder.name = asset.name;
      await placeholder.scaleToFit(canvasSize.width, canvasSize.height);
      placeholder.centerInScene(canvasSize.width, canvasSize.height);
      await studio.addClip(placeholder);

      Video.fromUrl(src)
        .then(async (videoClip) => {
          videoClip.name = asset.name;
          await studio.timeline.replaceClipsBySource(src, async (oldClip) => {
            const clone = await videoClip.clone();
            clone.id = oldClip.id;
            clone.name = oldClip.name;
            clone.left = oldClip.left;
            clone.top = oldClip.top;
            clone.width = oldClip.width;
            clone.height = oldClip.height;
            const realDuration = videoClip.meta.duration;
            const newTrim = { ...oldClip.trim };
            newTrim.to = Math.max(newTrim.to, realDuration);
            newTrim.from = Math.min(newTrim.from, newTrim.to);
            clone.playbackRate = oldClip.playbackRate;
            clone.display = { ...oldClip.display };
            clone.trim = newTrim;
            clone.duration = (newTrim.to - newTrim.from) / clone.playbackRate;
            clone.display.to = clone.display.from + clone.duration;
            clone.zIndex = oldClip.zIndex;
            return clone;
          });
        })
        .catch((err) => Log.error("Failed to load video in background:", err));
    } catch (err) {
      Log.error("Failed to add video asset:", err);
    }
  };

  // ── Add uploaded asset to timeline ────────────────────────────────────

  const addUpload = async (asset: UploadedAsset) => {
    if (!studio) return;
    try {
      if (asset.type === "image") {
        const clip = await Image.fromUrl(asset.src);
        clip.name = asset.name;
        clip.display = { from: 0, to: 5 * 1e6 };
        clip.duration = 5 * 1e6;
        await clip.scaleToFit(canvasSize.width, canvasSize.height);
        clip.centerInScene(canvasSize.width, canvasSize.height);
        await studio.addClip(clip);
      } else if (asset.type === "audio") {
        const clip = await Audio.fromUrl(asset.src);
        clip.name = asset.name;
        await studio.addClip(clip);
      } else {
        const clip = await Video.fromUrl(asset.src);
        clip.name = asset.name;
        await clip.scaleToFit(canvasSize.width, canvasSize.height);
        clip.centerInScene(canvasSize.width, canvasSize.height);
        await studio.addClip(clip);
      }
    } catch (err) {
      Log.error(`Failed to add uploaded ${asset.type}:`, err);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const isLoading = isLoadingAssets || !isLoadedUploads;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  const hasAnything = assets.length > 0 || uploads.length > 0;

  return (
    <div className="h-full flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*"
        multiple
        onChange={handleFileUpload}
      />

      {/* Upload button */}
      <div className="px-4 pt-4 pb-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={13} />
          {isUploading ? "Uploading…" : "Upload file"}
        </Button>
      </div>

      {!hasAnything ? (
        <div className="flex flex-col items-center justify-center flex-1 py-10 text-muted-foreground gap-2 px-4 text-center">
          <Package size={32} className="opacity-50" />
          <span className="text-sm">No assets yet.</span>
          <span className="text-xs opacity-70">
            Upload a file or add media from the Search page.
          </span>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-4 pt-2">
          {/* ── Project assets ── */}
          {assets.length > 0 && (
            <div className="mb-4">
              <SectionLabel>Project</SectionLabel>
              {assetsError && <p className="text-xs text-destructive mb-2 px-1">{assetsError}</p>}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="group relative aspect-square rounded-md overflow-hidden bg-secondary/50 cursor-pointer border border-transparent hover:border-primary/50 transition-all"
                    onClick={() =>
                      asset.type === "image" ? addProjectImage(asset) : addProjectVideo(asset)
                    }
                  >
                    {asset.type === "image" ? (
                      <img
                        src={`${STUDIO_BASE}${asset.localPath}`}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <VideoThumbnail src={`${STUDIO_BASE}${asset.localPath}`} />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[9px] text-white truncate font-medium">{asset.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Divider ── */}
          {assets.length > 0 && uploads.length > 0 && <div className="h-px bg-border/40 mb-4" />}

          {/* ── Uploaded assets ── */}
          {uploads.length > 0 && (
            <div className="mb-4">
              <SectionLabel>Uploaded</SectionLabel>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
                {uploads.map((asset) => (
                  <div
                    key={asset.id}
                    className="group flex flex-col gap-1 cursor-pointer"
                    onClick={() => addUpload(asset)}
                  >
                    <div className="relative aspect-square rounded-md overflow-hidden bg-secondary/50 border border-transparent group-hover:border-primary/50 transition-all flex items-center justify-center">
                      {asset.type === "image" ? (
                        <img
                          src={asset.src}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : asset.type === "audio" ? (
                        <div className="w-full h-full flex items-center justify-center bg-secondary/80">
                          <Music
                            size={24}
                            className="text-[#2dc28c]"
                            fill="#2dc28c"
                            fillOpacity={0.3}
                          />
                        </div>
                      ) : (
                        <VideoThumbnail src={asset.src} />
                      )}

                      <button
                        type="button"
                        className="absolute top-1 right-1 p-0.5 rounded bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUpload(asset.id);
                        }}
                      >
                        <Trash2 size={11} className="text-white" />
                      </button>
                    </div>
                    <p className="text-[9px] text-muted-foreground group-hover:text-foreground truncate transition-colors px-0.5">
                      {asset.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
