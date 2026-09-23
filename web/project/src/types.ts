export interface RawOption {
  label?: string;
  icon?: string;
  iconColor?: string;
  holdTime?: number;
  hideButton?: boolean;
  hide?: boolean;
  color?: number[];
  key?: string;
  keybind?: string;
  menu?: string;
  menuIcon?: string;
}

export interface InteractOption {
  label: string;
  icon: string;
  iconColor?: string;
  holdTime: number;
  hideButton: boolean;
  color?: [number, number, number, number];
  key?: string;
  targetType: string;
  targetId: number;
}

export interface SetOptionsPayload {
  options?: Record<string, RawOption[] | undefined>;
  resetIndex?: boolean;
  title?: string | null;
  icon?: string | null;
}

export type PromptMode = "hidden" | "focus" | "single" | "menu";
