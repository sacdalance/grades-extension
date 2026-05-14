import sharp from "sharp"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")
const svgBuf = readFileSync(resolve(root, "assets/icon.svg"))

const sizes = [16, 32, 48, 64, 128]

for (const size of sizes) {
  const outPath = resolve(root, `assets/icon${size}.png`)
  await sharp(svgBuf).resize(size, size).png().toFile(outPath)
  console.log(`Generated ${outPath}`)
}

// Also write the default icon.png at 128px (Plasmo picks this up)
await sharp(svgBuf).resize(128, 128).png().toFile(resolve(root, "assets/icon.png"))
console.log("Done.")
