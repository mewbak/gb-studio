import styled, { css } from "styled-components";
import { StyledButton } from "ui/buttons/style";

export const StyledMobileToolbar = styled.div`
  display: flex;

  height: calc(50px + env(safe-area-inset-bottom));
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 10px;
  padding: 5px 10px;
  box-sizing: border-box;
  background: ${(props) => props.theme.colors.background};
  z-index: 10000;
  background: red;
  background: ${(props) => props.theme.colors.panel.background};
  border-top: 1px solid ${(props) => props.theme.colors.panel.border};

  ${StyledButton} {
    height: 100%;
    flex: 1;
  }

  ${StyledButton}:hover,
  ${StyledButton}:active {
    background: transparent;
    -webkit-tap-highlight-color: transparent;
  }
`;

export const StyledMobileToolbarButton = styled.button<{
  $isActive?: boolean;
  $isAvailable?: boolean;
}>`
  flex-grow: 1;
  // height: 100%;
  height: 40px;
  border-radius: 4px;
  border: 0;
  background: transparent;
  padding-bottom: calc(5px + env(safe-area-inset-bottom));
  padding-top: 5px;
  // border-right: 1px solid ${(props) => props.theme.colors.toolbar.border};
  color: ${(props) => props.theme.colors.button.text};

  // &:last-child {
  //   border-right: 0;
  // }
  font-weight: bold;

  svg {
    height: 17px;
    width: 17px;
    max-width: 100%;
    max-height: 100%;
    min-width: 17px;
    margin: 0;
    fill: ${(props) => props.theme.colors.button.text};
    opacity: ${(props) => (props.disabled ? 0.3 : 1)};
  }

  ${(props) =>
    props.$isActive &&
    css`
      background: ${(props) => props.theme.colors.panel.selectedBackground};
    `}

  ${(props) =>
    props.$isAvailable === false &&
    css`
      opacity: 0.1;
    `}
`;

export const StyledMobileInstrumentsView = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: auto;
  background: ${(props) => props.theme.colors.sidebar.background};
  z-index: 1000;
  view-transition-name: overlay;
`;

export const StyledMobileChannelsView = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: auto;
  background: ${(props) => props.theme.colors.sidebar.background};
  z-index: 1000;
  view-transition-name: channels;
`;

export const StyledMobilePaneHeader = styled.div`
  display: flex;
  background: ${(props) => props.theme.colors.sidebar.header.background};
  border-top: 1px solid ${(props) => props.theme.colors.sidebar.header.border};
  border-bottom: 1px solid
    ${(props) => props.theme.colors.sidebar.header.border};
  height: 30px;
  justify-content: flex-end;
`;

export const StyledMobileOverlay = styled.div<{
  $open: boolean;
  $fullHeight?: boolean;
}>`
  position: fixed;
  left: -1px;
  right: -1px;
  bottom: 0;
  background: ${(props) => props.theme.colors.sidebar.background};
  z-index: ${(props) => (props.$open ? "1001" : "1000")};
  transition: transform 200ms ease-in-out;

  transform: translateY(${(props) => (props.$open ? "0" : "100%")});
  pointer-events: ${(props) => (props.$open ? "auto" : "none")};

  padding-bottom: calc(0px + env(safe-area-inset-bottom));

  box-sizing: border-box;
  box-shadow: ${(props) =>
    props.$open ? "0px 2px 50px rgba(0, 0, 0, 0.8)" : "none"};

  border: 1px solid ${(props) => props.theme.colors.sidebar.border};
  border-bottom: 0;

  ${(props) =>
    props.$fullHeight
      ? css`
          top: 0px;
          height: auto;
          max-height: none;
        `
      : css`
          top: auto;
          height: auto;
          max-height: 100dvh;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          padding-top: 12px;
        `}
  ${(props) =>
    !props.$open &&
    css`
      ${StyledMobileOverlayClose} {
        display: none;
      }
    `};

  &:before {
    content: "";
    display: block;
    width: 40px;
    height: 4px;
    background: ${(props) => props.theme.colors.sidebar.border};
    margin: 0px auto;
    margin-bottom: 10px;
    border-radius: 16px;
  }
`;

export const StyledMobileOverlayClose = styled.div`
  position: absolute;
  bottom: 100%;
  width: 100%;
  background: transparent;
  height: 100vh;
`;

export const StyledMobileOverlayContent = styled.div`
  max-height: 100%;
  overflow: auto;
`;

export const StyledSafeMarginBottom = styled.div`
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom);
`;
