"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { IconChevronDown, IconChevronRight, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SunoFormState {
  lyrics: string;
  isInstrumental: boolean;
  styles: string;
  vocalGender: "male" | "female";
  lyricsMode: "manual" | "auto";
  weirdness: number;
  styleInfluence: number;
  title: string;
  model: string;
}

const MODELS = [
  { id: "chirp-fenix", label: "Fenix (Latest)" },
  { id: "chirp-custom:bd26f180-8c42-4740-85ad-be90bef51706", label: "Custom" },
  { id: "chirp-v4", label: "v4" },
  { id: "chirp-v3-5", label: "v4.5-all (Free)" },
];

const STYLE_SUGGESTIONS = [
  "cinematic",
  "epic",
  "upbeat",
  "lo-fi",
  "jazz",
  "ambient",
  "drill-hop",
  "electronic",
  "acoustic",
];

interface SunoFormProps {
  form: SunoFormState;
  onChange: (form: SunoFormState) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function SunoForm({ form, onChange, onSubmit, loading }: SunoFormProps) {
  const [lyricsOpen, setLyricsOpen] = useState(true);
  const [stylesOpen, setStylesOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  const set = (patch: Partial<SunoFormState>) => onChange({ ...form, ...patch });

  const addStyleChip = (chip: string) => {
    const existing = form.styles.trim();
    set({ styles: existing ? `${existing}, ${chip}` : chip });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        {/* Model selector row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Model</span>
          <Select value={form.model} onValueChange={(v) => set({ model: v })}>
            <SelectTrigger className="h-7 w-36 text-xs bg-secondary/40 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lyrics */}
        <div className="rounded-md border border-border bg-secondary/20">
          <button
            className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-medium"
            onClick={() => setLyricsOpen((o) => !o)}
          >
            {lyricsOpen ? (
              <IconChevronDown className="size-3.5" />
            ) : (
              <IconChevronRight className="size-3.5" />
            )}
            Lyrics
          </button>
          {lyricsOpen && (
            <div className="px-3 pb-3 flex flex-col gap-2">
              <Textarea
                placeholder="Write some lyrics or leave blank for instrumental"
                className="min-h-[80px] text-xs bg-transparent border-0 focus-visible:ring-0 resize-none p-0 shadow-none"
                value={form.lyrics}
                onChange={(e) => set({ lyrics: e.target.value })}
                disabled={form.isInstrumental}
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isInstrumental}
                  onChange={(e) => set({ isInstrumental: e.target.checked, lyrics: "" })}
                  className="accent-violet-500"
                />
                Instrumental (no vocals)
              </label>
            </div>
          )}
        </div>

        {/* Styles */}
        <div className="rounded-md border border-border bg-secondary/20">
          <button
            className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-medium"
            onClick={() => setStylesOpen((o) => !o)}
          >
            {stylesOpen ? (
              <IconChevronDown className="size-3.5" />
            ) : (
              <IconChevronRight className="size-3.5" />
            )}
            Styles
          </button>
          {stylesOpen && (
            <div className="px-3 pb-3 flex flex-col gap-2">
              <Textarea
                placeholder="arpeggiator, drill-hop, cinematic..."
                className="min-h-[56px] text-xs bg-transparent border-0 focus-visible:ring-0 resize-none p-0 shadow-none"
                value={form.styles}
                onChange={(e) => set({ styles: e.target.value })}
              />
              <div className="flex flex-wrap gap-1.5">
                {STYLE_SUGGESTIONS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => addStyleChip(chip)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* More Options */}
        <div className="rounded-md border border-border bg-secondary/20">
          <button
            className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-medium"
            onClick={() => setMoreOpen((o) => !o)}
          >
            {moreOpen ? (
              <IconChevronDown className="size-3.5" />
            ) : (
              <IconChevronRight className="size-3.5" />
            )}
            More Options
          </button>
          {moreOpen && (
            <div className="px-3 pb-3 flex flex-col gap-3">
              {/* Vocal Gender */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Vocal Gender</span>
                <div className="flex gap-1">
                  {(["male", "female"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => set({ vocalGender: g })}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-sm border capitalize transition-colors",
                        form.vocalGender === g
                          ? "bg-violet-600 border-violet-600 text-white"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lyrics Mode */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Lyrics Mode</span>
                <div className="flex gap-1">
                  {(["manual", "auto"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => set({ lyricsMode: m })}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-sm border capitalize transition-colors",
                        form.lyricsMode === m
                          ? "bg-violet-600 border-violet-600 text-white"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weirdness (UI only) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Weirdness</span>
                  <span className="text-xs text-muted-foreground">{form.weirdness}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[form.weirdness]}
                  onValueChange={([v]) => set({ weirdness: v })}
                  className="w-full"
                />
                <span className="text-[10px] text-muted-foreground/50">
                  Visual only — not sent to API
                </span>
              </div>

              {/* Style Influence (UI only) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Style Influence</span>
                  <span className="text-xs text-muted-foreground">{form.styleInfluence}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[form.styleInfluence]}
                  onValueChange={([v]) => set({ styleInfluence: v })}
                  className="w-full"
                />
                <span className="text-[10px] text-muted-foreground/50">
                  Visual only — not sent to API
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Song Title */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Song Title (Optional)</span>
          <input
            type="text"
            placeholder="My awesome track"
            className="bg-secondary/20 border border-border rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
          />
        </div>
      </div>

      {/* Create button — pinned to bottom */}
      <div className="flex-none px-3 py-3 border-t border-border">
        <Button className="w-full rounded-full gap-2" onClick={onSubmit} disabled={loading}>
          {loading ? (
            <>
              <IconLoader2 className="size-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Create"
          )}
        </Button>
      </div>
    </div>
  );
}
