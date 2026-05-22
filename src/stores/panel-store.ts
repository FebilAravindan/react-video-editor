import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PanelState {
  toolsPanel: number;
  copilotPanel: number;
  previewPanel: number;
  propertiesPanel: number;
  mainContent: number;
  timeline: number;
  isCopilotVisible: boolean;
  sunoPanel: number;
  isSunoVisible: boolean;

  setToolsPanel: (size: number) => void;
  setCopilotPanel: (size: number) => void;
  setPreviewPanel: (size: number) => void;
  setPropertiesPanel: (size: number) => void;
  setMainContent: (size: number) => void;
  setTimeline: (size: number) => void;
  toggleCopilot: () => void;
  setSunoPanel: (size: number) => void;
  toggleSuno: () => void;
}

export const usePanelStore = create<PanelState>()(
  persist(
    (set) => ({
      toolsPanel: 30,
      copilotPanel: 30,
      previewPanel: 50,
      propertiesPanel: 25,
      mainContent: 70,
      timeline: 30,
      isCopilotVisible: true,
      sunoPanel: 20,
      isSunoVisible: false,

      setToolsPanel: (size) => set({ toolsPanel: size }),
      setPreviewPanel: (size) => set({ previewPanel: size }),
      setPropertiesPanel: (size) => set({ propertiesPanel: size }),
      setMainContent: (size) => set({ mainContent: size }),
      setTimeline: (size) => set({ timeline: size }),
      setCopilotPanel: (size) => set({ copilotPanel: size }),
      toggleCopilot: () => set((state) => ({ isCopilotVisible: !state.isCopilotVisible })),
      setSunoPanel: (size) => set({ sunoPanel: size }),
      toggleSuno: () => set((state) => ({ isSunoVisible: !state.isSunoVisible })),
    }),
    {
      name: "panel-sizes",
      version: 3,
      migrate: (state: any) => ({
        ...state,
        mainContent: state.mainContent ?? 70,
        timeline: state.timeline ?? 30,
        sunoPanel: 20,
        isSunoVisible: false,
      }),
    },
  ),
);
