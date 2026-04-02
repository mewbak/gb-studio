import React, { FC, useContext } from "react";
import styled, { css, ThemeContext } from "styled-components";
import { Range, getTrackBackground } from "react-range";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  labelledBy?: string;
  onChange?: (value: number) => void;
}

const RangeInner = styled.div`
  display: flex;
  width: 100%;
  height: 28px;

  @media (max-width: 840px) {
    height: 38px;
  }
`;

const RangeTrack = styled.div`
  position: relative;
  width: 100%;
  height: 28px;
  border-radius: 20px;
  align-self: center;
  background: ${(props) => props.theme.colors.input.background};
  border: 1px solid ${(props) => props.theme.colors.input.border};
  box-sizing: border-box;
  padding: 0 14px;

  @media (max-width: 840px) {
    height: 38px;
    padding: 0 18px;
  }
`;

const RangeTrackFill = styled.div`
  position: absolute;
  top: 3px;
  left: 14px;
  right: 14px;
  bottom: 3px;
  &:before {
    content: "";
    display: block;
    position: absolute;
    width: 20px;
    top: 0;
    bottom: 0;
    left: -10px;
    background: ${(props) => props.theme.colors.highlight};
    border-radius: 20px;
  }

  @media (max-width: 840px) {
    left: 18px;
    right: 18px;

    &:before {
      width: 28px;
      left: -14px;
      border-radius: 32px;
    }
  }
`;

const RangeTrackInner = styled.div`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
`;

interface RangeThumbProps {
  $isDragged: boolean;
}

const RangeThumb = styled.div<RangeThumbProps>`
  height: 18px;
  width: 18px;
  border-radius: 20px;
  background: ${(props) => props.theme.colors.button.background};
  border: 1px solid ${(props) => props.theme.colors.input.border};
  ${(props) =>
    props.$isDragged
      ? css`
          background: ${(props) => props.theme.colors.highlight};
          border: 1px solid ${(props) => props.theme.colors.highlight};
        `
      : ""}

  @media (max-width: 840px) {
    width: 28px;
    height: 28px;
  }
`;

const clampAndSnap = (
  value: number,
  min: number,
  max: number,
  step: number,
) => {
  const clamped = Math.min(Math.max(value, min), max);
  const snapped = Math.round((clamped - min) / step) * step + min;
  return Number(snapped.toFixed(10));
};

export const Slider: FC<SliderProps> = ({
  labelledBy,
  value,
  min,
  max,
  step,
  onChange,
}) => {
  const themeContext = useContext(ThemeContext);

  const safeValue = clampAndSnap(value ?? 0, min, max, step ?? 1);

  return (
    <Range
      labelledBy={labelledBy}
      min={min}
      max={max}
      step={step}
      values={[safeValue]}
      onChange={(values) => onChange?.(values[0])}
      renderTrack={({ props, children }) => (
        <RangeInner
          onMouseDown={props.onMouseDown}
          onTouchStart={props.onTouchStart}
          style={props.style}
        >
          <RangeTrack>
            <RangeTrackFill
              style={{
                background: getTrackBackground({
                  values: [value],
                  colors: [
                    themeContext?.colors.highlight ?? "black",
                    themeContext?.colors.input.background ?? "white",
                  ],
                  min,
                  max,
                }),
              }}
            />
            <RangeTrackInner ref={props.ref}>{children}</RangeTrackInner>
          </RangeTrack>
        </RangeInner>
      )}
      renderThumb={({ props, isDragged }) => (
        <RangeThumb {...props} $isDragged={isDragged} style={props.style} />
      )}
    />
  );
};
