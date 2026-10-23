// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const cloud = vi.hoisted(() => ({
  state: { status: "idle", user: null as null | { uid: string; name: string; email: string; photo: null }, error: null as null | string },
  signIn: vi.fn(),
  signOutUser: vi.fn(),
  resumeSession: vi.fn(),
  prepareSignIn: vi.fn(),
}));

vi.mock("@/lib/cloud", () => ({
  getCloudState: () => cloud.state,
  subscribeCloud: () => () => {},
  signIn: cloud.signIn,
  signOutUser: cloud.signOutUser,
  resumeSession: cloud.resumeSession,
  prepareSignIn: cloud.prepareSignIn,
}));

import AccountControl from "@/components/AccountControl";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const open = () => act(() => userEvent.click(screen.getByRole("button", { name: "Cuenta" })));

describe("AccountControl", () => {
  it("sin Firebase configurado no se muestra", () => {
    cloud.state = { status: "disabled", user: null, error: null };
    render(<AccountControl />);
    expect(screen.queryByRole("button", { name: "Cuenta" })).toBeNull();
  });

  it("al abrir la app intenta retomar una sesión de antes", () => {
    cloud.state = { status: "idle", user: null, error: null };
    render(<AccountControl />);
    expect(cloud.resumeSession).toHaveBeenCalled();
  });

  it("sin sesión explica qué se gana e inicia sesión con Google", async () => {
    cloud.state = { status: "idle", user: null, error: null };
    render(<AccountControl />);
    await open();
    expect(cloud.prepareSignIn).toHaveBeenCalled();
    expect(screen.getByText(/todos tus dispositivos/)).toBeTruthy();
    await act(() => userEvent.click(screen.getByRole("button", { name: "Iniciar sesión con Google" })));
    expect(cloud.signIn).toHaveBeenCalled();
  });

  it("con sesión muestra quién sos y permite cerrarla", async () => {
    cloud.state = { status: "signed-in", user: { uid: "u1", name: "Cris", email: "c@x.com", photo: null }, error: null };
    render(<AccountControl />);
    await open();
    expect(screen.getByText("Cris")).toBeTruthy();
    expect(screen.getByText("c@x.com")).toBeTruthy();
    await act(() => userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" })));
    expect(cloud.signOutUser).toHaveBeenCalled();
  });

  it("muestra el error si el login falló", async () => {
    cloud.state = { status: "signed-out", user: null, error: "No se pudo iniciar sesión" };
    render(<AccountControl />);
    await open();
    expect(screen.getByText("No se pudo iniciar sesión")).toBeTruthy();
  });
});
