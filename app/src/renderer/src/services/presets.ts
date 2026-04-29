import { storage } from "./storage";

const keyFor = (scope: string): string => `presets_${scope}`;

export interface NamedPreset<T> {
  id: string;
  name: string;
  value: T;
}

export const loadPresets = async <T>(scope: string): Promise<NamedPreset<T>[]> => {
  const saved = await storage.get<NamedPreset<T>[]>(keyFor(scope));
  return saved?.data ?? [];
};

export const savePresets = async <T>(scope: string, presets: NamedPreset<T>[]): Promise<void> => {
  await storage.set(keyFor(scope), presets);
};

export const upsertPreset = async <T>(scope: string, preset: NamedPreset<T>): Promise<NamedPreset<T>[]> => {
  const current = await loadPresets<T>(scope);
  const next = [...current.filter((item) => item.id !== preset.id), preset];
  await savePresets(scope, next);
  return next;
};
