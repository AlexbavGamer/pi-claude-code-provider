import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { extractPastedImages } from "../../src/pasted-images.ts";

test("replaces pasted clipboard paths with numbered placeholders and attaches the files", async () => {
    const first = join(tmpdir(), "pi-clipboard-8f4d1889-bc3f-4059-8ef4-7457b99ab696.png");
    const second = join(tmpdir(), "pi-clipboard-11111111-2222-3333-4444-555555555555.png");
    await writeFile(first, "one");
    await writeFile(second, "two");
    try {
        const result = await extractPastedImages(`${first} compare with ${second}`, 3);
        assert.equal(result.text, "[image #3] compare with [image #4]");
        assert.equal(result.next, 5);
        assert.deepEqual(result.images.map((image) => image.data), [Buffer.from("one").toString("base64"), Buffer.from("two").toString("base64")]);
        assert.equal(result.images[0].mimeType, "image/png");
    } finally {
        await rm(first, { force: true });
        await rm(second, { force: true });
    }
});

test("leaves other paths and missing files untouched", async () => {
    const outside = join(tmpdir(), "nested", "pi-clipboard-8f4d1889-bc3f-4059-8ef4-7457b99ab696.png");
    const missing = join(tmpdir(), "pi-clipboard-00000000-0000-0000-0000-000000000000.png");
    for (const text of [`look at ${outside}`, `look at ${missing}`, "no image here"]) {
        const result = await extractPastedImages(text, 1);
        assert.equal(result.text, text);
        assert.deepEqual(result.images, []);
        assert.equal(result.next, 1);
    }
});
