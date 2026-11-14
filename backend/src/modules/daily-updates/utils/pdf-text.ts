import { inflateSync } from 'zlib';

/**
 * Minimal, dependency-free text extraction for simple, text-based PDFs such
 * as office "Save as PDF" / "Print to PDF" output. Supports single-byte fonts
 * (WinAnsi) and Type0/Identity-H fonts with ToUnicode maps. Scanned
 * (image-only) PDFs yield no text. Never executes or renders anything.
 */

export interface PdfTextItem {
  /** Left edge of the text run, in page units. */
  x: number;
  /** Baseline, normalised so that a larger value is higher on the page. */
  y: number;
  text: string;
  /** Effective font size in page units (used to merge word fragments). */
  size: number;
}

const MAX_INFLATED_BYTES = 8 * 1024 * 1024;
const MAX_STREAMS = 200;

interface PdfObject {
  dict: string;
  streamStart?: number;
  streamEnd?: number;
}

interface FontInfo {
  /** Bytes per character code (2 for Identity-H). */
  codeLength: 1 | 2;
  toUnicode: Map<number, string> | null;
}

function decodeLiteralBytes(raw: string): string {
  return raw.replace(/\\(\r?\n|[nrtbf()\\]|[0-7]{1,3})/g, (_, escape: string) => {
    if (/^[0-7]+$/.test(escape)) return String.fromCharCode(parseInt(escape, 8) & 0xff);
    if (escape.startsWith('\r') || escape.startsWith('\n')) return '';
    return ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' } as Record<string, string>)[escape];
  });
}

function hexBytes(raw: string): string {
  const hex = raw.replace(/[^0-9a-f]/gi, '');
  let out = '';
  for (let index = 0; index < hex.length; index += 2) out += String.fromCharCode(parseInt(hex.slice(index, index + 2).padEnd(2, '0'), 16));
  return out;
}

function utf16beHex(hex: string): string {
  const clean = hex.replace(/[^0-9a-f]/gi, '');
  let out = '';
  for (let index = 0; index + 3 < clean.length; index += 4) out += String.fromCharCode(parseInt(clean.slice(index, index + 4), 16));
  return out;
}

/** Parses bfchar/bfrange entries of a ToUnicode CMap. */
export function parseToUnicodeCMap(cmap: string): { codeLength: 1 | 2; map: Map<number, string> } {
  const map = new Map<number, string>();
  const codespace = cmap.match(/begincodespacerange\s*<([0-9a-f]+)>/i);
  const codeLength: 1 | 2 = codespace && codespace[1].length <= 2 ? 1 : 2;
  for (const block of cmap.match(/beginbfchar([\s\S]*?)endbfchar/gi) ?? []) {
    for (const entry of block.matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]*)>/gi)) map.set(parseInt(entry[1], 16), utf16beHex(entry[2]));
  }
  for (const block of cmap.match(/beginbfrange([\s\S]*?)endbfrange/gi) ?? []) {
    for (const entry of block.matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]+)>\s*(<[0-9a-f]+>|\[[^\]]*\])/gi)) {
      const low = parseInt(entry[1], 16);
      const high = parseInt(entry[2], 16);
      if (high < low || high - low > 0xffff) continue;
      if (entry[3].startsWith('[')) {
        const targets = [...entry[3].matchAll(/<([0-9a-f]*)>/gi)].map((target) => utf16beHex(target[1]));
        targets.forEach((target, offset) => map.set(low + offset, target));
      } else {
        const start = parseInt(entry[3].slice(1, -1), 16);
        for (let code = low; code <= high; code += 1) map.set(code, String.fromCharCode(start + (code - low)));
      }
    }
  }
  return { codeLength, map };
}

export class PdfDocument {
  private readonly source: string;
  private readonly offsets = new Map<number, number>();
  private inflated = 0;

  constructor(private readonly pdf: Buffer) {
    this.source = pdf.toString('latin1');
    this.readXrefTables();
  }

  get hasXref() {
    return this.offsets.size > 0;
  }

  /** Classic (uncompressed) cross-reference tables, following /Prev links. */
  private readXrefTables() {
    const startxref = this.source.lastIndexOf('startxref');
    if (startxref < 0) return;
    let position = Number(this.source.slice(startxref + 9, startxref + 40).trim().split(/\s+/)[0]);
    const seen = new Set<number>();
    while (Number.isFinite(position) && position > 0 && !seen.has(position) && this.source.startsWith('xref', position)) {
      seen.add(position);
      const trailerAt = this.source.indexOf('trailer', position);
      if (trailerAt < 0) return;
      const lines = this.source.slice(position + 4, trailerAt).trim().split(/\r?\n|\r/);
      let index = 0;
      while (index < lines.length) {
        const [first, count] = lines[index].trim().split(/\s+/).map(Number);
        index += 1;
        for (let entry = 0; entry < count && index < lines.length; entry += 1, index += 1) {
          const [offset, , type] = lines[index].trim().split(/\s+/);
          if (type === 'n' && !this.offsets.has(first + entry)) this.offsets.set(first + entry, Number(offset));
        }
      }
      const prev = this.source.slice(trailerAt, trailerAt + 2000).match(/\/Prev\s+(\d+)/);
      position = prev ? Number(prev[1]) : NaN;
    }
  }

  trailer(): string {
    const at = this.source.lastIndexOf('trailer');
    return at < 0 ? '' : this.source.slice(at, at + 2000);
  }

  object(num: number): PdfObject | null {
    const offset = this.offsets.get(num);
    if (offset === undefined) return null;
    const header = this.source.slice(offset, offset + 40).match(/^\s*(\d+)\s+\d+\s+obj/);
    if (!header || Number(header[1]) !== num) return null;
    const bodyStart = offset + header[0].length;
    const end = this.source.indexOf('endobj', bodyStart);
    const streamMatch = /\bstream\r?\n/.exec(this.source.slice(bodyStart, end < 0 ? undefined : end));
    if (!streamMatch) return { dict: this.source.slice(bodyStart, end) };
    const streamStart = bodyStart + streamMatch.index + streamMatch[0].length;
    const dict = this.source.slice(bodyStart, bodyStart + streamMatch.index);
    const length = dict.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/);
    const streamEnd = length ? streamStart + Number(length[1]) : this.source.indexOf('endstream', streamStart);
    return { dict, streamStart, streamEnd };
  }

  /** Stream data (FlateDecode or unfiltered), or null if unsupported/too large. */
  streamData(object: PdfObject): string | null {
    if (object.streamStart === undefined || object.streamEnd === undefined) return null;
    const raw = this.pdf.subarray(object.streamStart, object.streamEnd);
    const filterArray = object.dict.match(/\/Filter\s*\[([^\]]*)\]/);
    const filterName = object.dict.match(/\/Filter\s*\/(\w+)/);
    const filters = filterArray ? filterArray[1].match(/\/\w+/g) ?? [] : filterName ? [`/${filterName[1]}`] : [];
    if (filters.length > 1 || (filters.length === 1 && filters[0] !== '/FlateDecode')) return null;
    try {
      const data = filters.length ? inflateSync(raw, { maxOutputLength: MAX_INFLATED_BYTES }) : raw;
      this.inflated += data.length;
      if (this.inflated > MAX_INFLATED_BYTES * 2) return null;
      return data.toString('latin1');
    } catch {
      return null;
    }
  }

  /** Resolves "N 0 R" to that object's dictionary, or returns inline text unchanged. */
  resolve(value: string): string {
    const ref = value.trim().match(/^(\d+)\s+\d+\s+R/);
    return ref ? this.object(Number(ref[1]))?.dict ?? '' : value;
  }

  /** Page objects in document order (walking /Pages /Kids from the catalog). */
  pages(): PdfObject[] {
    const root = this.trailer().match(/\/Root\s+(\d+)\s+\d+\s+R/);
    const catalog = root ? this.object(Number(root[1])) : null;
    const pagesRef = catalog?.dict.match(/\/Pages\s+(\d+)\s+\d+\s+R/);
    const result: PdfObject[] = [];
    const visit = (num: number, depth: number) => {
      if (depth > 10 || result.length > 50) return;
      const node = this.object(num);
      if (!node) return;
      if (/\/Type\s*\/Page\b/.test(node.dict)) {
        result.push(node);
        return;
      }
      const kids = node.dict.match(/\/Kids\s*\[([^\]]*)\]/);
      for (const kid of kids?.[1].matchAll(/(\d+)\s+\d+\s+R/g) ?? []) visit(Number(kid[1]), depth + 1);
    };
    if (pagesRef) visit(Number(pagesRef[1]), 0);
    return result;
  }

  fontsFor(page: PdfObject): Map<string, FontInfo> {
    const fonts = new Map<string, FontInfo>();
    const resources = this.dictValue(page.dict, 'Resources');
    const fontDict = resources ? this.dictValue(resources, 'Font') : null;
    if (!fontDict) return fonts;
    for (const entry of fontDict.matchAll(/\/([^\s/<>\[\]()]+)\s+(\d+)\s+\d+\s+R/g)) {
      const font = this.object(Number(entry[2]));
      if (!font) continue;
      const toUnicodeRef = font.dict.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/);
      const cmapObject = toUnicodeRef ? this.object(Number(toUnicodeRef[1])) : null;
      const cmapText = cmapObject ? this.streamData(cmapObject) : null;
      if (cmapText) {
        const parsed = parseToUnicodeCMap(cmapText);
        fonts.set(entry[1], { codeLength: /Identity-H|Identity-V/.test(font.dict) ? 2 : parsed.codeLength, toUnicode: parsed.map });
      } else {
        fonts.set(entry[1], { codeLength: /\/Type0/.test(font.dict) ? 2 : 1, toUnicode: null });
      }
    }
    return fonts;
  }

  contentsOf(page: PdfObject): string {
    const contents = page.dict.match(/\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/);
    if (!contents) return '';
    return [...contents[1].matchAll(/(\d+)\s+\d+\s+R/g)]
      .map((ref) => this.object(Number(ref[1])))
      .map((object) => (object ? this.streamData(object) ?? '' : ''))
      .join('\n');
  }

  /** Value of /Key in a dictionary: an inline << … >> dictionary or a resolved reference. */
  private dictValue(dict: string, key: string): string | null {
    const at = dict.search(new RegExp(`/${key}\\b`));
    if (at < 0) return null;
    const rest = dict.slice(at + key.length + 1).trimStart();
    if (rest.startsWith('<<')) {
      let depth = 0;
      for (let index = 0; index < rest.length - 1; index += 1) {
        if (rest.startsWith('<<', index)) {
          depth += 1;
          index += 1;
        } else if (rest.startsWith('>>', index)) {
          depth -= 1;
          index += 1;
          if (depth === 0) return rest.slice(0, index + 1);
        }
      }
      return null;
    }
    const ref = rest.match(/^(\d+)\s+\d+\s+R/);
    return ref ? this.resolve(ref[0]) : null;
  }

  /** Fallback when there is no classic xref (e.g. compressed object streams): every content-like stream. */
  looseContentStreams(): string[] {
    const streams: string[] = [];
    const pattern = /stream\r?\n/g;
    let match: RegExpExecArray | null;
    let inspected = 0;
    while ((match = pattern.exec(this.source)) && inspected < MAX_STREAMS) {
      inspected += 1;
      const dict = this.source.slice(this.source.lastIndexOf('<<', match.index), match.index);
      if (/\/(ObjStm|XRef|XObject|Image)\b|\/Length[123]\b|\/Subtype\s*\/(Image|Type1C|CIDFontType0C|OpenType)/.test(dict)) continue;
      const start = match.index + match[0].length;
      const end = this.source.indexOf('endstream', start);
      if (end < 0) break;
      const data = this.streamData({ dict, streamStart: start, streamEnd: end });
      if (data && /T[jJ]/.test(data)) streams.push(data);
    }
    return streams;
  }
}

const STRING = String.raw`\((?:\\[\s\S]|[^\\)])*\)|<[0-9A-Fa-f\s]*>`;
const NUMBER = String.raw`-?\d*\.?\d+`;
const TOKEN = new RegExp(
  [
    String.raw`\[((?:\s*(?:${STRING}|${NUMBER}))*)\s*\]\s*TJ`,
    String.raw`(${STRING})\s*(?:Tj|')`,
    String.raw`((?:${NUMBER}\s+){5}${NUMBER})\s+Tm`,
    String.raw`(${NUMBER})\s+(${NUMBER})\s+T[dD]`,
    String.raw`/([^\s/<>\[\]()]+)\s+(${NUMBER})\s+Tf`,
    String.raw`\bBT\b`,
    String.raw`\bT\*`,
  ].join('|'),
  'g',
);

function decodeString(token: string, font: FontInfo | undefined): string {
  const bytes = token.startsWith('(') ? decodeLiteralBytes(token.slice(1, -1)) : hexBytes(token.slice(1, -1));
  if (!font?.toUnicode) return font?.codeLength === 2 ? '' : bytes;
  let out = '';
  for (let index = 0; index + font.codeLength <= bytes.length; index += font.codeLength) {
    const code = font.codeLength === 2 ? (bytes.charCodeAt(index) << 8) | bytes.charCodeAt(index + 1) : bytes.charCodeAt(index);
    out += font.toUnicode.get(code) ?? '';
  }
  return out;
}

/** Text runs of one content stream. */
function textRuns(content: string, fonts: Map<string, FontInfo>): PdfTextItem[] {
  const runs: PdfTextItem[] = [];
  let line = [1, 0, 0, 1, 0, 0];
  let fontName = '';
  let fontSize = 0;
  TOKEN.lastIndex = 0;
  let token: RegExpExecArray | null;
  while ((token = TOKEN.exec(content))) {
    if (token[0] === 'BT') {
      line = [1, 0, 0, 1, 0, 0];
    } else if (token[0] === 'T*') {
      line = [line[0], line[1], line[2], line[3], line[4] - fontSize * line[2], line[5] - fontSize * line[3]];
    } else if (token[3] !== undefined) {
      line = token[3].trim().split(/\s+/).map(Number);
    } else if (token[4] !== undefined) {
      const tx = Number(token[4]);
      const ty = Number(token[5]);
      line = [line[0], line[1], line[2], line[3], line[4] + tx * line[0] + ty * line[2], line[5] + tx * line[1] + ty * line[3]];
    } else if (token[6] !== undefined) {
      fontName = token[6];
      fontSize = Number(token[7]);
    } else {
      const font = fonts.get(fontName);
      const raw = token[1] !== undefined ? token[1] : token[2];
      const text = (raw.match(new RegExp(STRING, 'g')) ?? []).map((part) => decodeString(part, font)).join('');
      if (!text.trim()) continue;
      const flipped = line[3] < 0;
      runs.push({
        x: line[4],
        // Normalise so that "higher on the page" is always a larger y.
        y: flipped ? -line[5] : line[5],
        text: text.replace(/\s+/g, ' '),
        size: Math.abs(fontSize * (line[3] || 1)) || 1,
      });
    }
  }
  return runs;
}

function cleanRuns(runs: PdfTextItem[]): PdfTextItem[] {
  return runs.map((run) => ({ ...run, text: run.text.trim() })).filter((run) => run.text);
}

/**
 * Positioned text runs per page, in page order (each run is one positioned
 * string, which office software emits per table cell). Pages without
 * extractable text (e.g. scans) are omitted.
 */
export function extractPdfText(pdf: Buffer): PdfTextItem[][] {
  const document = new PdfDocument(pdf);
  const pages: PdfTextItem[][] = [];
  const pageObjects = document.hasXref ? document.pages() : [];
  if (pageObjects.length) {
    for (const page of pageObjects) {
      const cells = cleanRuns(textRuns(document.contentsOf(page), document.fontsFor(page)));
      if (cells.length) pages.push(cells);
    }
    return pages;
  }
  for (const content of document.looseContentStreams()) {
    const cells = cleanRuns(textRuns(content, new Map()));
    if (cells.length) pages.push(cells);
  }
  return pages;
}
