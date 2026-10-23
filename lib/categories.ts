// Estilos por categoría de día, legibles en claro y en oscuro
export type CategoryStyle = { dot: string; chip: string };

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  Naturaleza: { dot: "bg-emerald-500", chip: "bg-emerald-500/15 text-emerald-700" },
  Logística: { dot: "bg-slate-400", chip: "bg-slate-500/15 text-slate-700" },
  Ciudad: { dot: "bg-orange-500", chip: "bg-orange-500/15 text-orange-700" },
  Paisaje: { dot: "bg-sky-500", chip: "bg-sky-500/15 text-sky-700" },
  Vistas: { dot: "bg-violet-500", chip: "bg-violet-500/15 text-violet-700" },
  Compras: { dot: "bg-pink-500", chip: "bg-pink-500/15 text-pink-700" },
  Libre: { dot: "bg-yellow-500", chip: "bg-yellow-500/15 text-yellow-700" },
};

const FALLBACK: CategoryStyle = { dot: "bg-gray-400", chip: "bg-gray-500/15 text-muted" };

export function categoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category] ?? FALLBACK;
}
