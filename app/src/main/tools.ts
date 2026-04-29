import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import * as piexif from "piexifjs";
import NodeID3 from "node-id3";
import { PDFDocument } from "pdf-lib";
import type {
  ImageSlicerInput,
  ImageSlicerResult,
  MetadataInspection,
  MetadataUpdateEntry,
  MetadataUpdateResult,
  PaletteGrabberInput,
  PaletteResult,
  WatermarkJobInput,
  WatermarkJobResult
} from "@adverta/shared";
import { exportAse } from "./ase.js";
import { ToolError } from "./errors.js";
import { clusterPalette, ensureDirectory, ensureExists, getCapabilities, inferKind, positionToGravity, rgbToHex } from "./tool-utils.js";

const require = createRequire(import.meta.url);
const sharp = require("sharp") as any;

const padTileSize = (dimension: number, tileSize: number): number => Math.ceil(dimension / tileSize) * tileSize;

const validatePositiveInteger = (value: number | undefined, field: string): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    throw new ToolError(`${field} must be a positive whole number.`, "INVALID_INPUT");
  }
  return value;
};

export const sliceImage = async (input: ImageSlicerInput): Promise<ImageSlicerResult> => {
  ensureExists(input.sourcePath);
  ensureDirectory(input.outputDirectory);
  const metadata = await sharp(input.sourcePath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new ToolError("Unable to read image dimensions.", "INVALID_IMAGE");
  }

  const requestedTileSize = validatePositiveInteger(input.tileSize, "Tile size");
  const requestedColumns = validatePositiveInteger(input.gridColumns, "Columns");
  const requestedRows = validatePositiveInteger(input.gridRows, "Rows");

  if (!requestedTileSize && !requestedColumns && !requestedRows) {
    throw new ToolError("Select a tile size or set rows and columns before exporting.", "INVALID_INPUT");
  }

  const columns = requestedColumns ?? Math.ceil(metadata.width / (requestedTileSize ?? metadata.width));
  const rows = requestedRows ?? Math.ceil(metadata.height / (requestedTileSize ?? metadata.height));

  if (!columns || !rows) {
    throw new ToolError("Rows and columns must both be greater than zero.", "INVALID_INPUT");
  }

  const tileSize =
    requestedTileSize ?? Math.ceil(Math.max(metadata.width / columns, metadata.height / rows));

  if (!tileSize || tileSize <= 0) {
    throw new ToolError("Tile size must be greater than zero.", "INVALID_INPUT");
  }

  const paddedWidth = Math.max(tileSize * columns, padTileSize(metadata.width, tileSize));
  const paddedHeight = Math.max(tileSize * rows, padTileSize(metadata.height, tileSize));
  const baseName = path.parse(input.sourcePath).name;

  const paddedBuffer = await sharp(input.sourcePath)
    .ensureAlpha()
    .extend({
      right: paddedWidth - metadata.width,
      bottom: paddedHeight - metadata.height,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  const tiles = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const left = column * tileSize;
      const top = row * tileSize;

      if (left < 0 || top < 0 || left + tileSize > paddedWidth || top + tileSize > paddedHeight) {
        throw new ToolError("Computed tile bounds are invalid. Adjust the grid and try again.", "INVALID_EXTRACT_AREA");
      }

      const outputPath = path.join(input.outputDirectory, `${baseName}_r${row + 1}_c${column + 1}.png`);
      await sharp(paddedBuffer)
        .extract({
          left,
          top,
          width: tileSize,
          height: tileSize
        })
        .png()
        .toFile(outputPath);
      tiles.push({
        path: outputPath,
        label: `${row + 1}:${column + 1}`
      });
    }
  }
  const manifestPath = path.join(input.outputDirectory, `${baseName}_manifest.json`);
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        sourcePath: input.sourcePath,
        tileSize,
        rows,
        columns,
        tiles
      },
      null,
      2
    ),
    "utf8"
  );
  return { tiles, manifestPath, rows, columns };
};

export const inspectMetadata = async (filePaths: string[]): Promise<MetadataInspection[]> => {
  return Promise.all(
    filePaths.map(async (filePath) => {
      ensureExists(filePath);
      const stats = fs.statSync(filePath);
      const kind = inferKind(filePath);
      const capabilities = getCapabilities(kind, filePath);
      const base = {
        path: filePath,
        fileName: path.basename(filePath),
        capabilities,
        timestamps: {
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString()
        },
        values: {}
      } satisfies MetadataInspection;

      if (kind === "pdf") {
        const doc = await PDFDocument.load(fs.readFileSync(filePath));
        return {
          ...base,
          values: {
            title: doc.getTitle() ?? "",
            author: doc.getAuthor() ?? "",
            comment: doc.getSubject() ?? "",
            keywords: doc.getKeywords() ?? []
          }
        };
      }

      if (kind === "mp3") {
        const tags = NodeID3.read(filePath);
        return {
          ...base,
          values: {
            title: typeof tags.title === "string" ? tags.title : "",
            author: typeof tags.artist === "string" ? tags.artist : "",
            album: typeof tags.album === "string" ? tags.album : "",
            comment:
              typeof tags.comment === "object" && tags.comment && "text" in tags.comment
                ? String(tags.comment.text ?? "")
                : "",
            keywords: typeof tags.genre === "string" ? tags.genre.split(",").map((item) => item.trim()).filter(Boolean) : []
          }
        };
      }

      if (kind === "image") {
        const ext = path.extname(filePath).toLowerCase();
        if ([".jpg", ".jpeg", ".webp"].includes(ext)) {
          const imageBinary = fs.readFileSync(filePath).toString("binary");
          const exif = piexif.load(imageBinary);
          return {
            ...base,
            values: {
              title: String(exif["0th"][piexif.ImageIFD.ImageDescription] ?? ""),
              author: String(exif["0th"][piexif.ImageIFD.Artist] ?? ""),
              comment: String(exif["Exif"][piexif.ExifIFD.UserComment] ?? ""),
              keywords: String(exif["0th"][piexif.ImageIFD.XPKeywords] ?? "")
                .split(";")
                .map((item) => item.trim())
                .filter(Boolean)
            }
          };
        }
      }

      return base;
    })
  );
};

const applyFsTimes = (filePath: string, createdAt?: string | null, modifiedAt?: string | null): void => {
  const stats = fs.statSync(filePath);
  fs.utimesSync(filePath, new Date(createdAt ?? stats.atime), new Date(modifiedAt ?? stats.mtime));
  if (process.platform === "win32" && (createdAt || modifiedAt)) {
    const escaped = filePath.replace(/'/g, "''");
    const segments = [`$item = Get-Item -LiteralPath '${escaped}'`];
    if (createdAt) {
      segments.push(`$item.CreationTimeUtc = [datetime]'${createdAt}'`);
    }
    if (modifiedAt) {
      segments.push(`$item.LastWriteTimeUtc = [datetime]'${modifiedAt}'`);
    }
    spawnSync("powershell.exe", ["-NoProfile", "-Command", segments.join("; ")], {
      windowsHide: true
    });
  }
};

const updatePdf = async (filePath: string, entry: MetadataUpdateEntry): Promise<void> => {
  const document = await PDFDocument.load(fs.readFileSync(filePath));
  if (entry.values?.title !== undefined) document.setTitle(entry.values.title);
  if (entry.values?.author !== undefined) document.setAuthor(entry.values.author);
  if (entry.values?.comment !== undefined) document.setSubject(entry.values.comment);
  if (entry.values?.keywords) document.setKeywords(entry.values.keywords);
  const output = await document.save();
  fs.writeFileSync(filePath, output);
};

const updateMp3 = (filePath: string, entry: MetadataUpdateEntry): void => {
  const tags: NodeID3.Tags = {
    title: entry.values?.title,
    artist: entry.values?.author,
    album: entry.values?.album,
    comment: {
      language: "eng",
      text: entry.values?.comment ?? ""
    },
    genre: entry.values?.keywords?.join(", ")
  };
  if (entry.coverImagePath) {
    tags.image = entry.coverImagePath;
  }
  NodeID3.update(tags, filePath);
};

const updateImageExif = (filePath: string, entry: MetadataUpdateEntry): void => {
  const ext = path.extname(filePath).toLowerCase();
  if (![".jpg", ".jpeg", ".webp"].includes(ext)) {
    return;
  }
  const imageBase64 = fs.readFileSync(filePath).toString("binary");
  const exif = piexif.load(imageBase64);
  if (entry.values?.title !== undefined) exif["0th"][piexif.ImageIFD.ImageDescription] = entry.values.title;
  if (entry.values?.author !== undefined) exif["0th"][piexif.ImageIFD.Artist] = entry.values.author;
  if (entry.values?.comment !== undefined) exif["Exif"][piexif.ExifIFD.UserComment] = entry.values.comment;
  if (entry.values?.keywords) exif["0th"][piexif.ImageIFD.XPKeywords] = entry.values.keywords.join(";");
  const exifBytes = piexif.dump(exif);
  const updatedImage = piexif.insert(exifBytes, imageBase64);
  fs.writeFileSync(filePath, updatedImage, "binary");
};

export const updateMetadata = async (entries: MetadataUpdateEntry[]): Promise<MetadataUpdateResult> => {
  const files = [];
  for (const entry of entries) {
    ensureExists(entry.sourcePath);
    const directory = path.dirname(entry.sourcePath);
    const nextPath = entry.nextFileName ? path.join(directory, entry.nextFileName) : entry.sourcePath;
    if (nextPath !== entry.sourcePath) {
      fs.renameSync(entry.sourcePath, nextPath);
    }
    const kind = inferKind(nextPath);
    if (kind === "pdf") {
      await updatePdf(nextPath, entry);
    }
    if (kind === "mp3") {
      updateMp3(nextPath, entry);
    }
    if (kind === "image") {
      updateImageExif(nextPath, entry);
    }
    applyFsTimes(nextPath, entry.timestamps?.createdAt, entry.timestamps?.modifiedAt);
    files.push({
      path: nextPath,
      label: path.basename(nextPath)
    });
  }
  return { files };
};

const buildTextWatermark = async (text: string, width: number, opacity: number): Promise<Buffer> => {
  const svg = `
    <svg width="${width}" height="${Math.round(width * 0.3)}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="100%" height="100%" rx="28" fill="rgba(16,16,24,0.55)" />
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        fill="rgba(255,255,255,${opacity})" font-size="${Math.max(18, Math.round(width * 0.13))}"
        font-family="Segoe UI, Arial, sans-serif" font-weight="600">${text}</text>
    </svg>
  `;
  return Buffer.from(svg);
};

export const applyWatermark = async (input: WatermarkJobInput): Promise<WatermarkJobResult> => {
  ensureDirectory(input.outputDirectory);
  const files = [];
  for (const sourcePath of input.sourcePaths) {
    ensureExists(sourcePath);
    const base = sharp(sourcePath).ensureAlpha();
    const metadata = await base.metadata();
    const width = metadata.width ?? 1000;
    let overlay: Buffer;
    if (input.kind === "image" && input.imagePath) {
      ensureExists(input.imagePath);
      overlay = await sharp(input.imagePath)
        .ensureAlpha()
        .resize({ width: Math.max(60, Math.round(width * input.scale)) })
        .png()
        .toBuffer();
    } else {
      overlay = await buildTextWatermark(input.text ?? "", Math.max(240, Math.round(width * input.scale)), input.opacity);
    }
    const outputPath = path.join(input.outputDirectory, `${path.parse(sourcePath).name}_watermarked.png`);
    const overlayMetadata = await sharp(overlay).metadata();
    const overlayWidth = overlayMetadata.width ?? Math.max(60, Math.round(width * input.scale));
    const overlayHeight = overlayMetadata.height ?? Math.max(40, Math.round(width * input.scale * 0.3));
    const imageHeight = metadata.height ?? width;

    const composite =
      input.position === "custom"
        ? {
            input: overlay,
            blend: "over" as const,
            left: Math.max(0, Math.round((input.customX ?? 0.5) * width - overlayWidth / 2)),
            top: Math.max(0, Math.round((input.customY ?? 0.5) * imageHeight - overlayHeight / 2))
          }
        : {
            input: overlay,
            gravity: positionToGravity(input.position),
            blend: "over" as const,
            top:
              input.position.startsWith("top") ? input.margin : input.position.startsWith("bottom") ? -input.margin : 0,
            left:
              input.position.endsWith("left") ? input.margin : input.position.endsWith("right") ? -input.margin : 0
          };

    await base
      .composite([
        composite
      ])
      .png()
      .toFile(outputPath);
    files.push({
      path: outputPath,
      label: path.basename(outputPath)
    });
  }
  return { files };
};

export const grabPalette = async (input: PaletteGrabberInput): Promise<PaletteResult> => {
  ensureExists(input.sourcePath);
  const colors = await clusterPalette(input.sourcePath, input.colorCount);
  const exportedFiles = [];
  if (input.exportDirectory && input.exportBaseName) {
    ensureDirectory(input.exportDirectory);
    const txtPath = path.join(input.exportDirectory, `${input.exportBaseName}.txt`);
    const csvPath = path.join(input.exportDirectory, `${input.exportBaseName}.csv`);
    const asePath = path.join(input.exportDirectory, `${input.exportBaseName}.ase`);
    fs.writeFileSync(txtPath, colors.map((color) => color.hex).join("\n"), "utf8");
    fs.writeFileSync(
      csvPath,
      ["hex,red,green,blue,population", ...colors.map((color) => `${color.hex},${color.rgb.join(",")},${color.population}`)].join(
        "\n"
      ),
      "utf8"
    );
    exportAse(asePath, colors);
    exportedFiles.push(
      { path: txtPath, label: path.basename(txtPath) },
      { path: csvPath, label: path.basename(csvPath) },
      { path: asePath, label: path.basename(asePath) }
    );
  }
  return {
    colors,
    previewPath: input.sourcePath,
    exportedFiles
  };
};
