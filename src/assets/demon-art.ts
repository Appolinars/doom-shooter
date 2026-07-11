// Own pixel art (SAD §11 OQ resolved: own pixel art, PRD §8 default). Sprites are
// authored here as char-grid matrices + a palette — self-owned, license-clean and a few
// hundred bytes each, well inside the §7 asset budget. `sprites.ts` rasterizes them.
//
// Grid chars index into `palette`; a char with no palette entry (by convention '.') is
// transparent. Keys match DEMON_TYPES[].spriteKey in core/config.ts.

export interface PixelArt {
  /** Char → CSS color. A char absent from this map is transparent. */
  readonly palette: Readonly<Record<string, string>>;
  /** Square-ish grid; every row must be the same length. */
  readonly rows: readonly string[];
}

/** Lean red imp — matches the `fast` demon color (#e5484d). */
const FAST: PixelArt = {
  palette: { r: '#e5484d', d: '#7a1518', y: '#f2d024' },
  rows: [
    '...d....d...',
    '..drd..drd..',
    '..drrddrrd..',
    '.drrrrrrrrd.',
    '.drryrryrrd.',
    '.drryrryrrd.',
    '.drrrrrrrrd.',
    '.drrddddrrd.',
    '.drrdrrdrrd.',
    '..drrrrrrd..',
    '...drrrrd...',
    '....dddd....',
  ],
};

/** Bulky green brute — matches the `brute` demon color (#30a46c), red eyes for menace. */
const BRUTE: PixelArt = {
  palette: { g: '#30a46c', d: '#125c38', e: '#e5484d' },
  rows: [
    '..d......d..',
    '..dgd..dgd..',
    '.dggggggggd.',
    'dggggggggggd',
    'dggeggggeggd',
    'dggeggggeggd',
    'dggggggggggd',
    'dggddddddggd',
    'dgggddddgggd',
    'dggggggggggd',
    '.dggggggggd.',
    '..dddddddd..',
  ],
};

/**
 * Towering purple baron — matches the `baron` demon color (#8e4ec6). Placeholder
 * grid until T-07 swaps the bundled art for the authored sprite files.
 */
const BARON: PixelArt = {
  palette: { p: '#8e4ec6', d: '#4c2373', e: '#f2d024' },
  rows: [
    '.d........d.',
    '.dpd....dpd.',
    '.dppd..dppd.',
    'dppppppppppd',
    'dpepppppepd.',
    'dpepppppepd.',
    'dppppppppppd',
    'dppdddddppd.',
    'dpppddddpppd',
    'dppppppppppd',
    '.dppppppppd.',
    '..dddddddd..',
  ],
};

export const DEMON_ART: Readonly<Record<string, PixelArt>> = {
  'demon-fast': FAST,
  'demon-brute': BRUTE,
  'demon-baron': BARON,
};
