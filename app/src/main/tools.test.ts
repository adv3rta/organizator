import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { grabPalette, sliceImage } from "./tools.js";

const tempPaths: string[] = [];

afterEach(() => {
  for (const filePath of tempPaths.splice(0)) {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
  }
});

describe("desktop tools", () => {
  it("exports square image tiles", async () => {
    const inputPath = path.join(os.tmpdir(), `adverta-tile-${Date.now()}.png`);
    const outputDir = path.join(os.tmpdir(), `adverta-tiles-${Date.now()}`);
    tempPaths.push(inputPath, outputDir);
    await sharp({
      create: {
        width: 160,
        height: 160,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    })
      .png()
      .toFile(inputPath);
    const result = await sliceImage({
      sourcePath: inputPath,
      outputDirectory: outputDir,
      tileSize: 80
    });
    expect(result.tiles).toHaveLength(4);
  });

  it("exports palette files", async () => {
    const inputPath = path.join(os.tmpdir(), `adverta-palette-${Date.now()}.png`);
    const outputDir = path.join(os.tmpdir(), `adverta-palette-out-${Date.now()}`);
    tempPaths.push(inputPath, outputDir);
    await sharp({
      create: {
        width: 40,
        height: 40,
        channels: 3,
        background: { r: 30, g: 40, b: 200 }
      }
    })
      .png()
      .toFile(inputPath);
    const result = await grabPalette({
      sourcePath: inputPath,
      colorCount: 3,
      exportDirectory: outputDir,
      exportBaseName: "palette"
    });
    expect(result.colors.length).toBeGreaterThan(0);
    expect(result.exportedFiles).toHaveLength(3);
  });
});
