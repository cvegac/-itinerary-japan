// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import LodgingSummaryView from "@/components/LodgingSummaryView";
import { makeDay } from "./fixtures";

afterEach(cleanup);

const itinerary = [
  makeDay("2026-11-21", "Sáb", { lodgingPlace: "Centro, Matsumoto", accommodation: "Minka House" }),
  makeDay("2026-11-22", "Dom", { lodgingPlace: "Centro, Matsumoto", accommodation: "Minka House" }),
  makeDay("2026-11-23", "Lun", { lodgingPlace: "Kawana, Ito", accommodation: "Villa FUN Kawana" }),
];

describe("LodgingSummaryView: segunda mano", () => {
  it("debajo de cada hospedaje lista las tiendas de segunda mano cercanas, con su enlace a Google Maps", () => {
    const shops = {
      "Centro, Matsumoto": [
        { name: "Hard Off + Hobby Off (Hirata)", what: "Electrónica y juguetes usados", coords: [36.19, 137.9623] as [number, number], howFar: "Tren a Hirata + 5 min a pie" },
      ],
    };
    render(<LodgingSummaryView itinerary={itinerary} onDaySelect={() => {}} shops={shops} />);
    const list = screen.getByRole("list", { name: "Segunda mano cerca de Centro, Matsumoto" });
    const link = within(list).getByRole("link", { name: /Hard Off \+ Hobby Off \(Hirata\)/ });
    expect(link.getAttribute("href")).toContain("36.19%2C137.9623");
    expect(link.textContent).toContain("Tren a Hirata + 5 min a pie");
    expect(screen.queryByRole("list", { name: "Segunda mano cerca de Kawana, Ito" })).toBeNull();
  });
});
