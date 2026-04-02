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

const TRACK_PADDING = 14;
const TRACK_RADIUS = 20;
const THUMB_SIZE = 18;
const EDGE_FILL_SIZE = 20;
const EDGE_FILL_OFFSET = -10;

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
  border-radius: ${TRACK_RADIUS}px;
  align-self: center;
  background: ${(props) => props.theme.colors.input.background};
  border: 1px solid ${(props) => props.theme.colors.input.border};
  box-sizing: border-box;
  padding: 0 ${TRACK_PADDING}px;

  @media (max-width: 840px) {
    height: 38px;
    padding: 0 18px;
  }
`;

interface RangeTrackFillProps {
  $showStartCap: boolean;
}

const RangeTrackFill = styled.div<RangeTrackFillProps>`
  position: absolute;
  top: 3px;
  left: ${TRACK_PADDING}px;
  right: ${TRACK_PADDING}px;
  bottom: 3px;

  ${(props) =>
    props.$showStartCap
      ? css`
          &:before {
            content: "";
            display: block;
            position: absolute;
            width: ${EDGE_FILL_SIZE}px;
            top: 0;
            bottom: 0;
            left: ${EDGE_FILL_OFFSET}px;
            background: ${props.theme.colors.highlight};
            border-radius: ${TRACK_RADIUS}px;
          }
        `
      : ""}

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

interface ZeroMarkerProps {
  $leftPercent: number;
}

const ZeroMarker = styled.div<ZeroMarkerProps>`
  position: absolute;
  top: 2px;
  bottom: 2px;
  width: 2px;
  left: calc(50% - 1px);
  border-radius: 999px;
  background: ${(props) => props.theme.colors.input.border};
  pointer-events: none;
`;

interface RangeThumbProps {
  $isDragged: boolean;
}

const RangeThumb = styled.div<RangeThumbProps>`
  height: ${THUMB_SIZE}px;
  width: ${THUMB_SIZE}px;
  border-radius: 20px;
  background: ${(props) => props.theme.colors.button.background};
  border: 1px solid ${(props) => props.theme.colors.input.border};

  ${(props) =>
    props.$isDragged
      ? css`
          background: ${props.theme.colors.highlight};
          border: 1px solid ${props.theme.colors.highlight};
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

const normalizeValue = (value: number, min: number, max: number) => {
  if (max <= min) {
    return 0;
  }
  return (value - min) / (max - min);
};

const buildTrackBackground = (
  value: number,
  min: number,
  max: number,
  fillColor: string,
  backgroundColor: string,
) => {
  const isBipolar = min < 0 && max > 0;

  if (!isBipolar) {
    return getTrackBackground({
      values: [value],
      colors: [fillColor, backgroundColor],
      min,
      max,
    });
  }

  const zeroPercent = normalizeValue(0, min, max) * 100;
  const valuePercent = normalizeValue(value, min, max) * 100;

  if (value === 0) {
    return backgroundColor;
  }

  if (value < 0) {
    return `linear-gradient(
      to right,
      ${backgroundColor} 0%,
      ${backgroundColor} ${valuePercent}%,
      ${fillColor} ${valuePercent}%,
      ${fillColor} ${zeroPercent}%,
      ${backgroundColor} ${zeroPercent}%,
      ${backgroundColor} 100%
    )`;
  }

  return `linear-gradient(
    to right,
    ${backgroundColor} 0%,
    ${backgroundColor} ${zeroPercent}%,
    ${fillColor} ${zeroPercent}%,
    ${fillColor} ${valuePercent}%,
    ${backgroundColor} ${valuePercent}%,
    ${backgroundColor} 100%
  )`;
};

export const Slider: FC<SliderProps> = ({
  labelledBy,
  value,
  min,
  max,
  step = 1,
  onChange,
}) => {
  const themeContext = useContext(ThemeContext);

  const safeValue = clampAndSnap(value ?? 0, min, max, step);
  const isBipolar = min < 0 && max > 0;
  const zeroPercent = normalizeValue(0, min, max) * 100;

  const fillColor = themeContext?.colors.highlight ?? "black";
  const backgroundColor = themeContext?.colors.input.background ?? "white";

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
              $showStartCap={!isBipolar}
              style={{
                background: buildTrackBackground(
                  safeValue,
                  min,
                  max,
                  fillColor,
                  backgroundColor,
                ),
              }}
            />
            {isBipolar && <ZeroMarker $leftPercent={zeroPercent} />}
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
