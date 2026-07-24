import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttractionMediaService } from "../src/services/attractionMedia.js";

const storageDirs = [];

function storageDir() {
  const path = mkdtempSync(join(tmpdir(), "nuogo-media-"));
  storageDirs.push(path);
  return path;
}

function repositoryFor(overrides = {}) {
  const image = {
    id: "image-1",
    attractionId: "approved-1",
    sourceUrl: "https://p1-q.mafengwo.net/huangshan.jpeg",
    sourceProvider: "mafengwo",
    attribution: "Source image: Mafengwo",
    localPath: null,
    ...overrides
  };
  return {
    image,
    findApprovedImage: vi.fn(() => image),
    setImageLocalPath: vi.fn((_id, localPath) => {
      image.localPath = localPath;
    })
  };
}

afterEach(() => {
  for (const path of storageDirs.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

describe("attraction image hydration", () => {
  it("returns the approved source immediately and hydrates one local JPEG", async () => {
    const repository = repositoryFor();
    const fetchImpl = vi.fn(async () => new Response(
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      { status: 200, headers: { "content-type": "image/jpeg" } }
    ));
    const service = new AttractionMediaService({
      repository,
      storageDir: storageDir(),
      fetchImpl
    });

    expect(service.getMedia("approved-1")).toMatchObject({
      state: "remote",
      sourceUrl: repository.image.sourceUrl
    });
    await Promise.all([
      service.hydrate("approved-1"),
      service.hydrate("approved-1")
    ]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(repository.setImageLocalPath).toHaveBeenCalledTimes(1);
    expect(existsSync(join(service.storageDir, repository.image.localPath))).toBe(true);
    expect(readFileSync(join(service.storageDir, repository.image.localPath)))
      .toEqual(Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    expect(service.getMedia("approved-1")).toMatchObject({
      state: "cached",
      contentType: "image/jpeg"
    });
  });

  it("rejects unapproved hosts, invalid MIME types, and oversized files", async () => {
    const unsafe = repositoryFor({
      sourceUrl: "https://example.com/not-approved.jpeg"
    });
    const unsafeFetch = vi.fn();
    const unsafeService = new AttractionMediaService({
      repository: unsafe,
      storageDir: storageDir(),
      fetchImpl: unsafeFetch
    });
    await expect(unsafeService.hydrate("approved-1")).rejects.toThrow(/host/i);
    expect(unsafeFetch).not.toHaveBeenCalled();

    const wrongTypeService = new AttractionMediaService({
      repository: repositoryFor(),
      storageDir: storageDir(),
      fetchImpl: async () => new Response("<html></html>", {
        status: 200,
        headers: { "content-type": "text/html" }
      })
    });
    await expect(wrongTypeService.hydrate("approved-1"))
      .rejects.toThrow(/content type/i);

    const oversizedService = new AttractionMediaService({
      repository: repositoryFor(),
      storageDir: storageDir(),
      maxBytes: 3,
      fetchImpl: async () => new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { "content-type": "image/png" }
      })
    });
    await expect(oversizedService.hydrate("approved-1"))
      .rejects.toThrow(/8 MiB|size limit/i);
  });

  it("validates every redirect target before contacting it", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { location: "http://127.0.0.1/internal-image" }
    }));
    const service = new AttractionMediaService({
      repository: repositoryFor(),
      storageDir: storageDir(),
      fetchImpl
    });

    await expect(service.hydrate("approved-1")).rejects.toThrow(/host|redirect/i);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not serve a cached path outside the configured storage directory", () => {
    const root = storageDir();
    const repository = repositoryFor({ localPath: "../outside.jpeg" });
    writeFileSync(join(root, "inside.jpeg"), "safe");
    const service = new AttractionMediaService({
      repository,
      storageDir: root,
      fetchImpl: vi.fn()
    });

    expect(() => service.getMedia("approved-1")).toThrow(/cache path/i);
  });

  it("returns undefined when the attraction has no approved image", () => {
    const service = new AttractionMediaService({
      repository: { findApprovedImage: () => undefined },
      storageDir: storageDir(),
      fetchImpl: vi.fn()
    });

    expect(service.getMedia("missing")).toBeUndefined();
  });
});
