import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { WatermarkPosition } from "@adverta/shared";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DragValue } from "../components/DragValue";
import { Input } from "../components/Input";
import { PresetStrip } from "../components/PresetStrip";
import type { ToolProps } from "./types";

const positions: WatermarkPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
  "custom"
];

const watermarkPresets = [
  {
    id: "wm_instagram",
    name: "Instagram watermark",
    value: { kind: "text" as const, text: "@adverta", opacity: 0.72, scale: 0.24, position: "bottom-right" as WatermarkPosition, margin: 24 }
  },
  {
    id: "wm_client",
    name: "Client export",
    value: { kind: "text" as const, text: "Client proof", opacity: 0.58, scale: 0.32, position: "center" as WatermarkPosition, margin: 16 }
  }
];

const toFileUrl = (filePath: string): string => `file:///${filePath.replace(/\\/g, "/")}`;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const positionStyle = (
  position: WatermarkPosition,
  margin: number,
  customX: number,
  customY: number
): CSSProperties => {
  if (position === "custom") {
    return {
      left: `${customX * 100}%`,
      top: `${customY * 100}%`,
      transform: "translate(-50%, -50%)"
    };
  }

  const offset = `${margin}px`;
  if (position === "top-left") return { left: offset, top: offset };
  if (position === "top-center") return { left: "50%", top: offset, transform: "translateX(-50%)" };
  if (position === "top-right") return { right: offset, top: offset };
  if (position === "center-left") return { left: offset, top: "50%", transform: "translateY(-50%)" };
  if (position === "center") return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  if (position === "center-right") return { right: offset, top: "50%", transform: "translateY(-50%)" };
  if (position === "bottom-left") return { left: offset, bottom: offset };
  if (position === "bottom-center") return { left: "50%", bottom: offset, transform: "translateX(-50%)" };
  return { right: offset, bottom: offset };
};

export const WatermarkTool = ({ incomingFiles, consumeIncomingFiles, appSettings }: ToolProps) => {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [outputDirectory, setOutputDirectory] = useState(appSettings.defaultExportFolder ?? "");
  const [kind, setKind] = useState<"text" | "image">("text");
  const [text, setText] = useState("Adverta Tools");
  const [imagePath, setImagePath] = useState("");
  const [opacity, setOpacity] = useState(0.8);
  const [scale, setScale] = useState(0.24);
  const [position, setPosition] = useState<WatermarkPosition>("bottom-right");
  const [margin, setMargin] = useState(24);
  const [message, setMessage] = useState("");
  const [customPoint, setCustomPoint] = useState({ x: 0.8, y: 0.82 });

  useEffect(() => {
    if (appSettings.defaultExportFolder && !outputDirectory) {
      setOutputDirectory(appSettings.defaultExportFolder);
    }
  }, [appSettings.defaultExportFolder, outputDirectory]);

  useEffect(() => {
    if (incomingFiles?.length) {
      setSources(incomingFiles);
      consumeIncomingFiles();
    }
  }, [consumeIncomingFiles, incomingFiles]);

  const previewSource = sources[0] ?? "";
  const previewStyle = useMemo(
    () => positionStyle(position, margin, customPoint.x, customPoint.y),
    [customPoint.x, customPoint.y, margin, position]
  );

  const pickSources = async (): Promise<void> => {
    const response = await window.adverta.selectFiles({
      title: "Choose images",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }]
    });
    if (!response.canceled) setSources(response.filePaths);
  };

  const pickOverlay = async (): Promise<void> => {
    const response = await window.adverta.selectFiles({
      title: "Choose PNG watermark",
      properties: ["openFile"],
      filters: [{ name: "PNG", extensions: ["png"] }]
    });
    if (!response.canceled && response.filePaths[0]) setImagePath(response.filePaths[0]);
  };

  const pickDirectory = async (): Promise<void> => {
    const response = await window.adverta.selectFolder({
      title: "Choose output folder",
      properties: ["openDirectory"]
    });
    if (!response.canceled && response.filePaths[0]) setOutputDirectory(response.filePaths[0]);
  };

  const run = async (): Promise<void> => {
    const response = await window.adverta.applyWatermark({
      sourcePaths: sources,
      outputDirectory,
      kind,
      text,
      imagePath,
      opacity,
      scale,
      position,
      margin,
      customX: customPoint.x,
      customY: customPoint.y
    });
    setMessage(response.ok ? `Processed ${response.data?.files.length ?? 0} files.` : response.error?.message ?? "Failed.");
    if (response.ok && appSettings.autoOpenExportFolder) {
      await window.adverta.openExternal(`file:///${outputDirectory.replace(/\\/g, "/")}`);
    }
  };

  const overlayWidth = `${Math.max(scale * 100, 10)}%`;

  return (
    <div className="tool-screen">
      <Card className="tool-panel" title="Controls" subtitle="Drag the watermark directly on the preview and resize it with the handle.">
        <PresetStrip
          scope="watermark"
          value={{ kind, text, opacity, scale, position, margin }}
          defaults={watermarkPresets}
          onApply={(preset) => {
            setKind(preset.kind);
            setText(preset.text);
            setOpacity(preset.opacity);
            setScale(preset.scale);
            setPosition(preset.position);
            setMargin(preset.margin);
          }}
        />
        <div className="tool-panel-actions">
          <Button onClick={pickSources}>Choose images</Button>
          <Button onClick={pickDirectory}>Choose folder</Button>
        </div>
        <div className="selected-file">{sources.length ? `${sources.length} image(s) selected` : "No images selected"}</div>
        <div className="selected-file">{outputDirectory ? `Export: ${outputDirectory}` : "No export folder selected"}</div>
        <div className="segmented-control">
          <Button className={kind === "text" ? "is-active" : ""} onClick={() => setKind("text")}>
            Text
          </Button>
          <Button className={kind === "image" ? "is-active" : ""} onClick={() => setKind("image")}>
            PNG
          </Button>
        </div>
        {kind === "text" ? (
          <Input label="Watermark text" value={text} onChange={(event) => setText(event.target.value)} />
        ) : (
          <div className="settings-row">
            <div className="settings-copy">
              <span className="settings-label">Watermark image</span>
              <span className="settings-hint selected-file">{imagePath ? imagePath.split("\\").pop() : "No PNG selected"}</span>
            </div>
            <Button onClick={pickOverlay}>Choose PNG</Button>
          </div>
        )}
        <div className="field-grid compact-grid">
          <DragValue label="Opacity" value={opacity} min={0.1} max={1} step={0.01} onChange={setOpacity} />
          <DragValue label="Scale" value={scale} min={0.08} max={0.9} step={0.005} onChange={setScale} />
          <DragValue label="Margin" value={margin} min={0} max={120} step={1} precision={0} onChange={setMargin} />
          <label className="ui-field">
            <span className="ui-field-label">Preset position</span>
            <select className="ui-input compact-select" value={position} onChange={(event) => setPosition(event.target.value as WatermarkPosition)}>
              {positions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button variant="primary" onClick={() => void run()} disabled={!sources.length || !outputDirectory || (kind === "image" && !imagePath)} fullWidth>
          Export watermark
        </Button>
        {message ? <div className="tool-result">{message}</div> : null}
      </Card>

      <Card className="tool-panel tool-panel-secondary" title="Live preview" subtitle="Drag to move. Drag the corner handle to resize.">
        {previewSource ? (
          <div className="watermark-preview" ref={previewRef}>
            <img className="preview-image preview-image-tight" src={toFileUrl(previewSource)} alt="Watermark preview" />
            <div
              className={`watermark-overlay watermark-kind-${kind}`}
              style={{
                ...previewStyle,
                width: overlayWidth,
                opacity
              }}
              onPointerDown={(event) => {
                if (!previewRef.current || (event.target as HTMLElement).dataset.handle === "resize") return;
                setPosition("custom");
                const bounds = previewRef.current.getBoundingClientRect();
                const startX = event.clientX;
                const startY = event.clientY;
                const origin = { ...customPoint };
                const move = (moveEvent: PointerEvent) => {
                  const nextX = clamp(origin.x + (moveEvent.clientX - startX) / bounds.width, 0, 1);
                  const nextY = clamp(origin.y + (moveEvent.clientY - startY) / bounds.height, 0, 1);
                  setCustomPoint({ x: nextX, y: nextY });
                };
                const stop = () => {
                  window.removeEventListener("pointermove", move);
                  window.removeEventListener("pointerup", stop);
                };
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", stop);
              }}
            >
              {kind === "text" ? (
                <div className="watermark-text-preview">{text}</div>
              ) : (
                imagePath ? (
                  <img src={toFileUrl(imagePath)} alt="Overlay preview" className="watermark-image-preview" />
                ) : (
                  <div className="watermark-text-preview">Choose PNG</div>
                )
              )}
              <button
                type="button"
                data-handle="resize"
                className="resize-handle"
                onPointerDown={(event) => {
                  if (!previewRef.current) return;
                  event.stopPropagation();
                  setPosition("custom");
                  const bounds = previewRef.current.getBoundingClientRect();
                  const startX = event.clientX;
                  const origin = scale;
                  const move = (moveEvent: PointerEvent) => {
                    const next = clamp(origin + (moveEvent.clientX - startX) / bounds.width, 0.08, 0.9);
                    setScale(Number(next.toFixed(3)));
                  };
                  const stop = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", stop);
                  };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", stop);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="empty-state large-empty-state">Drop multiple images here to enter batch mode instantly.</div>
        )}
      </Card>
    </div>
  );
};
