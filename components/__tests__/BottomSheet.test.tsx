// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BottomSheet from "@/components/BottomSheet";

afterEach(cleanup);

const heights = { peek: 120, half: 400, full: 700 };
const touch = (y: number) => ({ touches: [{ clientY: y }], changedTouches: [{ clientY: y }] });

describe("BottomSheet", () => {
  it("con el detalle arriba de todo, tirar hacia abajo recarga la app", () => {
    const onRefresh = vi.fn();
    render(
      <BottomSheet snap="half" heights={heights} bottomOffset={0} onSnapChange={() => {}} header={<div>fechas</div>} onRefresh={onRefresh}>
        <p>detalle del día</p>
      </BottomSheet>,
    );
    const content = screen.getByText("detalle del día").parentElement!;
    fireEvent.touchStart(content, touch(100));
    fireEvent.touchMove(content, touch(400));
    fireEvent.touchEnd(content, touch(400));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
