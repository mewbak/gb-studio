import styled, { css } from "styled-components";
import { StyledButton, StyledButtonGroup } from "ui/buttons/style";

export const StyledTrackerWrapper = styled.div`
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
`;

export const StyledTrackerScrollWrapper = styled.div`
  overflow: auto;
  flex-grow: 1;
  flex-basis: 0;
  min-height: 0;
  overscroll-behavior: none;
`;

export const StyledTrackerScrollCanvas = styled.div`
  max-width: 0;
`;

interface StyledTrackerHeaderCellProps {
  $type: "channel" | "patternIndex";
  $muted?: boolean;
  $solo?: boolean;
}

export const StyledTrackerHeaderCellContents = styled.div`
  display: flex;
  align-items: center;
  border-right-width: 1px;
  border-right-style: solid;
  border-right-color: inherit;
  border-left-width: 1px;
  border-left-style: solid;
  border-left-color: inherit;
  padding: 0px;
  height: 40px;
`;

export const StyledTrackerHeaderCell = styled.div<StyledTrackerHeaderCellProps>`
  position: relative;
  display: block;
  align-items: center;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: bold;
  height: 40px;
  flex-shrink: 0;
  color: black;
  box-sizing: border-box;
  border-width: 0;
  border-color: inherit;
  border-style: solid;
  padding: 0;

  svg {
    fill: #000;
  }

  ${(props) =>
    props.$type === "patternIndex" &&
    css`
      padding: 0px;
      width: 56px;
      min-width: 56px;
      text-align: center;
      padding: 0;
      position: sticky;
      left: 0px;
      z-index: 1;
    `}

  ${(props) =>
    props.$type === "channel" &&
    css`
      width: 146px;
      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      ${StyledTrackerHeaderCellContents} {
        padding-left: 10px;
        padding-right: 5px;
        span {
          text-align: left;
        }
      }
    `}

  span {
    display: block;
    flex-grow: 1;
  }

  ${StyledButton} {
    background: transparent;
    border-color: rgba(0 0 0 / 0.3);
    border-color: transparent;
    color: #000;
    font-weight: bold;

    @media (max-width: 840px) {
      min-width: 30px;
      height: 30px;
    }
  }

  ${StyledButtonGroup} {
    border-radius: 4px;
    box-shadow:
      2px 2px 3px rgba(0 0 0 / 30%),
      -2px -2px 3px rgba(255 255 255 / 30%);

    ${StyledButton}:last-child {
      border-left-color: rgba(0 0 0 / 15%);
    }
  }

  ${(props) =>
    props.$solo &&
    css`
      ${StyledButton}:first-child {
        background: ${props.theme.colors.highlight};
        color: ${props.theme.colors.highlightText};
        border-top-color: rgba(0 0 0 / 0.3);
        box-shadow: inset 1px 1px 3px rgba(0 0 0 / 25%);
        svg {
          fill: ${props.theme.colors.highlightText};
        }
      }
    `}

  ${(props) =>
    props.$muted &&
    css`
      ${StyledButton}:last-child {
        background: ${props.theme.colors.highlight};
        color: ${props.theme.colors.highlightText};
        border-top-color: rgba(0 0 0 / 0.3);
        box-shadow: inset 1px 1px 3px rgba(0 0 0 / 25%);
        svg {
          fill: ${props.theme.colors.highlightText};
        }
      }
    `}
`;

const StyledTrackerField = styled.span<{
  $active?: boolean;
  $selected?: boolean;
}>`
  &:hover {
    outline: 2px solid rgba(255, 0, 0, 0.2);
  }
  margin: 0;
  padding: 5px 4px;
  white-space: nowrap;

  ${(props) =>
    props.$selected
      ? css`
          background-color: rgba(255, 0, 0, 0.2);
        `
      : ""}
  ${(props) =>
    props.$active
      ? css`
          background-color: white;
          && {
            color: black;
          }
        `
      : ""}
  ${(props) =>
    props.$active && props.$selected
      ? css`
          outline: 2px solid rgba(255, 0, 0, 0.5);
          &:hover {
            outline: 2px solid rgba(255, 0, 0, 0.5);
          }
        `
      : ""}
`;

export const StyledTrackerRowIndexField = styled.span`
  margin: 0;
  padding: 0 4px;
  pointer-events: none;
`;

export const StyledTrackerNoteField = styled(StyledTrackerField)`
  color: ${(props) => props.theme.colors.tracker.note};
`;

export const StyledTrackerInstrumentField = styled(StyledTrackerField)`
  color: ${(props) => props.theme.colors.tracker.instrument};
`;

export const StyledTrackerJumpField = styled(StyledTrackerField)`
  color: ${(props) => props.theme.colors.tracker.instrument};
`;

export const StyledTrackerEffectCodeField = styled(StyledTrackerField)`
  color: ${(props) => props.theme.colors.tracker.effectCode};
  padding-right: 1px;
`;

export const StyledTrackerEffectParamField = styled(StyledTrackerField)`
  color: ${(props) => props.theme.colors.tracker.effectParam};
  padding-left: 1px;
`;

export const StyledTrackerPattern = styled.div<{ $isFiltered?: boolean }>`
  min-width: 640px;
  display: flex;
  flex-direction: column;

  ${(props) =>
    props.$isFiltered &&
    css`
      filter: grayscale(1);
    `}
`;

export const StyledTrackerPatternHeader = styled.div`
  display: flex;
  width: 100%;
  min-height: 40px;
  white-space: nowrap;
  box-shadow: 0 3px 5px rgb(0 0 0 / 20%);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 2;
`;

export const StyledTrackerPatternBody = styled.div`
  display: flex;
  box-shadow: none !important;
  outline: 0;
  align-items: stretch;
  &:focus {
    z-index: 0;
  }
`;

export const StyledTrackerPatternRowIndexColumn = styled.div<{
  $sticky?: boolean;
}>`
  flex: 0 0 56px;
  min-width: 56px;
  box-sizing: border-box;
  background-color: ${(props) => props.theme.colors.tracker.background};

  ${(props) =>
    props.$sticky &&
    css`
      position: sticky;
      left: 0;
      z-index: 1;
    `}
`;

interface StyledTrackerPatternRowIndexCellProps {
  $isDefaultPlayhead?: boolean;
}

export const StyledTrackerPatternRowIndexCell = styled.div<StyledTrackerPatternRowIndexCellProps>`
  font-family: "Public Pixel", monospace;
  font-size: 12px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.tracker.text};
  border-width: 0 1px 0 0;
  border-color: ${(props) => props.theme.colors.tracker.border};
  border-style: solid;
  margin: 0;
  height: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 0;
  background-color: ${(props) => props.theme.colors.tracker.background};

  ${(props) =>
    props.$isDefaultPlayhead
      ? css`
          position: relative;
          background-color: ${props.theme.colors.tracker.border};
          color: ${props.theme.colors.tracker.text};

          &:after {
            content: "";
            position: absolute;
            top: 0px;
            right: -14px;
            border-top: 14px solid transparent;
            border-bottom: 14px solid transparent;
            border-left: 14px solid ${props.theme.colors.tracker.border};
          }
        `
      : ""}

  &[data-playing="true"] {
    position: relative;
    background-color: ${(props) => props.theme.colors.highlight};
    color: ${(props) => props.theme.colors.highlightText};

    &:after {
      content: "";
      position: absolute;
      top: 0px;
      right: -14px;
      border-top: 14px solid transparent;
      border-bottom: 14px solid transparent;
      border-left: 14px solid ${(props) => props.theme.colors.highlight};
    }
  }
`;

export const StyledTrackerPatternChannel = styled.div<{ $isMuted?: boolean }>`
  flex: 0 0 146px;
  min-width: 146px;
  box-sizing: border-box;

  ${(props) =>
    props.$isMuted &&
    css`
      opacity: 0.3;
    `}
`;

interface StyledTrackerPatternChannelRowProps {
  $isStepMarker?: boolean;
  $isActive?: boolean;
}

export const StyledTrackerPatternChannelRow = styled.div<StyledTrackerPatternChannelRowProps>`
  font-family: "Public Pixel", monospace;
  font-size: 12px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.tracker.text};
  border-width: 0 1px 0 0;
  border-color: ${(props) => props.theme.colors.tracker.border};
  border-style: solid;
  margin: 0;
  height: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 0 11px;
  box-sizing: border-box;
  background-color: ${(props) =>
    props.$isActive || props.$isStepMarker
      ? props.theme.colors.tracker.activeBackground
      : props.theme.colors.tracker.background};
`;

export const StyledAddPatternButton = styled.button`
  display: flex;
  color: ${(props) => props.theme.colors.panel.text};
  background: ${(props) => props.theme.colors.panel.background};
  border: 1px solid ${(props) => props.theme.colors.panel.border};
  border-radius: 4px;
  padding: 0;
  border-radius: 3px;
  width: 200px;
  height: 50px;
  align-items: center;
  justify-content: center;

  svg {
    fill: ${(props) => props.theme.colors.panel.icon};
    width: 20px;
    height: 20px;
    max-width: 20px;
    max-height: 20px;
  }

  &:hover {
    background: ${(props) => props.theme.colors.panel.hoverBackground};
  }

  &:active {
    background: ${(props) => props.theme.colors.panel.activeBackground};
  }
`;

export const StyledAddPatternWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  position: sticky;
  left: 0px;
  height: 90px;
  border-top: 1px solid ${(props) => props.theme.colors.sidebar.border};
  max-width: 640px;
`;
