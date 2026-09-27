import { create } from 'zustand';
import { DEFAULT_PRIMARY, PRIMARY_PRESETS, type PrimaryPreset } from './presets';

interface BrandingState {
  primaryColor: PrimaryPreset;
  setPrimaryColor: (color: string | null | undefined) => void;
}

/** Color primario de la cuenta (lo elige la iglesia entre los presets). */
export const useBranding = create<BrandingState>((set) => ({
  primaryColor: DEFAULT_PRIMARY,
  setPrimaryColor: (color) =>
    set({
      primaryColor: PRIMARY_PRESETS.includes(color as PrimaryPreset)
        ? (color as PrimaryPreset)
        : DEFAULT_PRIMARY,
    }),
}));
