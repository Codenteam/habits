/**
 * Unit tests for the guest-js bindings using the official Tauri test helpers.
 *
 * - `mockIPC`    intercepts every `invoke` call the same way the real backend would.
 * - `clearMocks` resets the interceptor between tests so state never leaks.
 * - `vi.spyOn(window.__TAURI_INTERNALS__, "invoke")` verifies the exact command
 *   name and payload that reach the IPC layer.
 *
 * jsdom is used as the test environment (see vitest.config.ts) so that `window`
 * is available.  A minimal WebCrypto polyfill is installed in `beforeAll` because
 * jsdom ships without one, and @tauri-apps/api needs it to generate message IDs.
 */
import { beforeAll, afterEach, describe, it, expect, vi } from "vitest";
import { randomFillSync } from "crypto";
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";
import {
  ensureTables,
  vectorInsert,
  vectorSearch,
  vectorDelete,
} from "./index.js";

// jsdom does not ship a WebCrypto implementation; @tauri-apps/api needs one.
beforeAll(() => {
  Object.defineProperty(window, "crypto", {
    value: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getRandomValues: (buffer: any) => randomFillSync(buffer),
    },
  });
});

afterEach(() => {
  clearMocks();
});

// ── helpers ───────────────────────────────────────────────────────────────────

/** Spy on the underlying IPC invoke so we can inspect command + args. */
function spyInvoke() {
  return vi.spyOn(
    (window as unknown as { __TAURI_INTERNALS__: { invoke: () => unknown } })
      .__TAURI_INTERNALS__,
    "invoke"
  );
}

// ── ensureTables ──────────────────────────────────────────────────────────────

describe("ensureTables", () => {
  it("calls the correct plugin command", async () => {
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|ensure_tables") return undefined;
    });
    const spy = spyInvoke();

    await ensureTables("my.db", "docs", 128);

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toBe("plugin:sqlite-vec|ensure_tables");
  });

  it("forwards database, collection and dim", async () => {
    mockIPC((cmd, args) => {
      if (cmd === "plugin:sqlite-vec|ensure_tables") return undefined;
      void args;
    });
    const spy = spyInvoke();

    await ensureTables("vectors.db", "embeddings", 256);

    expect(spy.mock.calls[0][1]).toMatchObject({
      database: "vectors.db",
      collection: "embeddings",
      dim: 256,
    });
  });

  it("propagates errors from the backend", async () => {
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|ensure_tables")
        throw new Error("DimMismatch");
    });

    await expect(ensureTables("x.db", "col", 3)).rejects.toThrow("DimMismatch");
  });
});

// ── vectorInsert ──────────────────────────────────────────────────────────────

describe("vectorInsert", () => {
  it("calls the correct plugin command", async () => {
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|vector_insert") return 1;
    });
    const spy = spyInvoke();

    await vectorInsert("my.db", "docs", "doc-1", [0.1, 0.2, 0.3], "{}", "t");

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toBe("plugin:sqlite-vec|vector_insert");
  });

  it("maps customId to snake_case custom_id in the payload", async () => {
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|vector_insert") return 1;
    });
    const spy = spyInvoke();

    await vectorInsert("my.db", "docs", "doc-1", [0.1, 0.2, 0.3], '{"k":"v"}', "t");

    const payload = spy.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.custom_id).toBe("doc-1");
    expect(payload).not.toHaveProperty("customId");
  });

  it("forwards all fields and returns the rowid from IPC", async () => {
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|vector_insert") return 7;
    });
    const spy = spyInvoke();

    const rowid = await vectorInsert("a.db", "col", "id-7", [1, 2], "data", "now");

    expect(spy.mock.calls[0][1]).toMatchObject({
      database: "a.db",
      collection: "col",
      custom_id: "id-7",
      vector: [1, 2],
      data: "data",
      now: "now",
    });
    expect(rowid).toBe(7);
  });

  it("propagates errors from the backend", async () => {
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|vector_insert") throw new Error("SQLite error");
    });

    await expect(vectorInsert("a.db", "col", "id", [1], "", "t")).rejects.toThrow(
      "SQLite error"
    );
  });
});

// ── vectorSearch ──────────────────────────────────────────────────────────────

describe("vectorSearch", () => {
  it("calls the correct plugin command", async () => {
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|vector_search") return [];
    });
    const spy = spyInvoke();

    await vectorSearch("my.db", "docs", [0.1, 0.2], "l2", 5);

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toBe("plugin:sqlite-vec|vector_search");
  });

  it("forwards all search parameters", async () => {
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|vector_search") return [];
    });
    const spy = spyInvoke();

    await vectorSearch("v.db", "items", [0.5, 0.5], "cosine", 10);

    expect(spy.mock.calls[0][1]).toMatchObject({
      database: "v.db",
      collection: "items",
      vector: [0.5, 0.5],
      distance: "cosine",
      limit: 10,
    });
  });

  it("returns the results resolved by the IPC handler", async () => {
    const fakeResults = [
      { rowid: 1, distance: 0.01, custom_id: "a", data: "{}", created_at: "t" },
      { rowid: 2, distance: 0.05, custom_id: "b", data: "{}", created_at: "t" },
    ];
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|vector_search") return fakeResults;
    });

    const results = await vectorSearch("x.db", "col", [1, 0], "l2", 2);
    expect(results).toEqual(fakeResults);
  });

  it("supports l1 distance parameter", async () => {
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|vector_search") return [];
    });
    const spy = spyInvoke();

    await vectorSearch("x.db", "col", [1, 0], "l1", 3);

    expect((spy.mock.calls[0][1] as Record<string, unknown>).distance).toBe("l1");
  });
});

// ── vectorDelete ──────────────────────────────────────────────────────────────

describe("vectorDelete", () => {
  it("calls the correct plugin command", async () => {
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|vector_delete") return true;
    });
    const spy = spyInvoke();

    await vectorDelete("my.db", "docs", "doc-1");

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toBe("plugin:sqlite-vec|vector_delete");
  });

  it("forwards database, collection and id", async () => {
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|vector_delete") return true;
    });
    const spy = spyInvoke();

    await vectorDelete("a.db", "items", "custom-42");

    expect(spy.mock.calls[0][1]).toMatchObject({
      database: "a.db",
      collection: "items",
      id: "custom-42",
    });
  });

  it("returns true when record existed", async () => {
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|vector_delete") return true;
    });

    expect(await vectorDelete("a.db", "col", "x")).toBe(true);
  });

  it("returns false when record did not exist", async () => {
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|vector_delete") return false;
    });

    expect(await vectorDelete("a.db", "col", "ghost")).toBe(false);
  });

  it("propagates errors from the backend", async () => {
    mockIPC((cmd) => {
      if (cmd === "plugin:sqlite-vec|vector_delete")
        throw new Error("InvalidCollection");
    });

    await expect(vectorDelete("a.db", "bad-name!", "id")).rejects.toThrow(
      "InvalidCollection"
    );
  });
});
