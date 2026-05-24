"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Audio, Log } from "openvideo";
import { useStudioStore } from "@/stores/studio-store";
import { SunoForm, type SunoFormState } from "./suno-form";
import { GeneratedTracks, type AudioInfo } from "./generated-tracks";
import { ScrollArea } from "@/components/ui/scroll-area";

const DEFAULT_FORM: SunoFormState = {
  lyrics: "",
  isInstrumental: false,
  styles: "",
  vocalGender: "female",
  lyricsMode: "manual",
  weirdness: 50,
  styleInfluence: 50,
  title: "",
  model: "chirp-v3-5",
};

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 60; // 3 minutes

export function SunoPanel() {
  const { studio } = useStudioStore();
  const [form, setForm] = useState<SunoFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [tracks, setTracks] = useState<AudioInfo[]>([]);
  const pollCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [savedPaths, setSavedPaths] = useState<Record<string, string>>({});
  const formRef = useRef<SunoFormState>(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const saveCompletedTracks = useCallback(async (completedTracks: AudioInfo[]) => {
    const currentForm = formRef.current;
    const keywords = currentForm.styles
      ? currentForm.styles
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const prompt = currentForm.lyricsMode === "auto" ? "" : currentForm.lyrics;

    const results = await Promise.allSettled(
      completedTracks.map(async (track) => {
        if (!track.audio_url) return;

        const res = await fetch("/api/suno/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioUrl: track.audio_url,
            title: track.title,
            prompt,
            keywords,
            duration: track.duration ? parseFloat(track.duration) : undefined,
          }),
        });

        if (!res.ok) throw new Error(`Save failed: HTTP ${res.status}`);
        const { localPath, filename } = await res.json();

        // Write metadata to localStorage
        const meta = {
          id: crypto.randomUUID(),
          filename,
          localPath,
          type: "audio" as const,
          aiGenerated: true as const,
          clientName: "suno",
          keywords,
          prompt,
          title: track.title,
          duration: track.duration ? parseFloat(track.duration) : undefined,
          createdAt: new Date().toISOString(),
        };

        try {
          const existing = JSON.parse(localStorage.getItem("devcraft_generated_assets") || "[]");
          localStorage.setItem("devcraft_generated_assets", JSON.stringify([...existing, meta]));
        } catch {
          // localStorage full or unavailable — skip silently
        }

        return { trackId: track.id, localPath };
      }),
    );

    const newPaths: Record<string, string> = {};
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        newPaths[result.value.trackId] = result.value.localPath;
      }
    });

    if (Object.keys(newPaths).length > 0) {
      setSavedPaths((prev) => ({ ...prev, ...newPaths }));
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPolling(false);
    pollCountRef.current = 0;
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback(
    (ids: string[]) => {
      setPolling(true);
      pollCountRef.current = 0;

      intervalRef.current = setInterval(async () => {
        pollCountRef.current += 1;

        if (pollCountRef.current > MAX_POLLS) {
          stopPolling();
          toast.error("Music generation timed out after 3 minutes");
          return;
        }

        try {
          const res = await fetch(`/api/suno/get?ids=${ids.join(",")}`);
          if (!res.ok) return;
          const data: AudioInfo[] = await res.json();
          const allDone = data.every((t) => t.status === "complete" || t.status === "error");
          if (allDone) {
            stopPolling();
            setTracks((prev) => [...data, ...prev]);
            const failed = data.filter((t) => t.status === "error").length;
            const ok = data.length - failed;
            if (ok > 0) toast.success(`${ok} track${ok > 1 ? "s" : ""} ready`);
            if (failed > 0) toast.error(`${failed} track${failed > 1 ? "s" : ""} failed`);

            // Save completed tracks to disk + localStorage
            const completedTracks = data.filter((t) => t.status === "complete" && t.audio_url);
            if (completedTracks.length > 0) {
              saveCompletedTracks(completedTracks).catch((err) =>
                console.error("Failed to save audio tracks:", err),
              );
            }
          }
        } catch {
          // network hiccup — keep polling
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling, saveCompletedTracks],
  );

  const handleCreate = async () => {
    setLoading(true);
    try {
      // Build tags: include vocal gender as a style descriptor
      const tags = [form.styles, `${form.vocalGender} voice`].filter(Boolean).join(", ");

      // In Auto lyrics mode, send empty prompt so Suno generates lyrics
      const prompt = form.lyricsMode === "auto" ? "" : form.lyrics;

      const body = {
        prompt,
        tags,
        title: form.title,
        make_instrumental: form.isInstrumental,
        model: form.model,
        wait_audio: false,
      };

      const res = await fetch("/api/suno/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data: AudioInfo[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No tracks returned from Suno");
      }

      const ids = data.map((t) => t.id);
      startPolling(ids);
    } catch (err: any) {
      toast.error(`Generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTimeline = async (track: AudioInfo) => {
    if (!studio || !track.audio_url) return;
    try {
      const clip = await Audio.fromUrl(track.audio_url);
      clip.name = track.title || "Suno track";
      await studio.addClip(clip);
      toast.success(`"${clip.name}" added to timeline`);
    } catch (err) {
      Log.error("Failed to add Suno track:", err);
      toast.error("Failed to add track to timeline");
    }
  };

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      {/* Panel header */}
      <div className="flex-none px-3 py-2.5 border-b border-border">
        <span className="text-xs font-semibold text-white">Suno Music</span>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col">
          <SunoForm
            form={form}
            onChange={setForm}
            onSubmit={handleCreate}
            loading={loading || polling}
          />
          <GeneratedTracks
            tracks={tracks}
            polling={polling}
            onAddToTimeline={handleAddToTimeline}
            savedPaths={savedPaths}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
