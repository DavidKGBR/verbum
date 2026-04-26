import puppeteer from "puppeteer";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dir, "..", "public");
const svgContent = readFileSync(join(publicDir, "verbum-icon.svg"), "utf-8");

const sizes = [
  { name: "pwa-192.png", size: 192 },
  { name: "pwa-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

const html = (size) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{width:${size}px;height:${size}px;background:#2c1810;display:flex;align-items:center;justify-content:center;}
  svg{width:${Math.round(size * 0.72)}px;height:${Math.round(size * 0.72)}px;}
</style>
</head>
<body>${svgContent}</body>
</html>`;

const browser = await puppeteer.launch({ args: ["--no-sandbox"] });

for (const { name, size } of sizes) {
  const page = await browser.newPage();
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(html(size), { waitUntil: "networkidle0" });
  const buf = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: size, height: size } });
  writeFileSync(join(publicDir, name), buf);
  console.log(`✓ ${name} (${size}x${size})`);
  await page.close();
}

await browser.close();
console.log("Icons generated.");
