import { describe, expect, it } from "vitest";
import { dayNotes, generalNotes, inviteLink, invitedTripId, pickTrip, placeNotes, unseenNotes, type SharedNote } from "./shared-notes";

const note = (id: string, extra: Partial<SharedNote> = {}): SharedNote => ({
  id,
  day: "2026-11-03",
  text: `nota ${id}`,
  author: "karla",
  createdAt: 1,
  ...extra,
});

describe("notas del viaje compartido", () => {
  it("las del día, de la más vieja a la más nueva; las que no subieron todavía al final", () => {
    const notes = [note("b", { createdAt: 20 }), note("x", { day: "2026-11-04" }), note("p", { createdAt: null }), note("a", { createdAt: 10 })];
    expect(dayNotes(notes, "2026-11-03").map((n) => n.id)).toEqual(["a", "b", "p"]);
  });

  it("separa las de todo el día de las de cada lugar", () => {
    const notes = [note("g"), note("l", { place: "Ameyoko" }), note("o", { place: "Ueno" })];
    expect(generalNotes(notes, "2026-11-03").map((n) => n.id)).toEqual(["g"]);
    expect(placeNotes(notes, "2026-11-03", "Ameyoko").map((n) => n.id)).toEqual(["l"]);
  });

  it("nuevas: las del otro que todavía no viste en este dispositivo", () => {
    const notes = [note("mia", { author: "cris" }), note("vista"), note("nueva")];
    expect(unseenNotes(notes, "cris", ["vista"]).map((n) => n.id)).toEqual(["nueva"]);
  });

  it("si hay más de un viaje con ese nombre, el compartido", () => {
    const solo = { id: "s", members: ["karla"], names: {} };
    const shared = { id: "c", members: ["cris", "karla"], names: {} };
    expect(pickTrip([solo, shared])?.id).toBe("c");
    expect(pickTrip([])).toBeNull();
  });

  it("el link de invitación lleva el id del viaje y se lee de vuelta", () => {
    const link = inviteLink("https://viajes.example/japan/", "abc123");
    expect(link).toBe("https://viajes.example/japan/?unirse=abc123");
    expect(invitedTripId(new URL(link).search)).toBe("abc123");
    expect(invitedTripId("?otra=1")).toBeNull();
  });
});
