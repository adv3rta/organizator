import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DragValue } from "../components/DragValue";
import { PresetStrip } from "../components/PresetStrip";
import type { ToolProps } from "./types";

const slicerDefaults = [
  { id: "slicer_512", name: "512 slicing", value: { tileSize: 512, columns: 2, rows: 2 } },
  { id: "slicer_1024", name: "1024 slicing", value: { tileSize: 1024, columns: 1, rows: 1 } }
];

const toFileUrl = (filePath: string): string => encodeURI(`file:///${filePath.replace(/\\/g, "/")}`);

const clampWhole = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(value)));

export const ImageSlicerTool = ({ incomingFiles, consumeIncomingFiles, appSettings }: ToolProps) => {
  const [sourcePath, setSourcePath] = useState("");
  const [outputDirectory, setOutputDirectory] = useState(appSettings.defaultExportFolder ?? "");
  const [tileSize, setTileSize] = useState(512);
  const [rows, setRows] = useState(1);
  const [columns, setColumns] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [validationMessage, setValidationMessage] = useState("");
  const [result, setResult] = useState("");
  const [previewReady, setPreviewReady] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [editMode, setEditMode] = useState<"tile" | "grid">("tile");

  useEffect(() => {
    if (appSettings.defaultExportFolder && !outputDirectory) {
      setOutputDirectory(appSettings.defaultExportFolder);
    }
  }, [appSettings.defaultExportFolder, outputDirectory]);

  useEffect(() => {
    if (incomingFiles?.[0]) {
      setSourcePath(incomingFiles[0]);
      consumeIncomingFiles();
    }
  }, [consumeIncomingFiles, incomingFiles]);

  useEffect(() => {
    setResult("");
  }, [sourcePath, outputDirectory, tileSize, rows, columns]);

  const syncFromTileSize = (nextTileSize: number, width = imageSize.width, height = imageSize.height) => {
    const safeTileSize = clampWhole(nextTileSize, 1, 8192);
    setTileSize(safeTileSize);
    if (width > 0 && height > 0) {
      setColumns(Math.max(1, Math.ceil(width / safeTileSize)));
      setRows(Math.max(1, Math.ceil(height / safeTileSize)));
    }
  };

  const syncFromGrid = (nextColumns: number, nextRows: number, width = imageSize.width, height = imageSize.height) => {
    const safeColumns = clampWhole(nextColumns, 1, 256);
    const safeRows = clampWhole(nextRows, 1, 256);
    setColumns(safeColumns);
    setRows(safeRows);
    if (width > 0 && height > 0) {
      setTileSize(Math.max(1, Math.ceil(Math.max(width / safeColumns, height / safeRows))));
    }
  };

  useEffect(() => {
    if (!imageSize.width || !imageSize.height) {
      return;
    }
    if (editMode === "tile") {
      syncFromTileSize(tileSize, imageSize.width, imageSize.height);
    } else {
      syncFromGrid(columns, rows, imageSize.width, imageSize.height);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSize.width, imageSize.height]);

  const preview = useMemo(() => {
    if (!imageSize.width || !imageSize.height) {
      return null;
    }

    const safeTileSize = Math.max(1, tileSize);
    const safeColumns = Math.max(1, columns);
    const safeRows = Math.max(1, rows);
    const paddedWidth = safeColumns * safeTileSize;
    const paddedHeight = safeRows * safeTileSize;

    return {
      paddedWidth,
      paddedHeight,
      columns: safeColumns,
      rows: safeRows,
      tileSize: safeTileSize
    };
  }, [columns, imageSize.height, imageSize.width, rows, tileSize]);

  useEffect(() => {
    const issues: string[] = [];
    if (!sourcePath) issues.push("Choose an image.");
    if (!outputDirectory) issues.push("Choose an export folder.");
    if (!tileSize || tileSize <= 0) issues.push("Tile size must be greater than zero.");
    if (!columns || columns <= 0) issues.push("Columns must be greater than zero.");
    if (!rows || rows <= 0) issues.push("Rows must be greater than zero.");
    if (preview && (preview.paddedWidth <= 0 || preview.paddedHeight <= 0)) {
      issues.push("Grid preview is invalid.");
    }
    setValidationMessage(issues[0] ?? "");
  }, [columns, outputDirectory, preview, rows, sourcePath, tileSize]);

  const canRun = Boolean(sourcePath && outputDirectory && !validationMessage && previewReady && !previewFailed);

  const pickFile = async (): Promise<void> => {
    const response = await window.adverta.selectFiles({
      title: "Choose source image",
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "tif", "tiff"] }]
    });
    if (!response.canceled && response.filePaths[0]) {
      setSourcePath(response.filePaths[0]);
      setPreviewReady(false);
      setPreviewFailed(false);
    }
  };

  const pickDirectory = async (): Promise<void> => {
    const response = await window.adverta.selectFolder({
      title: "Choose export folder",
      properties: ["openDirectory"]
    });
    if (!response.canceled && response.filePaths[0]) setOutputDirectory(response.filePaths[0]);
  };

  const run = async (): Promise<void> => {
    if (!canRun) {
      setResult(validationMessage || "Complete the required slicer settings before exporting.");
      return;
    }

    const response = await window.adverta.sliceImage({
      sourcePath,
      outputDirectory,
      tileSize,
      gridColumns: columns,
      gridRows: rows
    });
    if (!response.ok) {
      setResult(response.error?.message ?? "Image slicing failed.");
      return;
    }
    setResult(`Exported ${response.data?.tiles.length ?? 0} tiles.`);
    if (appSettings.autoOpenExportFolder) {
      await window.adverta.openExternal(`file:///${outputDirectory.replace(/\\/g, "/")}`);
    }
  };

  return (
    <div className="tool-screen">
      <Card className="tool-panel" title="Controls" subtitle="Choose an image, adjust the grid, then export.">
        <div className="slicer-section slicer-section-tight">
          <PresetStrip
            scope="slicer"
            value={{ tileSize, columns, rows }}
            defaults={slicerDefaults}
            onApply={(preset) => {
              setEditMode("tile");
              syncFromGrid(preset.columns, preset.rows);
              syncFromTileSize(preset.tileSize);
            }}
          />
        </div>

        <div className="tool-panel-actions slicer-actions">
          <Button onClick={pickFile}>Choose image</Button>
          <Button onClick={pickDirectory}>Choose folder</Button>
        </div>

        <div className="selected-file-stack">
          <div className="selected-file">{sourcePath ? `Image: ${sourcePath.split("\\").pop()}` : "No image selected"}</div>
          <div className="selected-file">{outputDirectory ? `Export: ${outputDirectory}` : "No export folder selected"}</div>
        </div>

        <div className="field-grid slicer-control-grid">
          <DragValue
            label="Tile size"
            value={tileSize}
            min={1}
            max={4096}
            step={8}
            precision={0}
            onChange={(value) => {
              setEditMode("tile");
              syncFromTileSize(value);
            }}
          />
          <DragValue
            label="Columns"
            value={columns}
            min={1}
            max={256}
            step={1}
            precision={0}
            onChange={(value) => {
              setEditMode("grid");
              syncFromGrid(value, rows);
            }}
          />
          <DragValue
            label="Rows"
            value={rows}
            min={1}
            max={256}
            step={1}
            precision={0}
            onChange={(value) => {
              setEditMode("grid");
              syncFromGrid(columns, value);
            }}
          />
        </div>

        {validationMessage ? <div className="inline-note">{validationMessage}</div> : null}

        <Button variant="primary" onClick={() => void run()} disabled={!canRun} fullWidth>
          Export tiles
        </Button>
        {result ? <div className="tool-result">{result}</div> : null}
      </Card>

      <Card className="tool-panel tool-panel-secondary" title="Live preview">
        {sourcePath ? (
          preview && previewReady && !previewFailed ? (
            <div
              className="slicer-preview"
              style={{
                aspectRatio: `${preview.paddedWidth} / ${preview.paddedHeight}`
              }}
            >
              <div
                className="slicer-grid-overlay slicer-grid-preview"
                style={{
                  gridTemplateColumns: `repeat(${preview.columns}, 1fr)`,
                  gridTemplateRows: `repeat(${preview.rows}, 1fr)`
                }}
              >
                {Array.from({ length: preview.columns * preview.rows }).map((_, index) => {
                  const rowIndex = Math.floor(index / preview.columns);
                  const columnIndex = index % preview.columns;
                  return (
                    <span
                      key={`${rowIndex}-${columnIndex}`}
                      className="slicer-grid-tile"
                      style={{
                        backgroundImage: `url("${toFileUrl(sourcePath)}")`,
                        backgroundSize: `${(preview.paddedWidth / preview.tileSize) * 100}% ${(preview.paddedHeight / preview.tileSize) * 100}%`,
                        backgroundPosition: `${preview.columns === 1 ? 0 : (columnIndex / (preview.columns - 1)) * 100}% ${preview.rows === 1 ? 0 : (rowIndex / (preview.rows - 1)) * 100}%`
                      }}
                    />
                  );
                })}
              </div>
              <img
                className="slicer-source-probe"
                src={toFileUrl(sourcePath)}
                alt=""
                onLoad={(event) => {
                  const width = event.currentTarget.naturalWidth;
                  const height = event.currentTarget.naturalHeight;
                  setImageSize({ width, height });
                  setPreviewReady(true);
                  setPreviewFailed(false);
                  if (editMode === "tile") {
                    syncFromTileSize(tileSize, width, height);
                  } else {
                    syncFromGrid(columns, rows, width, height);
                  }
                }}
                onError={() => {
                  setPreviewFailed(true);
                  setPreviewReady(false);
                }}
              />
            </div>
          ) : previewFailed ? (
            <div className="empty-state large-empty-state">Preview could not be rendered for this image.</div>
          ) : (
            <div className="empty-state large-empty-state">Loading preview…</div>
          )
        ) : (
          <div className="empty-state large-empty-state">Drop one image here to start slicing.</div>
        )}
      </Card>
    </div>
  );
};
