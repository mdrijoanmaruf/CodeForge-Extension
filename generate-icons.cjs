const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let k = n;
    for (let i = 0; i < 8; i++) k = (k & 1) ? (0xEDB88320 ^ (k >>> 1)) : (k >>> 1);
    table[n] = k;
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function createPNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8); ihdr.writeUInt8(2, 9);

  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const p = row + 1 + x * 3;
      const border = x === 0 || x === size - 1 || y === 0 || y === size - 1;
      raw[p]     = border ? Math.max(0, r - 30) : r;
      raw[p + 1] = border ? Math.max(0, g - 30) : g;
      raw[p + 2] = border ? Math.max(0, b - 30) : b;
    }
  }

  const centerX = Math.floor(size / 2);
  const centerY = Math.floor(size / 2);
  const scale = Math.max(1, Math.floor(size / 16));

  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const boltPixels = [
        [-3,-4],[-2,-4],[-1,-4],[0,-4],
        [0,-3],
        [0,-2],[-1,-2],[-2,-2],
        [-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
        [2,0],
        [2,1],[1,1],[0,1],
        [0,2],[0,3],[-1,3],
      ];
      const px_x = centerX + dx * scale;
      const px_y = centerY + dy * scale;
      if (px_x >= 0 && px_x < size && px_y >= 0 && px_y < size) {
        if (boltPixels.some(([bx, by]) => bx === dx && by === dy)) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const row2 = (px_y + sy) * (1 + size * 3);
              const p2 = row2 + 1 + (px_x + sx) * 3;
              raw[p2] = 255; raw[p2 + 1] = 220; raw[p2 + 2] = 50;
            }
          }
        }
      }
    }
  }

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const R = 37, G = 99, B = 235;

[16, 48, 128].forEach(size => {
  const buf = createPNG(size, R, G, B);
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, buf);
  console.log(`Created ${file} (${buf.length} bytes)`);
});

console.log('Icons generated successfully.');
