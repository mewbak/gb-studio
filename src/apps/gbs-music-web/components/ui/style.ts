import styled, { css } from "styled-components";
import { StyledButton } from "ui/buttons/style";

export const StyledMobileToolbar = styled.div`
  display: flex;
  height: 50px;
  justify-content: center;
  flex-shrink: 0;
  gap: 10px;
  padding: 5px 10px;
  background: ${(props) => props.theme.colors.background};
  z-index: 10000;
  background: red;
  background: ${(props) => props.theme.colors.panel.background};
  border-top: 1px solid ${(props) => props.theme.colors.panel.border};
  padding-bottom: calc(5px + env(safe-area-inset-bottom));

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
  position: relative;
  flex-grow: 1;
  height: 40px;
  border-radius: 4px;
  border: 0;
  background: transparent;
  padding-bottom: 5px;
  padding-top: 5px;
  color: ${(props) => props.theme.colors.button.text};
  font-weight: bold;

  svg {
    height: 17px;
    width: 17px;
    max-width: 100%;
    max-height: 100%;
    min-width: 17px;
    min-height: 17px;
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

export const StyledMobileToolbarDivider = styled.div`
  background: ${(props) => props.theme.colors.panel.divider};
  min-width: 1px;
  min-height: 1px;
  height: 30px;
  margin: 5px 5px;
`;

export const StyledMobileOverlayWrapper = styled.div<{
  $open: boolean;
  $fullHeight?: boolean;
}>`
  position: fixed;
  left: -1px;
  right: -1px;
  bottom: 0;
  z-index: ${(props) => (props.$open ? "1001" : "1000")};
  transition: transform 200ms ease-in-out;
  transform: translateY(${(props) => (props.$open ? "0" : "100%")});
  pointer-events: ${(props) => (props.$open ? "auto" : "none")};
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 50px);
`;

export const StyledMobileOverlayContainer = styled.div<{
  $open: boolean;
  $fullHeight?: boolean;
  $isDragging?: boolean;
}>`
  background: ${(props) => props.theme.colors.sidebar.background};
  padding-bottom: calc(0px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  box-shadow: ${(props) =>
    props.$open ? "0px -10px 10px rgba(0, 0, 0, 0.3)" : "none"};
  border: 1px solid ${(props) => props.theme.colors.sidebar.border};
  border-bottom: 0;
  display: flex;
  flex-direction: column;

  ${(props) =>
    !props.$isDragging
      ? css`
          transition: transform 100ms ease-in-out;
        `
      : ""}

  ${(props) =>
    props.$fullHeight
      ? css`
          top: 40px;
          height: calc(100dvh - 50px);
          max-height: 800px;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          padding-top: 28px;
        `
      : css`
          top: auto;
          min-height: 0px;
          max-height: calc(100dvh - 50px);
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          padding-top: 28px;
        `}

  &:after {
    content: "";
    display: block;
    width: 100%;
    height: 250px;
    background: ${(props) => props.theme.colors.sidebar.background};
    position: absolute;
    bottom: -249px;
  }
`;

export const StyledMobileOverlayClose = styled.div`
  position: absolute;
  bottom: 100%;
  width: 100%;
  background: transparent;
  height: 100vh;
`;

export const StyledMobileOverlayHandle = styled.div`
  position: absolute;
  height: 55px;
  top: -25px;
  left: 0px;
  right: 0px;
  background: transparent;
  touch-action: none;

  &:before {
    position: relative;
    top: 37px;
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

export const StyledMobileOverlayContent = styled.div`
  height: 100%;
  overflow: auto;
  flex-grow: 1;
  min-height: 0px;
`;

export const StyledMobileBackButton = styled.button`
  display: block;
  width: 40px;
  height: 40px;
  border-radius: 60px;
  margin-bottom: -40px;
  background: transparent;
  position: relative;
  left: 5px;
  border: 0;
  transform: rotate(-90deg);
  svg {
    fill: ${(props) => props.theme.colors.text};
    width: 20px;
    height: 20px;
  }
`;

export const StyledMobileCloseButton = styled.button`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 60px;
  margin-bottom: -40px;
  background: ${(props) => props.theme.colors.input.background};
  border: 1px solid ${(props) => props.theme.colors.input.border};
  top: 15px;
  right: 10px;
  transform: rotate(-90deg);
  z-index: 10;

  svg {
    fill: ${(props) => props.theme.colors.text};
    width: 20px;
    height: 20px;
    opacity: 0.75;
  }
`;

export const StyledMobileListMenu = styled.div`
  margin: 0 10px;
  > :first-child {
    border-top: 1px solid ${(props) => props.theme.colors.input.border};
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }
  > :last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }
`;

export const StyledMobileListMenuHeader = styled.div`
  padding: 10px 20px;
  display: flex;
  align-items: center;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: bold;

  @media (max-width: 840px) {
    font-size: 14px;
  }
`;

export const StyledMobileListMenuItem = styled.button`
  background: ${(props) => props.theme.colors.input.background};
  color: ${(props) => props.theme.colors.input.text};
  border-left: 1px solid ${(props) => props.theme.colors.input.border};
  border-right: 1px solid ${(props) => props.theme.colors.input.border};
  border-bottom: 1px solid ${(props) => props.theme.colors.input.border};
  border-top: 0;
  height: 50px;
  font-size: 14px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  font-weight: bold;
  width: 100%;
  text-align: left;
  box-sizing: border-box;

  span {
    flex-grow: 1;
  }

  &:focus {
    position: relative;
    z-index: 1;
  }
`;

export const StyledMobileListMenuLink = styled.a`
  background: ${(props) => props.theme.colors.input.background};
  color: ${(props) => props.theme.colors.input.text};
  border-left: 1px solid ${(props) => props.theme.colors.input.border};
  border-right: 1px solid ${(props) => props.theme.colors.input.border};
  border-bottom: 1px solid ${(props) => props.theme.colors.input.border};
  border-top: 0;
  height: 50px;
  font-size: 14px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  font-weight: bold;
  width: 100%;
  text-align: left;
  box-sizing: border-box;
  text-decoration: none;

  span {
    flex-grow: 1;
  }

  &:focus {
    position: relative;
    z-index: 1;
  }
`;

export const StyledMobileListMenuCaret = styled.div`
  svg {
    fill: ${(props) => props.theme.colors.text};
    opacity: 0.5;
    width: 16px;
  }
`;
