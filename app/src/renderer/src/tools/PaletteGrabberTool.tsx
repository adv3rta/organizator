import { useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { FilePreview } from "../components/FilePreview";
import { Input } from "../components/Input";

export const PaletteGrabberTool = () => {
  const [sourcePath, setSourcePath] = useState("");
  const [colorCount, setColorCount] = useState("5");
  const [exportDirectory, setExportDirectory] = useState("");
  const [colors, setColors] = useState<Array<{ hex: string; population: number }>>([]);
  const [message, setMessage] = useState("");

  const pickFile = async (): Promise<void> => {
    const response = await window.adverta.selectFiles({
      title: "Select image",
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }]
    });
    if (!response.canceled && response.filePaths[0]) setSourcePath(response.filePaths[0]);
  };

  const pickDirectory = async (): Promise<void> => {
    const response = await window.adverta.selectFolder({
      title: "Choose export folder",
      properties: ["openDirectory"]
    });
    if (!response.canceled && response.filePaths[0]) setExportDirectory(response.filePaths[0]);
  };

  const run = async (withExport = false): Promise<void> => {
    const response = await window.adverta.grabPalette({
      sourcePath,
      colorCount: Number(colorCount),
      exportDirectory: withExport ? exportDirectory : undefined,
      exportBaseName: withExport ? "palette" : undefined
    });
    if (!response.ok) {
      setMessage(response.error?.message ?? "Palette extraction failed.");
      return;
    }
    setColors(response.data?.colors ?? []);
    setMessage(withExport ? `Exported ${response.data?.exportedFiles?.length ?? 0} palette files.` : "Palette ready.");
  };

  return (
    <div className="tool-screen palette-screen">
      <Card className="tool-panel" title="Preview + Controls" subtitle="Extract top 3-5 dominant colors locally.">
        <div className="tool-panel-actions">
          <Button onClick={pickFile}>Choose image</Button>
        </div>
        {sourcePath ? <FilePreview path={sourcePath} alt="Palette preview" /> : <div className="empty-state">No image selected.</div>}
        <div className="field-stack">
          <Input label="Colors" value={colorCount} onChange={(event) => setColorCount(event.target.value)} type="number" min="3" max="5" />
          <div className="inline-control">
            <Input label="Export directory" value={exportDirectory} onChange={(event) => setExportDirectory(event.target.value)} placeholder="Choose export folder" />
            <Button onClick={pickDirectory}>Browse</Button>
          </div>
        </div>
        <div className="tool-panel-actions">
          <Button variant="primary" onClick={() => run(false)} disabled={!sourcePath}>
            Extract palette
          </Button>
          <Button onClick={() => run(true)} disabled={!sourcePath || !exportDirectory}>
            Export .ase / .txt / .csv
          </Button>
        </div>
        {message ? <div className="tool-result">{message}</div> : null}
      </Card>
      <Card className="tool-panel tool-panel-secondary" title="Color Grid" subtitle="Click a swatch to copy HEX.">
        <div className="palette-grid">
          {colors.map((color) => (
            <Button
              key={color.hex}
              variant="tile"
              className="palette-swatch"
              style={{ background: color.hex }}
              onClick={() => window.adverta.copyToClipboard(color.hex)}
              title={`Copy ${color.hex}`}
            >
              <span>{color.hex}</span>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};
