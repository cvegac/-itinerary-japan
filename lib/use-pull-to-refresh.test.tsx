// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PULL_THRESHOLD, PullIndicator, usePullToRefresh } from "@/lib/use-pull-to-refresh";

afterEach(cleanup);

function Scroller({ onRefresh }: { onRefresh: () => void }) {
  const { pull, bind } = usePullToRefresh(onRefresh);
  return (
    <div data-testid="scroller" {...bind}>
      <PullIndicator pull={pull} />
      contenido
    </div>
  );
}

const touch = (y: number) => ({ touches: [{ clientY: y }], changedTouches: [{ clientY: y }] });

function pullDown(el: HTMLElement, from: number, to: number) {
  fireEvent.touchStart(el, touch(from));
  fireEvent.touchMove(el, touch(to));
}

describe("usePullToRefresh", () => {
  it("arriba de todo, tirar hacia abajo y soltar recarga", () => {
    const onRefresh = vi.fn();
    render(<Scroller onRefresh={onRefresh} />);
    const el = screen.getByTestId("scroller");
    pullDown(el, 100, 100 + PULL_THRESHOLD * 3);
    expect(screen.getByText(/Soltá para actualizar/)).toBeTruthy();
    fireEvent.touchEnd(el, touch(100 + PULL_THRESHOLD * 3));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("un tirón corto no recarga", () => {
    const onRefresh = vi.fn();
    render(<Scroller onRefresh={onRefresh} />);
    const el = screen.getByTestId("scroller");
    pullDown(el, 100, 130);
    expect(screen.getByText(/Tirá para actualizar/)).toBeTruthy();
    fireEvent.touchEnd(el, touch(130));
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("si la lista no está arriba de todo, tirar hacia abajo solo hace scroll", () => {
    const onRefresh = vi.fn();
    render(<Scroller onRefresh={onRefresh} />);
    const el = screen.getByTestId("scroller");
    el.scrollTop = 200;
    pullDown(el, 100, 100 + PULL_THRESHOLD * 3);
    fireEvent.touchEnd(el, touch(100 + PULL_THRESHOLD * 3));
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("subir el dedo no muestra el aviso", () => {
    render(<Scroller onRefresh={() => {}} />);
    const el = screen.getByTestId("scroller");
    pullDown(el, 300, 100);
    expect(screen.queryByText(/para actualizar/)).toBeNull();
  });
});
