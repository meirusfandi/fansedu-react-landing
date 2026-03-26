/**
 * Bungkus public/fansedu.png ke ICO (PNG embedded, didukung Windows/macOS/Chrome).
 * Jalankan: node scripts/build-favicon.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const pngPath = join(root, 'public', 'fansedu.png')
const outPath = join(root, 'public', 'favicon.ico')

const png = readFileSync(pngPath)
const pngSize = png.length

const header = Buffer.alloc(22)
header.writeUInt16LE(0, 0) // Reserved
header.writeUInt16LE(1, 2) // Type: icon
header.writeUInt16LE(1, 4) // Count
// ICONDIRENTRY — 0,0 = 256×256 untuk PNG embedded (Vista+)
header.writeUInt8(0, 6)
header.writeUInt8(0, 7)
header.writeUInt8(0, 8)
header.writeUInt8(0, 9)
header.writeUInt16LE(1, 10)
header.writeUInt16LE(32, 12)
header.writeUInt32LE(pngSize, 14)
header.writeUInt32LE(22, 18)

writeFileSync(outPath, Buffer.concat([header, png]))
console.log('Wrote', outPath, `(${pngSize} bytes PNG + 22 byte ICO header)`)
