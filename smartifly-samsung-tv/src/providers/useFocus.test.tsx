import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FocusProvider } from "./FocusProvider";
import { useFocus, useFocusActions, useIsFocused } from "./useFocus";

type FocusControllerHandle = {
  setFocus: (id: string | null) => void;
};

const FocusController = forwardRef<FocusControllerHandle>(function FocusController(_, ref) {
  const { setFocus } = useFocusActions();

  useImperativeHandle(
    ref,
    () => ({
      setFocus,
    }),
    [setFocus]
  );

  return null;
});

const FocusRegistration = ({ id }: { id: string }) => {
  const { registerElement, unregisterElement } = useFocusActions();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      registerElement(id, ref.current, { allowGlobalAutoFocus: false });
    }

    return () => {
      unregisterElement(id);
    };
  }, [id, registerElement, unregisterElement]);

  return <div ref={ref} tabIndex={-1} />;
};

const renderCounts: Record<string, number> = {};

const FocusTracker = ({ id, label }: { id: string; label: string }) => {
  const isFocused = useIsFocused(id);
  renderCounts[label] = (renderCounts[label] ?? 0) + 1;

  return <div data-testid={label}>{isFocused ? "focused" : "idle"}</div>;
};

const FocusReader = () => {
  const { focusedId } = useFocus();
  return <div data-testid="focused-id">{focusedId ?? "none"}</div>;
};

describe("useFocus subscriptions", () => {
  it("only re-renders focus observers whose focused state changed", () => {
    renderCounts.a = 0;
    renderCounts.b = 0;
    renderCounts.c = 0;

    const controllerRef = React.createRef<FocusControllerHandle>();

    render(
      <FocusProvider>
        <FocusController ref={controllerRef} />
        <FocusRegistration id="a" />
        <FocusRegistration id="b" />
        <FocusRegistration id="c" />
        <FocusReader />
        <FocusTracker id="a" label="a" />
        <FocusTracker id="b" label="b" />
        <FocusTracker id="c" label="c" />
      </FocusProvider>
    );

    expect(screen.getByTestId("focused-id").textContent).toBe("none");
    expect(renderCounts).toEqual({ a: 1, b: 1, c: 1 });

    act(() => {
      controllerRef.current?.setFocus("a");
    });

    expect(screen.getByTestId("focused-id").textContent).toBe("a");
    expect(screen.getByTestId("a").textContent).toBe("focused");
    expect(screen.getByTestId("b").textContent).toBe("idle");
    expect(screen.getByTestId("c").textContent).toBe("idle");
    expect(renderCounts).toEqual({ a: 2, b: 1, c: 1 });

    act(() => {
      controllerRef.current?.setFocus("b");
    });

    expect(screen.getByTestId("focused-id").textContent).toBe("b");
    expect(screen.getByTestId("a").textContent).toBe("idle");
    expect(screen.getByTestId("b").textContent).toBe("focused");
    expect(screen.getByTestId("c").textContent).toBe("idle");
    expect(renderCounts).toEqual({ a: 3, b: 2, c: 1 });
  });

  it("blurs the previously focused element when focus is cleared", () => {
    const controllerRef = React.createRef<FocusControllerHandle>();

    render(
      <FocusProvider>
        <FocusController ref={controllerRef} />
        <FocusRegistration id="a" />
      </FocusProvider>
    );

    act(() => {
      controllerRef.current?.setFocus("a");
    });

    const registeredElement = document.querySelector("[tabindex='-1']") as HTMLElement | null;
    expect(document.activeElement).toBe(registeredElement);

    act(() => {
      controllerRef.current?.setFocus(null);
    });

    expect(document.activeElement).not.toBe(registeredElement);
  });

  it("re-applies DOM focus when the logical focus id is unchanged", () => {
    const controllerRef = React.createRef<FocusControllerHandle>();

    render(
      <FocusProvider>
        <FocusController ref={controllerRef} />
        <FocusRegistration id="a" />
        <FocusRegistration id="b" />
      </FocusProvider>
    );

    const registeredElements = Array.from(
      document.querySelectorAll("[tabindex='-1']")
    ) as HTMLElement[];
    const [elementA, elementB] = registeredElements;

    act(() => {
      controllerRef.current?.setFocus("a");
    });

    expect(document.activeElement).toBe(elementA);

    act(() => {
      elementB.focus();
    });

    expect(document.activeElement).toBe(elementB);

    act(() => {
      controllerRef.current?.setFocus("a");
    });

    expect(document.activeElement).toBe(elementA);
  });

  it("prefers non-nav fallback when a focused content element unregisters", () => {
    const controllerRef = React.createRef<FocusControllerHandle>();

    const TestScreen = ({ showHero }: { showHero: boolean }) => (
      <FocusProvider>
        <FocusController ref={controllerRef} />
        <FocusRegistration id="nav-profile" />
        <FocusRegistration id="top-search" />
        {showHero ? <FocusRegistration id="hero-play" /> : null}
        <FocusReader />
      </FocusProvider>
    );

    const { rerender } = render(<TestScreen showHero />);

    act(() => {
      controllerRef.current?.setFocus("hero-play");
    });

    expect(screen.getByTestId("focused-id").textContent).toBe("hero-play");

    rerender(<TestScreen showHero={false} />);

    expect(screen.getByTestId("focused-id").textContent).toBe("top-search");
  });
});
