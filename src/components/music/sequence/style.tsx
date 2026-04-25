import styled, { css } from "styled-components";
import { StyledButton } from "ui/buttons/style";

export const StyledSequenceEditorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background-color: ${(props) => props.theme.colors.sidebar.background};
  flex-shrink: 0;
  min-width: 100%;
  width: 0px;

  .CustomSelect {
    min-width: 0;
  }
`;

interface StyledSequenceItemProps {
  $filtered: boolean;
}

export const StyledSequenceItem = styled.div<StyledSequenceItemProps>`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${(props) => props.theme.colors.button.nestedBackground};
  color: #000;
  padding: 4px;
  height: 64px;
  box-sizing: border-box;
  font-size: 11px;
  flex-grow: 1;

  ${(props) =>
    props.$filtered &&
    css`
      filter: grayscale(1);
    `}

  & .CustomSelect {
    max-width: 50px;
  }
`;

export const StyledSequenceItemBlockHeader = styled.div`
  display: flex;
  font-size: 11px;
  height: 25px;
  align-items: center;
  padding: 0 5px;
`;

export const StyledSequenceItemPatterns = styled.div`
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: auto auto;
  flex-grow: 1;
  gap: 1px;
`;

export const StyledSequenceItemDropdown = styled.div`
  position: absolute;
  top: 2px;
  right: 2px;
`;

interface StyledSequenceItemBlockProps {
  $selected: boolean;
  $filtered: boolean;
  $direction: "horizontal" | "vertical";
}

export const StyledSequenceItemBlock = styled.div<StyledSequenceItemBlockProps>`
  position: relative;
  display: flex;
  border-radius: 4px;
  min-height: 64px;
  min-width: 100px;
  background-color: ${(props) => props.theme.colors.sidebar.header.background};
  overflow: hidden;
  outline: 1px solid ${(props) => props.theme.colors.sidebar.header.border};
  box-sizing: border-box;

  ${StyledButton} {
    height: 22px;
  }

  ${(props) =>
    props.$direction === "horizontal" &&
    css`
      flex-direction: column;
      ${StyledSequenceItemPatterns} {
        flex-direction: column;
      }
    `}

  ${(props) =>
    props.$direction === "vertical" &&
    css`
      width: 100%;
      min-height: 48px;
      ${StyledSequenceItemBlockHeader} {
        min-width: 20px;
        align-self: center;
        justify-content: center;
      }
      ${StyledSequenceItemPatterns} {
        grid-template-columns: auto auto auto auto;
        grid-template-rows: auto;
      }
      ${StyledSequenceItemDropdown} {
        position: static;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 5px;

        ${StyledButton} {
          width: 40px;
          height: 35px;
        }
      }
    `}


  ${(props) =>
    props.$selected
      ? css`
          outline: 4px solid ${(props) => props.theme.colors.highlight};
        `
      : ""}

  ${(props) =>
    props.$direction === "horizontal" &&
    css`
      ${StyledSequenceItem} {
        height: auto;
        padding: 0px 2px;
        border-color: rgba(0, 0, 0, 0.3);
      }
    `}

  ${(props) =>
    props.$direction === "vertical" &&
    css`
      ${StyledSequenceItem} {
        height: 48px;
        padding: 0px;
        font-size: 11px;
        flex-grow: 1;
      }
    `}
`;

export const StyledAddSequenceButton = styled.button`
  background: ${(props) => props.theme.colors.button.nestedBackground};
  min-width: 100px;
  min-height: 64px;
  border: 0;
  border-radius: 4px;
  svg {
    fill: ${(props) => props.theme.colors.button.text};
  }
  &:hover {
    background: ${(props) => props.theme.colors.button.nestedActiveBackground};
  }
`;
