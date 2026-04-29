import { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import type { ToolProps } from "./types";

const toFileUrl = (filePath: string): string => `file:///${filePath.replace(/\\/g, "/")}`;

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

export const PaletteGrabberTool = ({ incomingFiles, consumeIncomingFiles }: ToolProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [sourcePath, setSourcePath] = useState("");
  const [hoverColor, setHoverColor] = useState("#FFFFFF");
  const [selectedColor, setSelectedColor] = useState("#FFFFFF");

  useEffect(() => {
    if (incomingFiles?.[0]) {
      setSourcePath(incomingFiles[0]);
      consumeIncomingFiles();
    }
  }, [consumeIncomingFiles, incomingFiles]);

  const pickFile = async (): Promise<void> => {
    const response = await window.adverta.selectFiles({
      title: "Choose image",
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"] }]
    });
    if (!response.canceled && response.filePaths[0]) setSourcePath(response.filePaths[0]);
  };

  const syncCanvas = (): void => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, 0, 0);
  };

  const readColor = (event: React.MouseEvent<HTMLImageElement, MouseEvent>): string | null => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return null;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const bounds = image.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width - 1, Math.round(((event.clientX - bounds.left) / bounds.width) * canvas.width)));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.round(((event.clientY - bounds.top) / bounds.height) * canvas.height)));
    const [r, g, b] = context.getImageData(x, y, 1, 1).data;
    return rgbToHex(r, g, b);
  };

  return (
    <div className="tool-screen palette-screen">
      <Card className="tool-panel" title="Color picker" subtitle="Hover to inspect, click to copy.">
        <div className="tool-panel-actions">
          <Button onClick={pickFile}>Choose image</Button>
        </div>
        <div className="selected-file">{sourcePath ? `Image: ${sourcePath.split("\\").pop()}` : "No image selected"}</div>
        <div className="palette-readout">
          <div className="palette-chip">
            <span className="palette-chip-swatch" style={{ background: hoverColor }} />
            <div>
              <strong>Current</strong>
              <span>{hoverColor}</span>
            </div>
          </div>
          <div className="palette-chip">
            <span className="palette-chip-swatch" style={{ background: selectedColor }} />
            <div>
              <strong>Selected</strong>
              <span>{selectedColor}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="tool-panel tool-panel-secondary" title="Preview" subtitle="PowerToys-style eyedropper interaction.">
        {sourcePath ? (
          <div className="palette-canvas-shell">
            <img
              ref={imageRef}
              className="preview-image palette-preview"
              src={toFileUrl(sourcePath)}
              alt="Palette picker preview"
              onLoad={syncCanvas}
              onMouseMove={(event) => {
                const next = readColor(event);
                if (next) setHoverColor(next);
              }}
              onClick={async (event) => {
                const next = readColor(event);
                if (!next) return;
                setSelectedColor(next);
                await window.adverta.copyToClipboard(next);
              }}
            />
            <canvas ref={canvasRef} className="sr-only-canvas" />
          </div>
        ) : (
          <div className="empty-state large-empty-state">Drop a single image here to start picking colors.</div>
        )}
      </Card>
    </div>
  );
};
