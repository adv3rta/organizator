import fs from "node:fs";
import type { PaletteColor } from "@adverta/shared";

const writeUtf16 = (value: string): Buffer => {
  const codes = [...value].flatMap((char) => {
    const code = char.charCodeAt(0);
    return [code >> 8, code & 0xff];
  });
  return Buffer.from(codes);
};

export const exportAse = (filePath: string, colors: PaletteColor[]): void => {
  const blocks: Buffer[] = [];
  for (const color of colors) {
    const name = `${color.hex}\0`;
    const nameBuffer = writeUtf16(name);
    const body = Buffer.concat([
      Buffer.from([0x00, 0x00, (name.length >> 8) & 0xff, name.length & 0xff]),
      nameBuffer,
      Buffer.from("RGB "),
      Buffer.from(new Float32Array(color.rgb.map((value) => value / 255)).buffer),
      Buffer.from([0x00, 0x02])
    ]);
    const header = Buffer.alloc(6);
    header.writeUInt16BE(0x0001, 0);
    header.writeUInt32BE(body.length, 2);
    blocks.push(Buffer.concat([header, body]));
  }
  const fileHeader = Buffer.alloc(12);
  fileHeader.write("ASEF", 0, "ascii");
  fileHeader.writeUInt16BE(1, 4);
  fileHeader.writeUInt16BE(0, 6);
  fileHeader.writeUInt32BE(colors.length, 8);
  fs.writeFileSync(filePath, Buffer.concat([fileHeader, ...blocks]));
};
