"use client";

import * as React from "react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clipboard,
  Copy,
  CopyPlus,
  LockKeyhole,
  LockKeyholeOpen,
  MoreHorizontalIcon,
  Trash2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/stores/studio-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { toast } from "sonner";
import { clipToJSON, jsonToClip, type ClipJSON } from "openvideo";
import { generateUUID } from "@/utils/id";

// Module-level clipboard — persists across renders
export let clipboardClipJSON: ClipJSON | null = null;

export function useClipActions(clipOverride?: any) {
  const { studio, selectedClips } = useStudioStore();
  const { tracks, clips } = useTimelineStore();
  const [hasClipboard, setHasClipboard] = React.useState(clipboardClipJSON !== null);
  const [isLocked, setIsLocked] = React.useState(false);

  const selectedClip = clipOverride || (selectedClips[0] as any);

  // Sync lock state
  React.useEffect(() => {
    const clip = selectedClips[0] as any;
    setIsLocked(clip?.locked ?? false);
    setHasClipboard(clipboardClipJSON !== null);
  }, [selectedClips]);

  React.useEffect(() => {
    if (!studio) return;
    const handleLockChanged = ({ clip, locked }: { clip: any; locked: boolean }) => {
      const selected = selectedClips[0] as any;
      if (selected && selected.id === clip.id) {
        setIsLocked(locked);
      }
    };
    studio.on("clip:lock-changed", handleLockChanged);
    return () => {
      studio.off("clip:lock-changed", handleLockChanged);
    };
  }, [studio, selectedClips]);

  const handleCopy = useCallback(() => {
    if (!selectedClip) return;
    clipboardClipJSON = clipToJSON(selectedClip, false);
    setHasClipboard(true);
  }, [selectedClip]);

  const handlePaste = useCallback(async () => {
    if (!studio || !clipboardClipJSON) return;

    // Create a NEW clip from the JSON snapshot
    const newClip = await jsonToClip(clipboardClipJSON);
    // Assign a new ID to avoid collisions
    newClip.id = generateUUID();

    // Add to studio
    await studio.addClip(newClip);
  }, [studio]);

  const handleDuplicate = useCallback(async () => {
    if (!studio) return;
    await studio.duplicateSelected();
  }, [studio]);

  const handleToggleLock = useCallback(async () => {
    if (!studio || !selectedClip) return;
    await studio.lockClip(selectedClip.id, !selectedClip.locked);
  }, [studio, selectedClip]);

  const handleDelete = useCallback(async () => {
    if (!studio) return;
    await studio.deleteSelected();
  }, [studio]);

  const handleLoop = useCallback(
    async (count: number) => {
      if (!studio || !selectedClip || count < 1) return;

      // Find the track that contains the selected clip
      const track = tracks.find((t) => t.clipIds.includes(selectedClip.id));
      if (!track) return;

      // Find the rightmost end time (microseconds) of any clip on this track
      const trackEnd = track.clipIds.reduce((max, id) => {
        const clip = clips[id];
        return clip ? Math.max(max, clip.display.to) : max;
      }, 0);

      // Serialize the original clip once; reuse JSON for every copy
      const clipJSON = clipToJSON(selectedClip, false);
      const clipDuration: number = selectedClip.duration; // microseconds

      let cursor = trackEnd;

      for (let i = 0; i < count; i++) {
        const newClip = await jsonToClip(clipJSON);
        newClip.id = generateUUID();
        (newClip as any).display = {
          from: cursor,
          to: cursor + clipDuration,
        };
        await studio.addClip(newClip);
        cursor += clipDuration;
      }

      toast.success(`Looped ${count} ${count === 1 ? "time" : "times"}`);
    },
    [studio, selectedClip, tracks, clips],
  );

  return {
    selectedClip,
    isLocked,
    hasClipboard,
    handleCopy,
    handlePaste,
    handleDuplicate,
    handleToggleLock,
    handleDelete,
    handleLoop,
  };
}

export function OptionsFloatingMenu() {
  const {
    selectedClip,
    isLocked,
    hasClipboard,
    handleCopy,
    handlePaste,
    handleDuplicate,
    handleToggleLock,
    handleDelete,
  } = useClipActions();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-9 h-9 rounded-full transition-all hover:bg-accent/50 active:scale-90",
              )}
            >
              <MoreHorizontalIcon className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>More</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent className="w-44">
        <DropdownMenuGroup>
          {!isLocked && (
            <>
              <DropdownMenuItem onClick={handleCopy} disabled={!selectedClip}>
                <Copy />
                Copy
                <DropdownMenuShortcut>⌘ C</DropdownMenuShortcut>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handlePaste} disabled={!hasClipboard}>
                <Clipboard />
                Paste
                <DropdownMenuShortcut>⌘ V</DropdownMenuShortcut>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleDuplicate} disabled={!selectedClip}>
                <CopyPlus />
                Duplicate
                <DropdownMenuShortcut>⌘ D</DropdownMenuShortcut>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuItem onClick={handleToggleLock} disabled={!selectedClip}>
            {isLocked ? <LockKeyholeOpen /> : <LockKeyhole />}
            {isLocked ? "Unlock" : "Lock"}
            <DropdownMenuShortcut>⌘ L</DropdownMenuShortcut>
          </DropdownMenuItem>

          {!isLocked && (
            <DropdownMenuItem onClick={handleDelete} disabled={!selectedClip}>
              <Trash2 />
              Delete
              <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
