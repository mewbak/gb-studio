import styled, { css } from "styled-components";
import { StyledButton } from "ui/buttons/style";

// const slideUp = keyframes`
//   from {
//     transform: translateY(100%);
//   }
//   to {
//     transform: translateY(0);
//   }
// `;

export const StyledMobileToolbarSpacer = styled.div`
  height: 60px;
  flex-shrink: 0;
`;

export const StyledMobileToolbar = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  height: 60px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 10px;
  padding: 5px 10px;
  box-sizing: border-box;
  background: ${(props) => props.theme.colors.background};
  z-index: 10000;

  ${StyledButton} {
    height: 100%;
    flex: 1;
  }
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
  background: blue;
  height: 80px;
`;

export const StyledMobileOverlay = styled.div<{
  $open: boolean;
  $fullHeight?: boolean;
}>`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: auto;
  background: ${(props) => props.theme.colors.sidebar.background};
  z-index: ${(props) => (props.$open ? "1001" : "1000")};
  transition:
    transform 250ms ease-out,
    opacity 250ms ease-out;

  transform: translateY(${(props) => (props.$open ? "0" : "100%")});
  // opacity: ${(props) => (props.$open ? 1 : 0)};
  pointer-events: ${(props) => (props.$open ? "auto" : "none")};

  padding-bottom: 60px;
  box-sizing: border-box;

  ${(props) =>
    props.$fullHeight
      ? css`
          top: 0;
          height: auto;
          max-height: none;
        `
      : css`
          top: auto;
          height: auto;
          max-height: 100dvh;
        `}
`;
