import { describe, expect, it } from "vitest";
import { sunTimes } from "./sun";

const TOKYO: [number, number] = [35.6762, 139.6503];

/** "5:57" → minutos desde la medianoche */
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

describe("sunTimes (hora de Japón)", () => {
  // Referencia: tabla de surf-life.blue para Tokio, noviembre de 2026
  it.each([["2026-11-02", "6:02", "16:46"]])("Tokio el %s: sale ~%s y se pone ~%s", (date, sunrise, sunset) => {
    const t = sunTimes(date, TOKYO);
    expect(Math.abs(minutes(t.sunrise) - minutes(sunrise))).toBeLessThanOrEqual(3);
    expect(Math.abs(minutes(t.sunset) - minutes(sunset))).toBeLessThanOrEqual(3);
  });

  it("en el oeste de Japón el sol sale y se pone más tarde", () => {
    const tokyo = sunTimes("2026-11-05", TOKYO);
    const hiroshima = sunTimes("2026-11-05", [34.3853, 132.4553]);
    expect(minutes(hiroshima.sunrise)).toBeGreaterThan(minutes(tokyo.sunrise) + 20);
    expect(minutes(hiroshima.sunset)).toBeGreaterThan(minutes(tokyo.sunset) + 20);
  });

  it("formatea sin cero a la izquierda en la hora", () => {
    expect(sunTimes("2026-11-01", TOKYO).sunrise).toMatch(/^\d:\d{2}$/);
    expect(sunTimes("2026-11-01", TOKYO).sunset).toMatch(/^\d{2}:\d{2}$/);
  });
});
