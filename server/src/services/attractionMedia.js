import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const allowedTypes = new Map([
  ["image/jpeg", ".jpeg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"]
]);

const extensionTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"]
]);

function validateImageHost(value) {
  const url = new URL(value);
  const approved = url.protocol === "https:" &&
    (url.hostname === "mafengwo.net" || url.hostname.endsWith(".mafengwo.net"));
  if (!approved) {
    throw new Error("Attraction image host is not approved.");
  }
  return url;
}

async function readBoundedBody(response, maxBytes) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error("Attraction image exceeds the 8 MiB size limit.");
  }
  if (!response.body?.getReader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) {
      throw new Error("Attraction image exceeds the 8 MiB size limit.");
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Attraction image exceeds the 8 MiB size limit.");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

export class AttractionMediaService {
  constructor({
    repository,
    storageDir,
    fetchImpl = fetch,
    maxBytes = 8 * 1024 * 1024
  }) {
    this.repository = repository;
    this.storageDir = resolve(storageDir);
    this.fetchImpl = fetchImpl;
    this.maxBytes = maxBytes;
    this.inFlight = new Map();
  }

  resolveCachePath(localPath) {
    const path = resolve(this.storageDir, localPath);
    if (path !== this.storageDir && !path.startsWith(`${this.storageDir}${sep}`)) {
      throw new Error("Attraction image cache path escapes the configured storage directory.");
    }
    return path;
  }

  getMedia(attractionId) {
    const image = this.repository.findApprovedImage(attractionId);
    if (!image) return undefined;
    validateImageHost(image.sourceUrl);

    if (image.localPath) {
      const path = this.resolveCachePath(image.localPath);
      if (existsSync(path)) {
        const contentType = extensionTypes.get(extname(path).toLowerCase());
        if (!contentType) {
          throw new Error("Cached attraction image has an unsupported file extension.");
        }
        return { state: "cached", path, contentType };
      }
    }

    void this.hydrate(attractionId).catch(() => {});
    return { state: "remote", sourceUrl: image.sourceUrl };
  }

  hydrate(attractionId) {
    if (this.inFlight.has(attractionId)) {
      return this.inFlight.get(attractionId);
    }
    const operation = this.download(attractionId)
      .finally(() => this.inFlight.delete(attractionId));
    this.inFlight.set(attractionId, operation);
    return operation;
  }

  async download(attractionId) {
    const image = this.repository.findApprovedImage(attractionId);
    if (!image) {
      throw new Error("Approved attraction image was not found.");
    }
    let requestUrl = validateImageHost(image.sourceUrl);
    let response;
    for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
      response = await this.fetchImpl(requestUrl, {
        headers: {
          "User-Agent": "NuogoFYPBot/0.1 (+local academic attraction catalogue)",
          Accept: "image/jpeg,image/png,image/webp"
        },
        redirect: "manual",
        signal: AbortSignal.timeout(10_000)
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Attraction image redirect did not include a location.");
      }
      if (redirectCount === 3) {
        throw new Error("Attraction image exceeded the redirect limit.");
      }
      requestUrl = validateImageHost(new URL(location, requestUrl).href);
    }
    if (!response.ok) {
      throw new Error(`Attraction image returned ${response.status}.`);
    }

    const contentType = response.headers.get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    const extension = allowedTypes.get(contentType);
    if (!extension) {
      throw new Error("Attraction image content type is not supported.");
    }
    const bytes = await readBoundedBody(response, this.maxBytes);
    await mkdir(this.storageDir, { recursive: true });
    const localPath = `${randomUUID()}${extension}`;
    const absolutePath = this.resolveCachePath(localPath);
    await writeFile(absolutePath, bytes, { flag: "wx" });
    this.repository.setImageLocalPath(image.id, localPath);
    return { path: absolutePath, contentType };
  }
}
