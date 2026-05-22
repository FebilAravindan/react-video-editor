"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStudioStore } from "@/stores/studio-store";
import { useProjectStore } from "@/stores/project-store";
import { Image, Video, Placeholder, Log } from "openvideo";
import { Loader2, Package, Play } from "lucide-react";

const STUDIO_BASE = "http://localhost:3000";

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

export default function PanelProjectAssets() {
  const params = useParams();
  const projectId = params?.projectId as string | undefined;
  const { studio } = useStudioStore();
  const { canvasSize } = useProjectStore();
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchAssets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${STUDIO_BASE}/api/projects/${projectId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAssets(data.project?.assets ?? []);
      } catch (err) {
        setError("Could not load project assets.");
        Log.error("PanelProjectAssets fetch failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();
  }, [projectId]);

  const addImage = async (asset: ProjectAsset) => {
    if (!studio) return;
    try {
      const src = `${STUDIO_BASE}${asset.localPath}`;
      const imageClip = await Image.fromUrl(src);
      imageClip.name = asset.name;
      imageClip.display = { from: 0, to: 5 * 1e6 };
      imageClip.duration = 5 * 1e6;
      await imageClip.scaleToFit(canvasSize.width, canvasSize.height);
      imageClip.centerInScene(canvasSize.width, canvasSize.height);
      await studio.addClip(imageClip);
    } catch (err) {
      Log.error("Failed to add image asset:", err);
    }
  };

  const addVideo = async (asset: ProjectAsset) => {
    if (!studio) return;
    try {
      const src = `${STUDIO_BASE}${asset.localPath}`;
      const clipName = asset.name;

      const placeholder = new Placeholder(
        src,
        {
          width: canvasSize.width,
          height: canvasSize.height,
          duration: 10 * 1e6,
        },
        "Video",
      );
      placeholder.name = clipName;
      await placeholder.scaleToFit(canvasSize.width, canvasSize.height);
      placeholder.centerInScene(canvasSize.width, canvasSize.height);
      await studio.addClip(placeholder);

      Video.fromUrl(src)
        .then(async (videoClip) => {
          videoClip.name = clipName;
          await studio.timeline.replaceClipsBySource(src, async (oldClip) => {
            const clone = await videoClip.clone();
            clone.name = oldClip.name;
            clone.left = oldClip.left;
            clone.top = oldClip.top;
            clone.width = oldClip.width;
            clone.height = oldClip.height;
            const realDuration = videoClip.meta.duration;
            const newTrim = { ...oldClip.trim };
            newTrim.to = Math.max(newTrim.to, realDuration);
            newTrim.from = Math.min(newTrim.from, newTrim.to);
            clone.display = { ...oldClip.display };
            clone.trim = newTrim;
            clone.duration = (newTrim.to - newTrim.from) / clone.playbackRate;
            clone.display.to = clone.display.from + clone.duration;
            clone.zIndex = oldClip.zIndex;
            return clone;
          });
        })
        .catch((err) => {
          Log.error("Failed to load video asset in background:", err);
        });
    } catch (err) {
      Log.error("Failed to add video asset:", err);
    }
  };

  const handleAdd = (asset: ProjectAsset) => {
    if (asset.type === "image") addImage(asset);
    else addVideo(asset);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground gap-2 px-4 text-center">
        <Package size={32} className="opacity-50" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground gap-2 px-4 text-center">
        <Package size={32} className="opacity-50" />
        <span className="text-sm">No assets in this project yet.</span>
        <span className="text-xs opacity-70">Add media from the Search page.</span>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full px-4 pt-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 pb-4">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="group relative aspect-square rounded-md overflow-hidden bg-secondary/50 cursor-pointer border border-transparent hover:border-primary/50 transition-all"
            onClick={() => handleAdd(asset)}
          >
            <img
              src={`${STUDIO_BASE}${asset.localPath}`}
              alt={asset.name}
              className="w-full h-full object-cover"
            />
            {asset.type === "video" && (
              <div className="absolute bottom-1 left-1 bg-black/60 rounded p-0.5">
                <Play size={10} className="text-white fill-white" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] text-white truncate font-medium">{asset.name}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
