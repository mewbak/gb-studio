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

interface StyledTrackerContentTableProps {
  $type: "pattern" | "subpattern";
}

export const StyledTrackerContentTable = styled.table<StyledTrackerContentTableProps>`
  width: 600px;
  display: table;
  border-collapse: collapse;

  ${(props) =>
    props.$type === "pattern" &&
    css`
      & tr td:first-child {
        position: sticky;
        left: 0;
        z-index: 1;
      }
    `}

  ${(props) =>
    props.$type === "subpattern" &&
    css`
      width: 100%;
      max-width: 270px;
      & tr td:first-child {
        width: 56px;
      }
      & tr td:last-child {
        text-align: left;
        padding: 0 5px;
      }
    `}
`;

export const StyledTrackerTableHeader = styled.thead`
  width: 100%;
  height: 40px;
  white-space: nowrap;
  box-shadow: 0 3px 5px rgb(0 0 0 / 20%);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 2;
`;

export const StyledTrackerTableBody = styled.tbody`
  box-shadow: none !important;
`;

export const StyledTrackerTableHeaderRow = styled.tr``;

export const StyledTrackerPattern = styled.div`
  overflow: auto;
  width: 100%;
  white-space: nowrap;
  border-width: 0 0 0 1px;
  border-color: ${(props) => props.theme.colors.sidebar.border};
  border-style: solid;

  &&& {
    box-shadow: none;
    z-index: 0;
  }
`;

export const StyledTrackerHeaderSpacer = styled.div`
  flex-grow: 1;
  background: rgba(0, 0, 0, 0.5);
  background: ${(props) => props.theme.colors.sidebar.background};
  border-bottom: 1px solid ${(props) => props.theme.colors.sidebar.border};
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

export const StyledTrackerHeaderCell = styled.th<StyledTrackerHeaderCellProps>`
  position: relative;
  align-items: center;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: bold;
  height: 30px;
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
      width: 55px;
      text-align: center;
    `}

  ${(props) =>
    props.$type === "channel" &&
    css`
      width: 133px;
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

interface StyledTrackerRowProps {
  $isStepMarker?: boolean;
  $isActive?: boolean;
}

export const StyledTrackerRow = styled.tr<StyledTrackerRowProps>`
  ${(props) =>
    props.$isStepMarker
      ? css`
          td {
            background-color: ${props.theme.colors.tracker.activeBackground};
          }
        `
      : ""}
  ${(props) =>
    props.$isActive
      ? css`
          background-color: ${props.theme.colors.tracker.activeBackground};
        `
      : ""}
`;

interface StyledTrackerCellProps {
  $isPlaying?: boolean;
  $isMuted?: boolean;
}

export const StyledTrackerCell = styled.td<StyledTrackerCellProps>`
  font-family: "Public Pixel", monospace;
  font-size: 12px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.tracker.text};
  border-width: 0 1px 0 0;
  border-color: ${(props) => props.theme.colors.tracker.border};
  border-style: solid;
  margin: 0;
  height: 25px;
  padding: 0;
  justify-content: center;
  align-items: center;
  text-align: center;

  background-color: ${(props) => props.theme.colors.tracker.background};

  ${(props) =>
    props.$isPlaying
      ? css`
          && {
            background-color: ${props.theme.colors.highlight};
            color: ${props.theme.colors.highlightText};
          }
          ${StyledTrackerField} {
            color: ${props.theme.colors.highlightText};
          }
        `
      : ""}

  ${(props) =>
    props.$isMuted
      ? css`
          opacity: 0.3;
        `
      : ""}
`;

export const StyledTrackerField = styled.span<{
  $active?: boolean;
  $selected?: boolean;
}>`
  &:hover {
    box-shadow: 0px 0px 0px 2px rgba(255, 0, 0, 0.2) inset;
  }
  margin: 0;
  padding: 5px 4px;
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
          box-shadow: 0px 0px 0px 2px rgba(255, 0, 0, 0.2) inset;
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
