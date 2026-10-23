import { describe, expect, it } from "vitest";
import { DEFAULT_POI_ICON, poiIcon } from "./poi-icons";

const icon = (name: string) => poiIcon({ name, coords: [35, 139] });

describe("poiIcon", () => {
  it.each([
    ["Santuario Fushimi Inari", "⛩️"],
    ["Kumano Hongu Taisha", "⛩️"],
    ["Gran torii de Oyunohara", "⛩️"],
    ["Templo Senso-ji", "🛕"],
    ["Adashino Nenbutsu-ji", "🛕"],
    ["Gran Buda (Kotoku-in)", "🛕"],
    ["Mausoleo de Kobo Daishi (Okunoin)", "🛕"],
    ["Castillo de Matsumoto", "🏯"],
    ["Cima del monte Takao", "⛰️"],
    ["Paso de Magome", "⛰️"],
    ["Onsen Kin-no-yu (Arima)", "♨️"],
    ["Hirayu Onsen", "♨️"],
    ["Cascada de Nachi", "💧"],
    ["Lago Saiko", "🏞️"],
    ["Bosque de bambú de Arashiyama", "🎋"],
    ["Corredor de los Arces", "🍁"],
    ["Avenida de ginkgos de Jingu Gaien (entrada por Aoyama-dori)", "🍂"],
    ["Jardín Rikugien", "🌳"],
    ["Parque de la Paz", "🕊️"],
    ["Estación Kamikosawa", "🚉"],
    ["Estación Hotaka (alquiler de bicis)", "🚲"],
    ["Teleférico de Shin-Hotaka (base)", "🚡"],
    ["Aeropuerto de Narita", "✈️"],
    ["Mercado Nishiki", "🛍️"],
    ["Calle del monjayaki (Tsukishima)", "🍜"],
    ["Gion (Hanamikoji)", "🏮"],
    ["Tsumago", "🏘️"],
    ["Museo de Ino Tadataka (canal del río Ono)", "🏛️"],
  ])("%s → %s", (name, expected) => {
    expect(icon(name)).toBe(expected);
  });

  it("resuelve los nombres que mezclan dos tipos", () => {
    expect(icon("Puente sagrado Shinkyo")).toBe("🌉");
    expect(icon("Puente Ichinohashi (Okunoin)")).toBe("🌉");
    expect(icon("Escalinata de Daimonzaka")).toBe("🥾");
    expect(icon("Takijiri-oji (inicio)")).toBe("🥾");
    expect(icon("Sendero del bosque de bambú")).toBe("🎋");
    expect(icon("Mirador del ayuntamiento de Tokio")).toBe("🏙️");
    // "barrio" contiene "rio": no es un río
    expect(icon("Barrio Kitano (Casa del Gallo Veleta)")).toBe("🏘️");
    expect(icon("Paseo del río Matsukawa")).toBe("🏞️");
  });

  it("usa el ícono elegido a mano si el lugar lo trae", () => {
    expect(poiIcon({ name: "Templo raro", coords: [35, 139], icon: "🐉" })).toBe("🐉");
  });

  it("sin coincidencias usa el pin genérico", () => {
    expect(icon("Algo desconocido")).toBe(DEFAULT_POI_ICON);
  });
});
