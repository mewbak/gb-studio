import styled, { css } from "styled-components";

export const StyledSequenceEditorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background-color: ${(props) => props.theme.colors.sidebar.background};
  flex-shrink: 0;

  .CustomSelect {
    min-width: 0;
  }
`;

interface StyledSequenceItemProps {
  $active: boolean;
  $selected: boolean;
}

export const StyledSequenceItem = styled.div<StyledSequenceItemProps>`
  border: 1px solid ${(props) => props.theme.colors.tracker.border};
  background-color: ${(props) => props.theme.colors.button.nestedBackground};
  color: ${(props) => props.theme.colors.input.text};
  padding: 4px;
  min-width: 60px;
  border-radius: 4px;
  box-sizing: border-box;

  ${(props) =>
    props.$selected
      ? css`
          box-shadow: 0 0 0px 4px ${(props) => props.theme.colors.highlight};
        `
      : ""}
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
