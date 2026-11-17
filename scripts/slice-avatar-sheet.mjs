/**
 * Cuts the chibi sprite sheet into one PNG per drawing.
 * Rows are separated by empty space. Columns are measured inside each row,
 * and a very wide cell is split where the drawing thins out.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(
  root,
  'assets',
  'avatars',
  'source',
  'chibi-sheet.png'
);
const previewDir = path.join(root, 'assets', 'avatars', '_cells');

function decodePng(file) {
  const buf = fs.readFileSync(file);
  let offset = 8;
  const idats = [];
  let width = 0;
  let height = 0;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    }
    if (type === 'IDAT') idats.push(data);
    if (type === 'IEND') break;
    offset += 12 + length;
  }
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  let cursor = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor];
    cursor += 1;
    const row = raw.subarray(cursor, cursor + stride);
    cursor += stride;
    for (let i = 0; i < stride; i += 1) {
      const left = i >= 4 ? pixels[y * stride + i - 4] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + i] : 0;
      const upLeft = y > 0 && i >= 4 ? pixels[(y - 1) * stride + i - 4] : 0;
      let value = row[i];
      if (filter === 1) value = (value + left) & 255;
      else if (filter === 2) value = (value + up) & 255;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const paeth = left + up - upLeft;
        const pa = Math.abs(paeth - left);
        const pb = Math.abs(paeth - up);
        const pc = Math.abs(paeth - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        value = (value + predictor) & 255;
      }
      pixels[y * stride + i] = value;
    }
  }
  return { width, height, pixels };
}

function bands(counts, min) {
  const found = [];
  let start = -1;
  for (let i = 0; i < counts.length; i += 1) {
    if (counts[i] > min) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      found.push([start, i - 1]);
      start = -1;
    }
  }
  if (start >= 0) found.push([start, counts.length - 1]);
  return found;
}

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function crop(image, x0, y0, x1, y1, pad = 2) {
  const left = Math.max(0, x0 - pad);
  const top = Math.max(0, y0 - pad);
  const right = Math.min(image.width - 1, x1 + pad);
  const bottom = Math.min(image.height - 1, y1 + pad);
  const width = right - left + 1;
  const height = bottom - top + 1;
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    image.pixels.copy(
      out,
      y * width * 4,
      ((top + y) * image.width + left) * 4,
      ((top + y) * image.width + left) * 4 + width * 4
    );
  }
  return { width, height, pixels: out };
}

function splitWide(image, x0, x1, y0, y1) {
  const width = x1 - x0 + 1;
  if (width < 96) return [[x0, x1]];
  const counts = new Uint16Array(width);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (image.pixels[(y * image.width + x) * 4 + 3] > 24) counts[x - x0] += 1;
    }
  }
  const mid0 = Math.floor(width * 0.35);
  const mid1 = Math.floor(width * 0.65);
  let best = mid0;
  let bestValue = counts[mid0];
  for (let i = mid0; i <= mid1; i += 1) {
    if (counts[i] < bestValue) {
      best = i;
      bestValue = counts[i];
    }
  }
  if (bestValue > 6) return [[x0, x1]];
  return [
    [x0, x0 + best - 1],
    [x0 + best + 1, x1],
  ];
}

export { decodePng, crop, square, encodePng };

export function sliceSheet(file) {
  const image = decodePng(file);
  const rowCounts = new Uint16Array(image.height);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.pixels[(y * image.width + x) * 4 + 3] > 20) rowCounts[y] += 1;
    }
  }
  const rowBands = bands(rowCounts, 2);
  const cells = [];
  rowBands.forEach(([y0, y1], row) => {
    const colCounts = new Uint16Array(image.width);
    for (let y = y0; y <= y1; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        if (image.pixels[(y * image.width + x) * 4 + 3] > 24) colCounts[x] += 1;
      }
    }
    let column = 0;
    for (const [x0, x1] of bands(colCounts, 1)) {
      for (const [sx0, sx1] of splitWide(image, x0, x1, y0, y1)) {
        cells.push({ row, column, x0: sx0, y0, x1: sx1, y1 });
        column += 1;
      }
    }
  });
  return { image, cells };
}

function square(frame) {
  const side = Math.max(frame.width, frame.height) + 8;
  const out = Buffer.alloc(side * side * 4);
  const ox = Math.floor((side - frame.width) / 2);
  const oy = Math.floor((side - frame.height) / 2);
  for (let y = 0; y < frame.height; y += 1) {
    frame.pixels.copy(
      out,
      ((oy + y) * side + ox) * 4,
      y * frame.width * 4,
      (y + 1) * frame.width * 4
    );
  }
  return { width: side, height: side, pixels: out };
}

/** cell key is "row-column" from the sheet, top to bottom, left to right. */
const LIBRARY = {
  girl_purple: {
    'emotions/happy': '0-0',
    'emotions/uneasy': '0-2',
    'emotions/annoyed': '0-3',
    'emotions/angry': '0-4',
    'emotions/furious': '0-5',
    'emotions/side-eye': '0-6',
    'emotions/cry': '0-7',
    'blink/eyes-closed': '0-8',
    'emotions/wink': '1-0',
    'talking/smile': '1-1',
    'idle/face': '1-2',
    'emotions/skeptical': '1-3',
    'emotions/glare': '1-4',
    'talking/shout': '1-5',
    'emotions/blush': '1-6',
    'emotions/sad': '1-7',
    'talking/soft': '1-8',
    'idle/front': '2-0',
    'idle/angle': '2-1',
    'idle/hips': '2-2',
    'walking/step': '2-3',
    'running/run': '2-4',
    'running/crouch': '2-5',
    'talking/cheer': '2-6',
    'idle/sit': '2-7',
    'idle/lie': '2-8',
    'emotions/shy': '2-9',
    'idle/sleepy': '2-10',
  },
  boy_navy: {
    'emotions/happy': '3-0',
    'emotions/wink': '3-1',
    'emotions/uneasy': '3-2',
    'emotions/annoyed': '3-3',
    'emotions/furious': '3-4',
    'emotions/shock': '3-5',
    'emotions/blush': '3-6',
    'emotions/cry': '3-7',
    'blink/eyes-closed': '3-8',
    'idle/face': '4-0',
    'talking/laugh': '4-1',
    'emotions/sweat': '4-2',
    'emotions/skeptical': '4-3',
    'emotions/angry': '4-5',
    'emotions/sad': '4-6',
    'talking/smile': '4-7',
    'blink/soft': '4-8',
    'idle/front': '5-0',
    'idle/angle': '5-1',
    'idle/hips': '5-2',
    'walking/step': '5-3',
    'running/run': '5-4',
    'running/crouch': '5-5',
    'talking/cheer': '5-6',
    'idle/sit': '5-7',
    'idle/lie': '5-8',
    'emotions/shy': '5-9',
    'idle/alert': '5-10',
  },
};

const BUBBLE = {
  esposa: {
    happy: ['girl_purple', 'emotions/happy'],
    uneasy: ['girl_purple', 'emotions/uneasy'],
    annoyed: ['girl_purple', 'emotions/annoyed'],
    angry: ['girl_purple', 'emotions/angry'],
    furious: ['girl_purple', 'emotions/furious'],
    blink: ['girl_purple', 'blink/eyes-closed'],
  },
  esposo: {
    happy: ['boy_navy', 'emotions/happy'],
    uneasy: ['boy_navy', 'emotions/uneasy'],
    annoyed: ['boy_navy', 'emotions/annoyed'],
    angry: ['boy_navy', 'emotions/angry'],
    furious: ['boy_navy', 'emotions/furious'],
    blink: ['boy_navy', 'blink/eyes-closed'],
  },
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const avatarsDir = path.join(root, 'assets', 'avatars');
  const drawableDir = path.join(
    root,
    'modules',
    'app-gate',
    'android',
    'src',
    'main',
    'res',
    'drawable-nodpi'
  );
  const { image, cells } = sliceSheet(source);
  const byKey = new Map(cells.map((cell) => [`${cell.row}-${cell.column}`, cell]));
  const written = new Map();

  for (const [character, files] of Object.entries(LIBRARY)) {
    for (const [relative, key] of Object.entries(files)) {
      const cell = byKey.get(key);
      if (!cell) throw new Error(`Missing cell ${key} for ${character}/${relative}`);
      const frame = square(crop(image, cell.x0, cell.y0, cell.x1, cell.y1, 1));
      const png = encodePng(frame.width, frame.height, frame.pixels);
      const dest = path.join(avatarsDir, character, `${relative}.png`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, png);
      written.set(`${character}/${relative}`, png);
    }
  }

  for (const [role, moods] of Object.entries(BUBBLE)) {
    const blink = written.get(`${moods.blink[0]}/${moods.blink[1]}`);
    for (const mood of ['happy', 'uneasy', 'annoyed', 'angry', 'furious']) {
      const [character, relative] = moods[mood];
      const png = written.get(`${character}/${relative}`);
      fs.writeFileSync(path.join(drawableDir, `companion_pixel_${role}_${mood}.png`), png);
      fs.writeFileSync(path.join(drawableDir, `companion_pixel_${role}_${mood}_blink.png`), blink);
    }
  }

  fs.rmSync(previewDir, { recursive: true, force: true });
  console.log(`published ${written.size} frames`);
}
