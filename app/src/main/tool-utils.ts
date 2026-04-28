import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type { MetadataCapabilities, MetadataFileKind, PaletteColor, WatermarkPosition } from "@adverta/shared";

const require = createRequire(import.meta.url);
const sharp = require("sharp") as any;

export const ensureExists = (filePath: string): void => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
};

export const ensureDirectory = (directoryPath: string): void => {
  fs.mkdirSync(directoryPath, { recursive: true });
};

export const inferKind = (filePath: string): MetadataFileKind => {
  const ext = path.extname(filePath).toLowerCase();
  if ([".mp3"].includes(ext)) return "mp3";
  if ([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"].includes(ext)) return "image";
  if ([".pdf"].includes(ext)) return "pdf";
  return "unknown";
};

export const getCapabilities = (kind: MetadataFileKind, filePath: string): MetadataCapabilities => {
  const ext = path.extname(filePath).toLowerCase();
  if (kind === "mp3") {
    return {
      kind,
      supportsEmbeddedTags: true,
      supportsCoverArt: true,
      supportsTitle: true,
      supportsAuthor: true,
      supportsAlbum: true,
      supportsComment: true,
      supportsKeywords: true
    };
  }
  if (kind === "image") {
    const supportsExif = [".jpg", ".jpeg", ".webp", ".tif", ".tiff"].includes(ext);
    return {
      kind,
      supportsEmbeddedTags: supportsExif,
      supportsCoverArt: false,
      supportsTitle: supportsExif,
      supportsAuthor: supportsExif,
      supportsAlbum: false,
      supportsComment: supportsExif,
      supportsKeywords: supportsExif
    };
  }
  if (kind === "pdf") {
    return {
      kind,
      supportsEmbeddedTags: true,
      supportsCoverArt: false,
      supportsTitle: true,
      supportsAuthor: true,
      supportsAlbum: false,
      supportsComment: true,
      supportsKeywords: true
    };
  }
  return {
    kind,
    supportsEmbeddedTags: false,
    supportsCoverArt: false,
    supportsTitle: false,
    supportsAuthor: false,
    supportsAlbum: false,
    supportsComment: false,
    supportsKeywords: false
  };
};

export const positionToGravity = (position: WatermarkPosition): string => {
  switch (position) {
    case "top-left":
      return "northwest";
    case "top-center":
      return "north";
    case "top-right":
      return "northeast";
    case "center-left":
      return "west";
    case "center":
      return "center";
    case "center-right":
      return "east";
    case "bottom-left":
      return "southwest";
    case "bottom-center":
      return "south";
    case "bottom-right":
      return "southeast";
  }
};

export const rgbToHex = (red: number, green: number, blue: number): string =>
  `#${[red, green, blue]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

export const clusterPalette = async (imagePath: string, colorCount: number): Promise<PaletteColor[]> => {
  const { data, info } = await sharp(imagePath).resize(128, 128, { fit: "inside" }).removeAlpha().raw().toBuffer({
    resolveWithObject: true
  });
  const buckets = new Map<string, { rgb: [number, number, number]; population: number }>();
  for (let index = 0; index < data.length; index += info.channels) {
    const red = Math.round(data[index] / 32) * 32;
    const green = Math.round(data[index + 1] / 32) * 32;
    const blue = Math.round(data[index + 2] / 32) * 32;
    const key = `${red}-${green}-${blue}`;
    const current = buckets.get(key);
    if (current) {
      current.population += 1;
    } else {
      buckets.set(key, {
        rgb: [Math.min(red, 255), Math.min(green, 255), Math.min(blue, 255)],
        population: 1
      });
    }
  }

  return [...buckets.values()]
    .sort((left, right) => right.population - left.population)
    .slice(0, colorCount)
    .map((entry) => ({
      rgb: entry.rgb,
      hex: rgbToHex(entry.rgb[0], entry.rgb[1], entry.rgb[2]),
      population: entry.population
    }));
};
