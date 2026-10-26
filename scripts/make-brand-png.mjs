// Minimal PNG encoder: writes RGBA pixels with zlib. Usage: node make-brand-png.mjs out.png size [variant]
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
const [, , out, sizeArg, variant = 'icon'] = process.argv
const size = Number(sizeArg)
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]) }
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t))
const bg = hex('#07080A'), surface = hex('#15181C'), ca = hex('#7CF7FF'), cb = hex('#8B7CFF'), cc = hex('#FF7CE5')
const rows = []
const cx = size / 2, cy = size / 2
const r = size * 0.5
const corner = size * 0.22
for (let y = 0; y < size; y++) {
  const row = [0]
  for (let x = 0; x < size; x++) {
    let col = bg, alpha = 255
    const inset = size * 0.26, w = size - inset * 2
    // rounded square (the phone)
    const dx = Math.max(inset - x, x - (inset + w), 0), dy = Math.max(inset - y, y - (inset + w), 0)
    const qx = Math.max(Math.abs(x - cx) - (w / 2 - corner), 0), qy = Math.max(Math.abs(y - cy) - (w / 2 - corner), 0)
    const inSquare = variant === 'favicon' ? true : Math.hypot(qx, qy) <= corner && dx === 0 && dy === 0
    if (variant === 'splash') { col = bg } else if (inSquare) col = surface
    // ion dot with soft glow
    const d = Math.hypot(x - cx, y - (cy + size * 0.06))
    const dot = size * (variant === 'favicon' ? 0.22 : 0.075)
    const t = Math.max(0, Math.min(1, (x - (cx - dot)) / (2 * dot)))
    const ion = t < 0.5 ? mix(ca, cb, t * 2) : mix(cb, cc, (t - 0.5) * 2)
    if (d <= dot) col = ion
    else if (d <= dot * 3.2) { const g = Math.pow(1 - (d - dot) / (dot * 2.2), 2) * 0.35; col = mix(col, ion, Math.max(0, g)) }
    if (variant === 'splash' && d <= dot) col = ion
    row.push(col[0], col[1], col[2], alpha)
  }
  rows.push(Buffer.from(row))
}
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))])
writeFileSync(out, png)
console.log('wrote', out, size)
