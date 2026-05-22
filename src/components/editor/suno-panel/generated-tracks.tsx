"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlus,
  IconLoader2,
  IconAlertCircle,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface AudioInfo {
  id: string;
  title?: string;
  image_url?: string;
  audio_url?: string;
  duration?: string;
  status: string;
  error_message?: string;
}

interface GeneratedTracksProps {
  tracks: AudioInfo[];
  polling: boolean;
  onAddToTimeline: (track: AudioInfo) => void;
}

function formatDuration(seconds?: string): string {
  if (!seconds) return "--:--";
  const s = parseFloat(seconds);
  if (isNaN(s)) return "--:--";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function TrackItem({
  track,
  playingId,
  setPlayingId,
  onAdd,
}: {
  track: AudioInfo;
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
  onAdd: (track: AudioInfo) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlaying = playingId === track.id;
  const hasError = track.status === "error";

  const togglePlay = () => {
    if (!track.audio_url) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      setPlayingId(track.id);
      audioRef.current?.play();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border transition-colors",
        hasError
          ? "border-red-500/30 bg-red-500/5"
          : "border-border bg-secondary/20 hover:bg-secondary/40",
      )}
    >
      {track.audio_url && (
        <audio
          ref={audioRef}
          src={track.audio_url}
          onEnded={() => setPlayingId(null)}
          className="hidden"
        />
      )}

      {/* Cover art */}
      {track.image_url ? (
        <img src={track.image_url} alt="" className="w-8 h-8 rounded object-cover flex-none" />
      ) : (
        <div className="w-8 h-8 rounded bg-violet-600/20 flex-none" />
      )}

      {/* Title + duration */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{track.title || "Untitled track"}</p>
        {hasError ? (
          <p className="text-[10px] text-red-400 truncate" title={track.error_message}>
            {track.error_message || "Generation failed"}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">{formatDuration(track.duration)}</p>
        )}
      </div>

      {/* Actions */}
      {!hasError && (
        <div className="flex items-center gap-1 flex-none">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={togglePlay}
            disabled={!track.audio_url}
          >
            {isPlaying ? (
              <IconPlayerPause className="size-3.5" />
            ) : (
              <IconPlayerPlay className="size-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-violet-400 hover:text-violet-300"
            onClick={() => onAdd(track)}
            disabled={!track.audio_url}
            title="Add to timeline"
          >
            <IconPlus className="size-3.5" />
          </Button>
        </div>
      )}

      {hasError && <IconAlertCircle className="size-4 text-red-400 flex-none" />}
    </div>
  );
}

export function GeneratedTracks({ tracks, polling, onAddToTimeline }: GeneratedTracksProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  if (!polling && tracks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 px-3 pb-3">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Generated
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {polling && tracks.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
          <IconLoader2 className="size-4 animate-spin text-violet-400" />
          Generating your tracks...
        </div>
      )}

      {tracks.map((track) => (
        <TrackItem
          key={track.id}
          track={track}
          playingId={playingId}
          setPlayingId={setPlayingId}
          onAdd={onAddToTimeline}
        />
      ))}
    </div>
  );
}
