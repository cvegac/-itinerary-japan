import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

const PUBLIC = join(import.meta.dirname, "../public");

/** Ancho y alto de un PNG (vienen en el encabezado IHDR) */
function pngSize(path: string): [number, number] {
  const buf = readFileSync(path);
  expect(buf.subarray(1, 4).toString()).toBe("PNG");
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

describe("manifiesto de la web app", () => {
  const m = manifest();

  it("abre como app a pantalla completa desde el inicio", () => {
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBe("/");
    expect(m.scope).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.lang).toBe("es");
  });

  it("usa los colores del tema claro", () => {
    expect(m.theme_color).toBe("#f3f4f6");
    expect(m.background_color).toBe("#f3f4f6");
  });

  it("trae íconos PNG de 192 y 512, y uno maskable para Android", () => {
    const icons = m.icons ?? [];
    const find = (size: string, purpose: string) =>
      icons.find((i) => i.sizes === size && (i.purpose ?? "any") === purpose);
    expect(find("192x192", "any")).toBeTruthy();
    expect(find("512x512", "any")).toBeTruthy();
    expect(find("512x512", "maskable")).toBeTruthy();
  });

  it("apunta a archivos que existen y tienen el tamaño declarado", () => {
    for (const icon of manifest().icons ?? []) {
      const path = join(PUBLIC, icon.src);
      expect(existsSync(path), icon.src).toBe(true);
      const [w, h] = pngSize(path);
      expect(`${w}x${h}`, icon.src).toBe(icon.sizes);
    }
  });

  it("tiene el ícono de inicio para iPhone (180x180)", () => {
    expect(pngSize(join(import.meta.dirname, "apple-icon.png"))).toEqual([180, 180]);
  });
});
