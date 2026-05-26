import { useState } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import { useStudioStore } from "@/stores/studio-store";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Pause,
  Play,
  SkipBack,
  Magnet,
  ZoomOut,
  ZoomIn,
  Copy,
  Trash2,
  ArrowLeftToLine,
  ArrowRightToLine,
  Scissors,
  Repeat,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_FPS } from "@/stores/project-store";
import { formatTimeCode } from "@/lib/time";
import { EditableTimecode } from "@/components/ui/editable-timecode";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from "@tabler/icons-react";

export function TimelineToolbar({
  zoomLevel,
  setZoomLevel,
  onDelete,
  onDuplicate,
  onSplit,
  onLoop,
}: {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSplit?: () => void;
  onLoop?: (count: number) => void;
}) {
  const { currentTime, duration, isPlaying, toggle, seek } = usePlaybackStore();
  const { selectedClips } = useStudioStore();

  const isSelected = selectedClips.length > 0;
  const isLocked = selectedClips.some((clip) => clip.locked);

  const [loopOpen, setLoopOpen] = useState(false);
  const [loopCount, setLoopCount] = useState("4");
  const parsedCount = parseInt(loopCount, 10);

  const handleZoomIn = () => {
    setZoomLevel(Math.min(3.5, zoomLevel + 0.15));
  };

  const handleZoomOut = () => {
    setZoomLevel(Math.max(0.15, zoomLevel - 0.15));
  };

  const handleZoomSliderChange = (values: number[]) => {
    setZoomLevel(values[0]);
  };

  return (
    <div className="flex items-center justify-between px-2 py-1 border-b h-10">
      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSplit}
                disabled={!isSelected || isLocked}
              >
                <Scissors className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split element (Ctrl+S)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDuplicate}
                disabled={!isSelected || isLocked}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate element (Ctrl+D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                disabled={!isSelected || isLocked}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete element (Delete)</TooltipContent>
          </Tooltip>
          <Popover
            open={loopOpen}
            onOpenChange={(open) => {
              if (!open) setLoopCount("4");
              setLoopOpen(open);
            }}
          >
            <Tooltip>
              <PopoverTrigger asChild>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Loop clip"
                    disabled={!isSelected || isLocked}
                  >
                    <Repeat className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
              </PopoverTrigger>
              <TooltipContent>
                Loop clip (repeat {Number.isNaN(parsedCount) ? "…" : parsedCount} times)
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-48 p-3" side="bottom" align="start">
              <p className="text-xs text-muted-foreground mb-2">Repeat clip how many times?</p>
              <Input
                autoFocus
                type="number"
                min={1}
                max={20}
                value={loopCount}
                onChange={(e) => setLoopCount(e.target.value)}
                className="mb-2 h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (parsedCount >= 1 && parsedCount <= 20) {
                      onLoop?.(parsedCount);
                      setLoopOpen(false);
                      setLoopCount("4");
                    }
                  }
                }}
              />
              <Button
                size="sm"
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                disabled={!loopCount || parsedCount < 1 || parsedCount > 20 || isNaN(parsedCount)}
                onClick={() => {
                  if (parsedCount >= 1 && parsedCount <= 20) {
                    onLoop?.(parsedCount);
                    setLoopOpen(false);
                    setLoopCount("4");
                  }
                }}
              >
                Loop
              </Button>
            </PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Magnet className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Auto snapping</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-0">
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="size-7" variant="ghost" size="icon" onClick={() => seek(0)}>
                <IconPlayerSkipBack className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Return to Start (Home / Enter)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggle}>
                {isPlaying ? (
                  <IconPlayerPauseFilled className="size-5" />
                ) : (
                  <IconPlayerPlayFilled className="size-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPlaying ? "Pause (Space)" : "Play (Space)"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="size-7" variant="ghost" size="icon" onClick={() => seek(0)}>
                <IconPlayerSkipForward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Return to Start (Home / Enter)</TooltipContent>
          </Tooltip>
          {/* Time Display */}
          <div className="flex flex-row items-center justify-center px-2">
            <EditableTimecode
              time={currentTime}
              duration={duration}
              format="MM:SS"
              fps={DEFAULT_FPS}
              onTimeChange={seek}
              className="text-center"
            />
            <div className="text-xs text-muted-foreground px-2">/</div>
            <div className="text-xs text-muted-foreground text-center">
              {formatTimeCode(duration, "MM:SS")}
            </div>
          </div>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Slider
            className="w-24"
            value={[zoomLevel]}
            onValueChange={handleZoomSliderChange}
            min={0.15}
            max={3.5}
            step={0.15}
          />
          <Button variant="ghost" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
