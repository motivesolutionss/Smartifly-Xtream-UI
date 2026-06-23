import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FocusProvider } from "../../providers/FocusProvider";
import { useFocus } from "../../providers/useFocus";
import { Focusable } from "./Focusable";

const FocusReader = () => {
  const { focusedId } = useFocus();
  return <div data-testid="focused-id">{focusedId ?? "none"}</div>;
};

describe("Focusable", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("does not move focus on pointer hover by default", () => {
    render(
      <FocusProvider>
        <FocusReader />
        <Focusable id="a" allowGlobalAutoFocus={false}>
          A
        </Focusable>
      </FocusProvider>
    );

    fireEvent.mouseEnter(screen.getByText("A"));

    expect(screen.getByTestId("focused-id").textContent).toBe("none");
  });

  it("can opt into pointer-driven focus explicitly", () => {
    render(
      <FocusProvider>
        <FocusReader />
        <Focusable id="a" allowGlobalAutoFocus={false} enablePointerFocus>
          A
        </Focusable>
      </FocusProvider>
    );

    act(() => {
      fireEvent.mouseEnter(screen.getByText("A"));
    });

    expect(screen.getByTestId("focused-id").textContent).toBe("a");
  });
});
