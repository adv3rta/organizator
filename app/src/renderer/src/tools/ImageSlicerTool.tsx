import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { FilePreview } from "../components/FilePreview";
import { Input } from "../components/Input";

export const ImageSlicerTool = () => {
  const [sourcePath, setSourcePath] = useState("");
  const [outputDirectory, setOutputDirectory] = useState("");
  const [tileSize, setTileSize] = useState("512");
  const [result, setResult] = useState("");
  const canRun = Boolean(sourcePath && outputDirectory && Number(tileSize) > 0);

  const tileSummary = useMemo(() => (tileSize ? `Square tiles: ${tileSize}px` : "Define tile size"), [tileSize]);

  const pickFile = async (): Promise<void> => {
    const response = await window.adverta.selectFiles({
      title: "Select source image",
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "tif", "tiff"] }]
    });
    if (!response.canceled && response.filePaths[0]) setSourcePath(response.filePaths[0]);
  };

  const pickDirectory = async (): Promise<void> => {
    const response = await window.adverta.selectFolder({
      title: "Select export folder",
      properties: ["openDirectory"]
    });
    if (!response.canceled && response.filePaths[0]) setOutputDirectory(response.filePaths[0]);
  };

  const run = async (): Promise<void> => {
    const response = await window.adverta.sliceImage({
      sourcePath,
      outputDirectory,
      tileSize: Number(tileSize)
    });
    setResult(response.ok ? `Exported ${response.data?.tiles.length ?? 0} tiles.` : response.error?.message ?? "Failed.");
  };

  return (
    <div className="tool-screen">
      <Card className="tool-panel" title="Source" subtitle={tileSummary}>
        <div className="tool-panel-actions">
          <Button onClick={pickFile}>Choose image</Button>
        </div>
        {sourcePath ? <FilePreview path={sourcePath} alt="Source preview" /> : <div className="empty-state">No image selected.</div>}
        <div className="field-stack">
          <Input label="Tile size" value={tileSize} onChange={(event) => setTileSize(event.target.value)} type="number" min="32" step="1" />
          <div className="inline-control">
            <Input label="Export directory" value={outputDirectory} onChange={(event) => setOutputDirectory(event.target.value)} placeholder="Choose export folder" />
            <Button onClick={pickDirectory}>Browse</Button>
          </div>
        </div>
        <Button variant="primary" onClick={run} disabled={!canRun} fullWidth>
          Slice image
        </Button>
        {result ? <div className="tool-result">{result}</div> : null}
      </Card>
      <Card className="tool-panel tool-panel-secondary" title="How it exports" subtitle="Tiles are padded transparently when the image size is not evenly divisible.">
        <ul className="plain-list">
          <li>Equal square tiles</li>
          <li>Deterministic row/column file names</li>
          <li>JSON manifest saved with every run</li>
        </ul>
      </Card>
    </div>
  );
};
