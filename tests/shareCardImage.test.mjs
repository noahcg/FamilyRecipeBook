import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { ImageResponse } from "next/og.js";
import sharp from "sharp";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/shareCardImage.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const exports = {};
Function("require", "exports", code)(createRequire(import.meta.url), exports);
const { shareCardImageDataUrl } = exports;

test("uploaded WebP backgrounds render as pixels in social cards", async () => {
  const webp = await sharp({ create: { width: 50, height: 50, channels: 3, background: "#ff0000" } }).webp().toBuffer();
  const src = await shareCardImageDataUrl(new Blob([webp], { type: "image/webp" }));
  assert.match(src, /^data:image\/png;base64,/);
  const element = React.createElement("div", { style: { display: "flex", width: "100%", height: "100%", backgroundColor: "#00ff00" } },
    React.createElement("img", { src, width: 50, height: 50 }));
  const response = new ImageResponse(element, { width: 50, height: 50 });
  const pixels = await sharp(Buffer.from(await response.arrayBuffer())).removeAlpha().raw().toBuffer();
  assert.ok(pixels[0] > 240 && pixels[1] < 15 && pixels[2] < 15, `Expected red background, got ${pixels.subarray(0, 3)}`);
});

test("unsupported and corrupt WebP images fall back safely", async () => {
  assert.equal(await shareCardImageDataUrl(new Blob(["bad"], { type: "image/webp" })), null);
  assert.equal(await shareCardImageDataUrl(new Blob(["bad"], { type: "image/svg+xml" })), null);
  const jpeg = await sharp({ create: { width: 1, height: 1, channels: 3, background: "red" } }).jpeg().toBuffer();
  assert.match(await shareCardImageDataUrl(new Blob([jpeg], { type: "image/jpeg" })), /^data:image\/jpeg;base64,/);
});

test("invitation card fades the dark overlay across a bright full-size photo", async () => {
  const routeSource = await readFile(new URL("../src/app/invite/link/[token]/card/route.tsx", import.meta.url), "utf8");
  const routeCode = ts.transpileModule(routeSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const routeExports = {};
  const styleSource = await readFile(new URL("../src/lib/shareCardStyle.ts", import.meta.url), "utf8");
  const styleCode = ts.transpileModule(styleSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const styleExports = {};
  Function("exports", styleCode)(styleExports);
  const photo = await sharp({ create: { width: 1200, height: 630, channels: 3, background: "white" } }).png().toBuffer();
  const require = createRequire(import.meta.url);
  Function("require", "exports", routeCode)((name) => {
    if (name === "@/lib/shareCard") return { getInvitationShareCard: async () => ({ title: "A Family Cookbook", photo: { kind: "storage", path: "test" }, credit: null }) };
    if (name === "@/lib/supabase/service") return { createServiceClient: () => ({ storage: { from: () => ({ download: async () => ({ data: new Blob([photo], { type: "image/png" }) }) }) } }) };
    if (name === "@/lib/shareCardImage") return { shareCardImageDataUrl };
    if (name === "@/lib/shareCardStyle") return styleExports;
    return require(name);
  }, routeExports);
  const response = await routeExports.GET(new Request("https://example.test/invite/link/token/card"), { params: Promise.resolve({ token: "token" }) });
  const { data, info } = await sharp(Buffer.from(await response.arrayBuffer())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixel = (x, y) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)];
  const left = pixel(20, 20);
  const middle = pixel(850, 20);
  const right = pixel(1190, 20);
  assert.ok(left.every((channel) => channel < 75), `Expected dark title background: ${left}`);
  assert.ok(middle[0] > left[0] + 50 && middle[0] < 200, `Expected a gradual fade: ${middle}`);
  assert.ok(right.every((channel) => channel > 245), `Expected the photo visible on the right: ${right}`);
});
