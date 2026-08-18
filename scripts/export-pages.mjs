import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import worker from "../dist/server/index.js";

function githubPagesUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) return "http://localhost:3000";
  const [owner, repo] = repository.split("/");
  const rootSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  return `https://${owner}.github.io${rootSite ? "" : `/${repo}`}`;
}

const siteUrl = githubPagesUrl();
const renderOrigin = new URL(siteUrl).origin;
const response = await worker.fetch(
  new Request(`${renderOrigin}/`, {
    headers: {
      accept: "text/html",
      "x-wirewise-site-base": siteUrl,
    },
  }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) throw new Error(`Static render failed with ${response.status}`);

let html = await response.text();
html = html
  .replaceAll('href="/_next/', 'href="./_next/')
  .replaceAll('src="/_next/', 'src="./_next/')
  .replaceAll('href="/favicon.svg"', 'href="./favicon.svg"')
  .replaceAll('url(/_next/', 'url(./_next/');

const output = resolve("dist/client");
await mkdir(output, { recursive: true });
await Promise.all([
  writeFile(resolve(output, "index.html"), html),
  writeFile(resolve(output, "404.html"), html),
  writeFile(resolve(output, ".nojekyll"), ""),
]);

console.log(`GitHub Pages bundle created for ${siteUrl}`);
