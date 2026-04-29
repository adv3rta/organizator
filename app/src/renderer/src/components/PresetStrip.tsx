import { useEffect, useMemo, useState } from "react";
import { loadPresets, type NamedPreset, upsertPreset } from "../services/presets";
import { Button } from "./Button";

interface PresetStripProps<T> {
  scope: string;
  value: T;
  onApply: (value: T) => void;
  defaults?: Array<NamedPreset<T>>;
}

export const PresetStrip = <T,>({ scope, value, onApply, defaults = [] }: PresetStripProps<T>) => {
  const [presets, setPresets] = useState<Array<NamedPreset<T>>>(defaults);
  const mergedPresets = useMemo(() => {
    const map = new Map<string, NamedPreset<T>>();
    [...defaults, ...presets].forEach((preset) => map.set(preset.id, preset));
    return [...map.values()];
  }, [defaults, presets]);

  useEffect(() => {
    void (async () => {
      const saved = await loadPresets<T>(scope);
      if (saved.length) {
        setPresets(saved);
      }
    })();
  }, [scope]);

  const savePreset = async (): Promise<void> => {
    const name = window.prompt("Preset name");
    if (!name) return;
    const preset = {
      id: `${scope}_${name.trim().toLowerCase().replace(/\s+/g, "_")}`,
      name: name.trim(),
      value
    };
    const next = await upsertPreset(scope, preset);
    setPresets(next);
  };

  return (
    <div className="preset-strip">
      <div className="preset-strip-list">
        {mergedPresets.map((preset) => (
          <Button key={preset.id} className="preset-pill" onClick={() => onApply(preset.value)}>
            {preset.name}
          </Button>
        ))}
      </div>
      <Button className="preset-pill" onClick={() => void savePreset()}>
        Save preset
      </Button>
    </div>
  );
};
