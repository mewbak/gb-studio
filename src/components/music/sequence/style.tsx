import styled, { css } from "styled-components";

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
  $selected: boolean;
  $filtered: boolean;
}

export const StyledSequenceItem = styled.div<StyledSequenceItemProps>`
  border: 1px solid ${(props) => props.theme.colors.tracker.border};
  background-color: ${(props) => props.theme.colors.button.nestedBackground};
  color: #000;
  padding: 4px;
  min-width: 60px;
  border-radius: 4px;
  box-sizing: border-box;

  svg {
    fill: #000;
  }

  ${(props) =>
    props.$selected
      ? css`
          outline: 4px solid ${(props) => props.theme.colors.highlight};
        `
      : ""}

  ${(props) =>
    props.$filtered &&
    css`
      filter: grayscale(1);
    `}

  & .CustomSelect {
    max-width: 50px;
  }
`;

export const StyledSequenceItemHeader = styled.div<{
  $direction: "horizontal" | "vertical";
}>`
  display: flex;
  align-items: center;
  span {
    flex-grow: 1;
  }
  margin-bottom: 5px;

  ${(props) =>
    props.$direction === "vertical" &&
    css`
      padding-left: 5px;
      margin-bottom: 0px;
    `}
`;

export const StyledAddSequenceButton = styled.button`
  background: ${(props) => props.theme.colors.button.nestedBackground};
  min-width: 60px;
  min-height: 56px;
  border: 0;
  border-radius: 4px;
  svg {
    fill: ${(props) => props.theme.colors.button.text};
  }
  &:hover {
    background: ${(props) => props.theme.colors.button.nestedActiveBackground};
  }
`;
