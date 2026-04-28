/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render } from "../../../react-utils";
import { Knob } from "../../../../src/components/ui/form/Knob";

test("Should not reset to zero on first click after mount", () => {
  const onChange = jest.fn();

  const { getByRole } = render(
    <Knob name="volume" value={5} min={0} max={10} onChange={onChange} />,
  );

  const knob = getByRole("slider");
  knob.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 60,
      height: 60,
      right: 60,
      bottom: 60,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    }) as DOMRect;
  (knob as HTMLButtonElement).setPointerCapture = jest.fn();

  fireEvent.pointerDown(knob, { pointerId: 1, clientX: 30, clientY: 30 });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 30, clientY: 30 });

  expect(onChange).not.toHaveBeenCalled();
});
