import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/prepareImageUpload.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const jpeg = () => new File([new Uint8Array([255, 216, 255, 224, 1, 2, 3])], "renamed.png", { type: "image/jpeg" });
function harness({ width = 4000, height = 3000, decodeFails = false, webpSupported = true, encodeFails = false } = {}) {
  const revoked = [];
  const encodings = [];
  const drawCalls = [];
  const context = { drawImage: (...args) => drawCalls.push(args), fillRect() {} };
  const canvas = { width: 0, height: 0, getContext: () => context, toBlob(callback, type, quality) {
    encodings.push({ type, quality });
    callback(encodeFails ? null : new Blob(["encoded image"], { type: type === "image/webp" && !webpSupported ? "image/png" : type }));
  } };
  class Image { naturalWidth = width; naturalHeight = height; async decode() { if (decodeFails) throw new Error("decode"); } }
  const exports = {};
  Function("exports", "Image", "document", "URL", compiled)(exports, Image, { createElement: () => canvas }, { createObjectURL: () => "blob:test", revokeObjectURL: (url) => revoked.push(url) });
  return { prepare: exports.prepareImageUpload, canvas, encodings, drawCalls, revoked };
}

test("recipe images are decoded, reduced to 1800px, and encoded at .82 with verified extension", async () => {
  const h = harness();
  const result = await h.prepare(jpeg(), 1800);
  assert.deepEqual([h.canvas.width, h.canvas.height], [1800, 1350]);
  assert.equal(h.drawCalls.length, 1);
  assert.deepEqual(h.encodings, [{ type: "image/webp", quality: .82 }]);
  assert.equal(result.extension, "webp");
  assert.equal(result.blob.type, "image/webp");
  assert.deepEqual(h.revoked, ["blob:test"]);
});
test("avatars use 640px and smaller images retain their dimensions", async () => {
  const large = harness();
  await large.prepare(jpeg(), 640);
  assert.deepEqual([large.canvas.width, large.canvas.height], [640, 480]);
  const small = harness({ width: 320, height: 200 });
  await small.prepare(jpeg(), 1800);
  assert.deepEqual([small.canvas.width, small.canvas.height], [320, 200]);
});
test("unsupported WebP encoder falls back to JPEG with matching extension", async () => {
  const h = harness({ webpSupported: false });
  const result = await h.prepare(jpeg(), 1800);
  assert.equal(result.extension, "jpg");
  assert.equal(result.blob.type, "image/jpeg");
  assert.deepEqual(h.encodings.map(({ type }) => type), ["image/webp", "image/jpeg"]);
});
test("HEIC input is re-encoded when browser decoding supports it and clearly rejected otherwise", async () => {
  const header = new Uint8Array([0,0,0,24,102,116,121,112,104,101,105,99]);
  const file = new File([header], "photo.heic", { type: "image/heic" });
  assert.equal((await harness().prepare(file, 1800)).blob.type, "image/webp");
  const unsupported = harness({ decodeFails: true });
  await assert.rejects(unsupported.prepare(file, 1800), /cannot open this HEIC/);
  assert.deepEqual(unsupported.revoked, ["blob:test"]);
});
test("renamed nonimages, unsupported types, oversized originals and broken images fail before upload", async () => {
  const h = harness();
  await assert.rejects(h.prepare(new File(["<svg></svg>"], "image.jpg", { type: "image/jpeg" }), 1800), /not a valid image/);
  await assert.rejects(h.prepare(new File(["gif"], "image.gif", { type: "image/gif" }), 1800), /Choose a JPEG/);
  await assert.rejects(h.prepare(new File([new Uint8Array(8 * 1024 * 1024 + 1)], "image.jpg", { type: "image/jpeg" }), 1800), /8 MB/);
  const broken = harness({ decodeFails: true });
  await assert.rejects(broken.prepare(jpeg(), 1800), /could not be opened/);
  assert.deepEqual(broken.revoked, ["blob:test"]);
  const noEncoder = harness({ encodeFails: true });
  await assert.rejects(noEncoder.prepare(jpeg(), 1800), /could not prepare/);
  assert.deepEqual(noEncoder.revoked, ["blob:test"]);
});

test("storage receives encoded blobs under UUID paths with their actual MIME and extension", async () => {
  const uploadSource = await readFile(new URL("../src/lib/upload.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(uploadSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const calls = [];
  const prepared = new Blob(["prepared"], { type: "image/jpeg" });
  const exports = {};
  Function("require", "exports", "crypto", code)((name) => {
    if (name === "./prepareImageUpload") return { prepareImageUpload: async (_file, maxDimension) => { calls.push({ maxDimension }); return { blob: prepared, extension: "jpg" }; } };
    if (name === "./supabase/client") return { createClient: () => ({ storage: { from: (bucket) => ({
      upload: async (path, blob, options) => { calls.push({ bucket, path, blob, options }); return { error: null }; },
      getPublicUrl: (path) => ({ data: { publicUrl: `https://storage.test/${bucket}/${path}` } }),
    }) } }) };
    throw new Error(`Unexpected import ${name}`);
  }, exports, { randomUUID: () => "12345678-1234-1234-1234-123456789012" });
  await exports.uploadRecipeImage(jpeg(), "user-id");
  await exports.uploadAvatar(jpeg(), "user-id");
  assert.deepEqual(calls.filter((call) => call.maxDimension).map((call) => call.maxDimension), [1800, 640]);
  const uploads = calls.filter((call) => call.bucket);
  assert.deepEqual(uploads.map((call) => call.bucket), ["recipe-images", "avatars"]);
  for (const upload of uploads) {
    assert.equal(upload.path, "user-id/12345678-1234-1234-1234-123456789012.jpg");
    assert.equal(upload.blob, prepared);
    assert.deepEqual(upload.options, { upsert: false, contentType: "image/jpeg" });
  }
});
