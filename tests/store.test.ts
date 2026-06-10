import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileStore, newId } from "../lib/store";

function tempStore() {
  const dir = mkdtempSync(join(tmpdir(), "premortem-store-"));
  return { store: new FileStore(dir), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("put/get/list/delete ciclo completo", () => {
  const { store, cleanup } = tempStore();
  try {
    store.put("col", "a1", { x: 1 });
    store.put("col", "a2", { x: 2 });
    assert.deepEqual(store.get("col", "a1"), { x: 1 });
    assert.equal(store.list("col").length, 2);
    assert.equal(store.delete("col", "a1"), true);
    assert.equal(store.get("col", "a1"), null);
    assert.equal(store.delete("col", "a1"), false);
  } finally {
    cleanup();
  }
});

test("list devuelve más recientes primero (ids ordenables)", () => {
  const { store, cleanup } = tempStore();
  try {
    store.put("col", "001-viejo", { v: 1 });
    store.put("col", "999-nuevo", { v: 2 });
    const ids = store.list("col").map((e) => e.id);
    assert.deepEqual(ids, ["999-nuevo", "001-viejo"]);
  } finally {
    cleanup();
  }
});

test("ids inseguros (path traversal) son rechazados", () => {
  const { store, cleanup } = tempStore();
  try {
    assert.throws(() => store.put("col", "../escape", {}));
    assert.throws(() => store.get("col", "a/b"));
    assert.throws(() => store.put("../col", "id", {}));
  } finally {
    cleanup();
  }
});

test("newId es ordenable por tiempo y único", () => {
  const a = newId();
  const b = newId();
  assert.notEqual(a, b);
  assert.ok(/^[a-z0-9]+-[a-z0-9]+$/.test(a));
});
