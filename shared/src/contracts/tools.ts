export interface ImageSlicerInput {
  sourcePath: string;
  outputDirectory: string;
  tileSize?: number;
  gridColumns?: number;
  gridRows?: number;
}

export interface GeneratedFile {
  path: string;
  label: string;
}

export interface ImageSlicerResult {
  tiles: GeneratedFile[];
  manifestPath: string;
  rows: number;
  columns: number;
}

export type WatermarkKind = "text" | "image";
export type WatermarkPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface WatermarkJobInput {
  sourcePaths: string[];
  outputDirectory: string;
  kind: WatermarkKind;
  text?: string;
  imagePath?: string;
  opacity: number;
  scale: number;
  position: WatermarkPosition;
  margin: number;
}

export interface WatermarkJobResult {
  files: GeneratedFile[];
}

export type MetadataFileKind = "mp3" | "image" | "pdf" | "unknown";

export interface MetadataCapabilities {
  kind: MetadataFileKind;
  supportsEmbeddedTags: boolean;
  supportsCoverArt: boolean;
  supportsTitle: boolean;
  supportsAuthor: boolean;
  supportsAlbum: boolean;
  supportsComment: boolean;
  supportsKeywords: boolean;
}

export interface MetadataInspection {
  path: string;
  fileName: string;
  capabilities: MetadataCapabilities;
  timestamps: {
    createdAt: string | null;
    modifiedAt: string | null;
  };
  values: {
    title?: string;
    author?: string;
    album?: string;
    comment?: string;
    keywords?: string[];
  };
}

export interface MetadataUpdateEntry {
  sourcePath: string;
  nextFileName?: string;
  timestamps?: {
    createdAt?: string | null;
    modifiedAt?: string | null;
  };
  values?: {
    title?: string;
    author?: string;
    album?: string;
    comment?: string;
    keywords?: string[];
  };
  coverImagePath?: string | null;
}

export interface MetadataUpdateResult {
  files: GeneratedFile[];
}

export interface PaletteGrabberInput {
  sourcePath: string;
  colorCount: number;
  exportDirectory?: string;
  exportBaseName?: string;
}

export interface PaletteColor {
  hex: string;
  rgb: [number, number, number];
  population: number;
}

export interface PaletteResult {
  colors: PaletteColor[];
  previewPath?: string;
  exportedFiles?: GeneratedFile[];
}
