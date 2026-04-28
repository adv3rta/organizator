import { useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { FilePreview } from "../components/FilePreview";
import { Input } from "../components/Input";

const positions = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right"
] as const;

export const WatermarkTool = () => {
  const [sources, setSources] = useState<string[]>([]);
  const [outputDirectory, setOutputDirectory] = useState("");
  const [kind, setKind] = useState<"text" | "image">("text");
  const [text, setText] = useState("Adverta Tools");
  const [imagePath, setImagePath] = useState("");
  const [opacity, setOpacity] = useState("0.8");
  const [scale, setScale] = useState("0.24");
  const [position, setPosition] = useState<(typeof positions)[number]>("bottom-right");
  const [margin, setMargin] = useState("24");
  const [message, setMessage] = useState("");

  const pickSources = async (): Promise<void> => {
    const response = await window.adverta.selectFiles({
      title: "Select images",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }]
    });
    if (!response.canceled) setSources(response.filePaths);
  };

  const pickOverlay = async (): Promise<void> => {
    const response = await window.adverta.selectFiles({
      title: "Select PNG watermark",
      properties: ["openFile"],
      filters: [{ name: "PNG", extensions: ["png"] }]
    });
    if (!response.canceled && response.filePaths[0]) setImagePath(response.filePaths[0]);
  };

  const pickDirectory = async (): Promise<void> => {
    const response = await window.adverta.selectFolder({
      title: "Select output folder",
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
      opacity: Number(opacity),
      scale: Number(scale),
      position,
      margin: Number(margin)
    });
    setMessage(response.ok ? `Processed ${response.data?.files.length ?? 0} files.` : response.error?.message ?? "Failed.");
  };

  return (
    <div className="tool-screen">
      <Card className="tool-panel" title="Batch Watermarking" subtitle="Apply text or PNG watermarks to multiple images.">
        <div className="tool-panel-actions">
          <Button onClick={pickSources}>Choose images</Button>
          <Button onClick={pickDirectory}>Choose output folder</Button>
        </div>
        {sources[0] ? <FilePreview path={sources[0]} alt="Watermark preview" /> : <div className="empty-state">No images selected.</div>}
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
          <div className="inline-control">
            <Input label="Watermark image" value={imagePath} onChange={(event) => setImagePath(event.target.value)} placeholder="PNG watermark path" />
            <Button onClick={pickOverlay}>Browse</Button>
          </div>
        )}
        <div className="field-grid">
          <Input label="Opacity" value={opacity} onChange={(event) => setOpacity(event.target.value)} type="number" min="0.1" max="1" step="0.1" />
          <Input label="Scale" value={scale} onChange={(event) => setScale(event.target.value)} type="number" min="0.05" max="1" step="0.01" />
          <Input label="Margin" value={margin} onChange={(event) => setMargin(event.target.value)} type="number" min="0" step="1" />
          <label className="ui-field">
            <span className="ui-field-label">Position</span>
            <select className="ui-input" value={position} onChange={(event) => setPosition(event.target.value as (typeof positions)[number])}>
              {positions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button variant="primary" onClick={run} disabled={!sources.length || !outputDirectory} fullWidth>
          Apply watermark
        </Button>
        {message ? <div className="tool-result">{message}</div> : null}
      </Card>
      <Card className="tool-panel tool-panel-secondary" title="Batch scope" subtitle={`${sources.length} image(s) selected`}>
        <ul className="plain-list">
          {sources.map((file) => (
            <li key={file}>{file.split("\\").pop()}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
};
