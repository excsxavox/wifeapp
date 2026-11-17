/**
 * Cuts the adult sticker sheet into the same mood set as the chibi avatars.
 * The sheet is packed tightly, so rows are split on the empty and low bands
 * measured from this file, and columns are split on the gaps between figures.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { crop, decodePng, encodePng, square } from './slice-avatar-sheet.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'assets', 'avatars', 'source', 'adult-sheet.png');

const ROWS = [
  [1, 135],
  [137, 339],
  [344, 476],
  [480, 677],
];

function columns(image, y0, y1, minGap = 3) {
  const counts = new Uint16Array(image.width);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.pixels[(y * image.width + x) * 4 + 3] > 24) counts[x] += 1;
    }
  }
  const found = [];
  let start = -1;
  for (let x = 0; x < image.width; x += 1) {
    if (counts[x] > minGap) {
      if (start < 0) start = x;
    } else if (start >= 0) {
      found.push([start, x - 1]);
      start = -1;
    }
  }
  if (start >= 0) found.push([start, image.width - 1]);
  return found;
}

/** Busts touch at the shoulders, so columns come from the gap between heads. */
function busts(image, headTop, headBottom, fullTop, fullBottom) {
  const upper = columns(image, headTop, headBottom, 0);
  return upper.map(([x0, x1]) => {
    let top = fullBottom;
    let bottom = fullTop;
    let left = x1;
    let right = x0;
    for (let y = fullTop; y <= fullBottom; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if (image.pixels[(y * image.width + x) * 4 + 3] > 24) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
          left = Math.min(left, x);
          right = Math.max(right, x);
        }
      }
    }
    if (right < left) return [x0, fullTop, x1, fullBottom];
    return [left, top, right, bottom];
  });
}

function rowCells(image, y0, y1) {
  return columns(image, y0, y1, 2).map(([x0, x1]) => [x0, y0, x1, y1]);
}

/** The last boy body cell holds the lying pose and the seated pose. */
function boyBodies(image) {
  const cells = rowCells(image, 480, 677);
  const last = cells[cells.length - 1];
  if (!last) return cells;
  const [x0, y0, x1, y1] = last;
  if (x1 - x0 < 220) return cells;
  const split = 886;
  return [...cells.slice(0, -1), [x0, y0, split - 1, y1], [split, y0, x1, y1]];
}

function cellsOf(image) {
  return [
    busts(image, 8, 100, 1, 135),
    rowCells(image, ROWS[1][0], ROWS[1][1]),
    busts(image, 356, 440, 344, 476),
    boyBodies(image),
  ];
}

const LIBRARY = {
  girl_adult: {
    'emotions/happy': [0, 1],
    'emotions/uneasy': [0, 2],
    'emotions/annoyed': [0, 3],
    'emotions/angry': [0, 4],
    'emotions/furious': [0, 5],
    'emotions/think': [0, 6],
    'blink/eyes-closed': [0, 7],
    'idle/face': [0, 0],
    'idle/front': [1, 0],
    'idle/crossed': [1, 1],
    'idle/lookback': [1, 2],
    'idle/side': [1, 3],
    'running/crouch': [1, 4],
    'idle/lie': [1, 5],
    'talking/peace': [1, 6],
    'talking/heart': [1, 7],
  },
  boy_adult: {
    'emotions/happy': [2, 1],
    'emotions/uneasy': [2, 5],
    'emotions/annoyed': [2, 2],
    'emotions/angry': [2, 3],
    'emotions/furious': [2, 4],
    'emotions/shock': [2, 6],
    'emotions/shy': [2, 7],
    'idle/face': [2, 0],
    'idle/front': [3, 0],
    'idle/crossed': [3, 1],
    'idle/head': [3, 2],
    'idle/side': [3, 3],
    'idle/pockets': [3, 4],
    'running/crouch': [3, 5],
    'idle/lie': [3, 6],
    'idle/sit': [3, 7],
  },
};

const BUBBLE = {
  esposa: 'girl_adult',
  esposo: 'boy_adult',
};

function publish() {
  const image = decodePng(source);
  const rows = cellsOf(image);
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
  const written = new Map();

  for (const [character, files] of Object.entries(LIBRARY)) {
    for (const [relative, [row, column]] of Object.entries(files)) {
      const cell = rows[row]?.[column];
      if (!cell) {
        throw new Error(`Missing adult cell ${row}-${column} for ${character}/${relative}`);
      }
      const [x0, y0, x1, y1] = cell;
      const frame = square(crop(image, x0, y0, x1, y1, 2));
      const png = encodePng(frame.width, frame.height, frame.pixels);
      const dest = path.join(avatarsDir, character, `${relative}.png`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, png);
      written.set(`${character}/${relative}`, png);
    }
  }

  for (const [role, character] of Object.entries(BUBBLE)) {
    const closed = written.get(`${character}/blink/eyes-closed`);
    for (const mood of ['happy', 'uneasy', 'annoyed', 'angry', 'furious']) {
      const png = written.get(`${character}/emotions/${mood}`);
      const blink = closed ?? png;
      fs.writeFileSync(path.join(drawableDir, `companion_adult_${role}_${mood}.png`), png);
      fs.writeFileSync(path.join(drawableDir, `companion_adult_${role}_${mood}_blink.png`), blink);
    }
  }

  console.log(
    `published ${written.size} adult frames; rows ${rows.map((row) => row.length).join(',')}`
  );
}

publish();
