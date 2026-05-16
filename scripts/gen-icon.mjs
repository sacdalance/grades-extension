import sharp from "sharp"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")
const srcBuf = readFileSync(resolve(root, "assets/l-logo-green.png"))

const sizes = [16, 32, 48, 64, 128]

for (const size of sizes) {
  const outPath = resolve(root, `assets/icon${size}.png`)
  await sharp(srcBuf).resize(size, size).png().toFile(outPath)
  console.log(`Generated ${outPath}`)
}

// Also write the default icon.png at 128px (Plasmo picks this up)
await sharp(srcBuf).resize(128, 128).png().toFile(resolve(root, "assets/icon.png"))
console.log("Done.")
