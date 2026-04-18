import type { ImageCheck } from '../types.js';

/**
 * Chequea una imagen contra los requisitos oficiales de Google Discover:
 *  - min 1200 px de ancho
 *  - min 300.000 px en total (ancho x alto)
 *  - aspect ratio recomendado 16:9 (+- 0.5)
 *
 * Estrategia "ligera sin dependencia externa":
 *  1. HEAD request para obtener Content-Length y Content-Type (sanidad basica)
 *  2. GET con Range: bytes=0-10000 para descargar solo la cabecera del archivo
 *  3. Parsear ancho/alto directamente desde los bytes (JPEG + PNG + WEBP + GIF)
 *
 * Esto evita pulls completos de imagenes (ahorra ancho de banda en polls
 * masivos). Si algo falla, devolvemos un check parcial — nunca rompe la alerta.
 */

/** Parse width/height del header binario. Soporta JPEG, PNG, WEBP, GIF. */
function parseDimensions(buf: Uint8Array): { w?: number; h?: number } {
  if (buf.length < 24) return {};
  // PNG: 0x89 0x50 0x4E 0x47 ... IHDR chunk contiene w/h en offset 16
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    if (buf.length < 24) return {};
    const w = (buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19];
    const h = (buf[20] << 24) | (buf[21] << 16) | (buf[22] << 8) | buf[23];
    return { w, h };
  }
  // GIF87a / GIF89a: 'GIF8' header, w/h little-endian en offset 6-9
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    const w = buf[6] | (buf[7] << 8);
    const h = buf[8] | (buf[9] << 8);
    return { w, h };
  }
  // WEBP: RIFF....WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
    // VP8/VP8L/VP8X variants — just try to read from VP8X (extended) at offset 24
    // Format: VP8X 4 bytes, size 4 bytes, flags 4 bytes, canvas_w[24] canvas_h[27] minus 1
    if (buf.length >= 30 && buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x58) {
      const w = ((buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1);
      const h = ((buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1);
      return { w, h };
    }
  }
  // JPEG: FF D8 ... FF C0 o FF C2 (SOF0 / SOF2) contiene h/w en big-endian
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    let off = 2;
    while (off + 4 < buf.length) {
      if (buf[off] !== 0xFF) return {};
      const marker = buf[off + 1];
      // SOF markers: 0xC0, 0xC1, 0xC2, 0xC3, 0xC5-0xC7, 0xC9-0xCB, 0xCD-0xCF
      if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) ||
          (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
        if (off + 9 >= buf.length) return {};
        const h = (buf[off + 5] << 8) | buf[off + 6];
        const w = (buf[off + 7] << 8) | buf[off + 8];
        return { w, h };
      }
      // Segment length is at off+2, big-endian
      const segLen = (buf[off + 2] << 8) | buf[off + 3];
      if (segLen < 2) return {};
      off += 2 + segLen;
    }
  }
  return {};
}

const MIN_WIDTH = 1200;
const MIN_PIXELS = 300_000;
const TARGET_RATIO = 16 / 9; // ~1.77
const RATIO_TOLERANCE = 0.5;

export async function checkImage(url: string | undefined): Promise<ImageCheck | undefined> {
  if (!url) return undefined;
  const check: ImageCheck = {};
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      headers: { 'Range': 'bytes=0-16000', 'User-Agent': 'discover-alerts/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok && res.status !== 206) return check;
    const buf = new Uint8Array(await res.arrayBuffer());
    const { w, h } = parseDimensions(buf);
    if (w && h) {
      check.width = w;
      check.height = h;
      check.aspectRatio = +(w / h).toFixed(2);
      check.meetsWidth = w >= MIN_WIDTH;
      check.meetsPixels = (w * h) >= MIN_PIXELS;
      check.meetsRatio = Math.abs((w / h) - TARGET_RATIO) <= RATIO_TOLERANCE;
      const notes: string[] = [];
      if (!check.meetsWidth) notes.push(`ancho ${w}px < 1200px minimo`);
      if (!check.meetsPixels) notes.push(`resolucion ${(w*h).toLocaleString()} < 300.000 px minimo`);
      if (!check.meetsRatio) notes.push(`ratio ${check.aspectRatio} lejos del 16:9 (1.77)`);
      check.notes = notes.length > 0 ? notes : ['cumple requisitos tecnicos Discover'];
      const passes = check.meetsWidth && check.meetsPixels && check.meetsRatio;
      const borderline = check.meetsWidth && check.meetsPixels && !check.meetsRatio;
      check.verdict = passes ? 'apta' : borderline ? 'revisar' : 'no apta';
    }
  } catch {
    // swallow - nunca rompe la alerta
  }
  return check;
}
