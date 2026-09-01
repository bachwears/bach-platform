// Dependency-free Code128 encoder → SVG. Auto-selects code set B/C
// (long digit runs switch to C for denser bars). Scans fine on any
// keyboard-emulating reader, including the store's USB scanners.

const PATTERNS = [
  "11011001100", "11001101100", "11001100110", "10010011000", "10010001100",
  "10001001100", "10011001000", "10011000100", "10001100100", "11001001000",
  "11001000100", "11000100100", "10110011100", "10011011100", "10011001110",
  "10111001100", "10011101100", "10011100110", "11001110010", "11001011100",
  "11001001110", "11011100100", "11001110100", "11101101110", "11101001100",
  "11100101100", "11100100110", "11101100100", "11100110100", "11100110010",
  "11011011000", "11011000110", "11000110110", "10100011000", "10001011000",
  "10001000110", "10110001000", "10001101000", "10001100010", "11010001000",
  "11000101000", "11000100010", "10110111000", "10110001110", "10001101110",
  "10111011000", "10111000110", "10001110110", "11101110110", "11010001110",
  "11000101110", "11011101000", "11011100010", "11011101110", "11101011000",
  "11101000110", "11100010110", "11101101000", "11101100010", "11100011010",
  "11101111010", "11001000010", "11110001010", "10100110000", "10100001100",
  "10010110000", "10010000110", "10000101100", "10000100110", "10110010000",
  "10110000100", "10011010000", "10011000010", "10000110100", "10000110010",
  "11000010010", "11001010000", "11110111010", "11000010100", "10001111010",
  "10100111100", "10010111100", "10010011110", "10111100100", "10011110100",
  "10011110010", "11110100100", "11110010100", "11110010010", "11011011110",
  "11011110110", "11110110110", "10101111000", "10100011110", "10001011110",
  "10111101000", "10111100010", "11110101000", "11110100010", "10111011110",
  "10111101110", "11101011110", "11110101110", "11010000100", "11010010000",
  "11010011100", "1100011101011",
];
const START_B = 104;
const START_C = 105;
const CODE_B = 100;
const CODE_C = 99;
const STOP = 106;

function encode(text: string): number[] | null {
  // Values with the current code set; switch B<->C greedily on digit runs.
  const codes: number[] = [];
  let i = 0;
  let set: "B" | "C";
  const digitRun = (from: number) => {
    let n = 0;
    while (from + n < text.length && text[from + n]! >= "0" && text[from + n]! <= "9") n += 1;
    return n;
  };
  set = digitRun(0) >= 4 && digitRun(0) % 2 === 0 ? "C" : digitRun(0) === text.length && text.length >= 4 ? "C" : "B";
  codes.push(set === "C" ? START_C : START_B);
  while (i < text.length) {
    const run = digitRun(i);
    if (set === "B" && run >= 4) {
      const useable = run % 2 === 0 ? run : run - 1;
      if (useable >= 4) {
        codes.push(CODE_C);
        set = "C";
      }
    }
    if (set === "C") {
      if (run >= 2) {
        codes.push(parseInt(text.slice(i, i + 2), 10));
        i += 2;
        continue;
      }
      codes.push(CODE_B);
      set = "B";
    }
    const ch = text.charCodeAt(i);
    if (ch < 32 || ch > 126) return null; // outside code set B
    codes.push(ch - 32);
    i += 1;
  }
  let checksum = codes[0]!;
  for (let k = 1; k < codes.length; k += 1) checksum += codes[k]! * k;
  codes.push(checksum % 103);
  codes.push(STOP);
  return codes;
}

/** Render a Code128 barcode as an SVG string. Returns null for unencodable input. */
export function code128Svg(text: string, heightMm = 10): string | null {
  const codes = encode(text);
  if (!codes) return null;
  const bits = codes.map((c) => PATTERNS[c]!).join("");
  const quiet = 10; // modules of quiet zone each side
  const total = bits.length + quiet * 2;
  let x = quiet;
  let rects = "";
  let i = 0;
  while (i < bits.length) {
    if (bits[i] === "1") {
      let w = 1;
      while (i + w < bits.length && bits[i + w] === "1") w += 1;
      rects += `<rect x="${x}" y="0" width="${w}" height="100" />`;
      x += w;
      i += w;
    } else {
      x += 1;
      i += 1;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} 100" preserveAspectRatio="none" style="width:100%;height:${heightMm}mm">${rects}</svg>`;
}
