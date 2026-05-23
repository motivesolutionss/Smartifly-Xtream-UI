import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve("dist");
const tizenProjectDir = resolve("SmartiflySamsungTV");
const distAssetsDir = resolve(distDir, "assets");
const projectAssetsDir = resolve(tizenProjectDir, "assets");

if (!existsSync(distDir)) {
  console.error("[sync-tizen-project] dist/ was not found. Run the Vite build first.");
  process.exit(1);
}

if (!existsSync(tizenProjectDir)) {
  console.error("[sync-tizen-project] SmartiflySamsungTV/ was not found.");
  process.exit(1);
}

const copyFiles = [
  "favicon.svg",
  "icons.svg",
  "loginscreen_image.png",
  "smartifly_icon.png",
];

const rawIndexHtml = await readFile(resolve(distDir, "index.html"), "utf8");
const syncedIndexHtml = rawIndexHtml
  .replace('href="/favicon.svg"', 'href="favicon.svg"')
  .replace(/src="\/assets\//g, 'src="assets/')
  .replace(/href="\/assets\//g, 'href="assets/');

await rm(projectAssetsDir, { recursive: true, force: true });
await mkdir(projectAssetsDir, { recursive: true });
await cp(distAssetsDir, projectAssetsDir, { recursive: true });

for (const file of copyFiles) {
  const sourcePath = resolve(distDir, file);
  if (!existsSync(sourcePath)) {
    continue;
  }

  await cp(sourcePath, resolve(tizenProjectDir, file));
}

await writeFile(resolve(tizenProjectDir, "index.html"), syncedIndexHtml, "utf8");

console.log("[sync-tizen-project] Synced latest Vite build into SmartiflySamsungTV/");
