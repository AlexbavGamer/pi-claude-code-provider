import { readFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname } from "node:path";
import type { ImageContent } from "@earendil-works/pi-ai";

const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };
// Pi pastes a clipboard image as the path of a pi-clipboard-<uuid> file in the temp directory.
const PASTED_PATH = /(?:[A-Za-z]:)?[^\s"'<>|*?]*pi-clipboard-[0-9a-f-]+\.(?:png|jpe?g|gif|webp)/gi;

const same = (a: string, b: string): boolean => (process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b);

/**
 * Replace each pasted clipboard-image path with `[image #N]` and return the files
 * as image content. Only files directly in the temp directory qualify, so typing
 * some other path can never make the provider read it.
 */
export async function extractPastedImages(
  text: string,
  firstNumber: number,
): Promise<{ text: string; images: ImageContent[]; next: number }> {
  const root = await realpath(tmpdir());
  const images: ImageContent[] = [];
  let out = "";
  let last = 0;
  let next = firstNumber;
  for (const match of text.matchAll(PASTED_PATH)) {
    const path = match[0];
    try {
      if (!same(await realpath(dirname(path)), root)) continue;
      const data = (await readFile(path)).toString("base64");
      images.push({ type: "image", data, mimeType: MIME[extname(path).toLowerCase()] ?? "image/png" });
    } catch {
      continue; // gone or unreadable: leave the path as pasted
    }
    out += `${text.slice(last, match.index)}[image #${next++}]`;
    last = match.index + path.length;
  }
  return { text: out + text.slice(last), images, next };
}
