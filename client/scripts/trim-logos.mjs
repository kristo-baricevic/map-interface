import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logosDir = path.join(__dirname, "../public/assets/logos");

const skipOg = !process.argv.includes("--include-og");

async function main() {
  const names = await fs.readdir(logosDir);
  const pngs = names.filter(
    (n) =>
      n.endsWith(".png") &&
      (!skipOg || !/_og\.png$/i.test(n))
  );

  for (const name of pngs) {
    const filePath = path.join(logosDir, name);
    try {
      const meta = await sharp(filePath).metadata();
      const trimmed = await sharp(filePath)
        .trim({ threshold: 0 })
        .toBuffer();
      const after = await sharp(trimmed).metadata();
      const w0 = meta.width ?? 0;
      const h0 = meta.height ?? 0;
      const w1 = after.width ?? 0;
      const h1 = after.height ?? 0;
      if (w1 === w0 && h1 === h0) {
        console.log(`skip (no trim): ${name}`);
        continue;
      }
      await fs.writeFile(filePath, trimmed);
      console.log(`trimmed: ${name}  ${w0}×${h0} → ${w1}×${h1}`);
    } catch (err) {
      console.error(`error: ${name}`, err.message);
    }
  }
}

main();
