import styled, { keyframes } from "styled-components";
import { StyledButton } from "ui/buttons/style";

const appear = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.2);
  }

  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
`;

export const StyledConfirmModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  width: min(300px, calc(100vw - 40px));
  transform: translate(-50%, -50%);
  background: ${(props) => props.theme.colors.card.background}33;
  color: ${(props) => props.theme.colors.card.text};
  border: 1px solid ${(props) => props.theme.colors.card.border};
  padding: 20px;
  z-index: 1001;
  box-sizing: border-box;
  border-radius: 34px;
  backdrop-filter: blur(10px);

  box-shadow:
    0 0 40px 50px rgba(0, 0, 0, 0.1),
    0 0 25px 15px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(128, 128, 128, 0.5);

  animation: ${appear} 0.2s ease-in-out;
  animation-iteration-count: 1;

  @media (max-width: 840px) {
    font-size: 16px;
  }
`;

export const StyledConfirmCloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.19);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.37);
  display: flex;
  align-items: center;
  justify-content: center;
  svg {
    max-width: 15px;
    max-height: 15px;
    fill: ${(props) => props.theme.colors.text};
  }
`;

export const StyledConfirmTitle = styled.div`
  font-weight: bold;
  margin-bottom: 10px;
  font-size: 16px;

  @media (max-width: 840px) {
    font-size: 18px;
  }
`;

export const StyledConfirmDetail = styled.p`
  margin: 0;
  line-height: 1.5;
`;

export const StyledConfirmActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  flex-direction: column;
  ${StyledButton} {
    border-radius: 14px;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    border: 1px solid rgba(255, 255, 255, 0.37);
  }
  ${StyledButton}[data-variant="normal"] {
    background: rgba(255, 255, 255, 0.19);
  }
  ${StyledButton}:focus {
    box-shadow:
      0 4px 30px rgba(0, 0, 0, 0.1),
      0 0 0px 2px #c92c61;
  }
  @media (max-width: 840px) {
    ${StyledButton} {
      height: 48px;
      font-size: 14px;
    }
  }
`;
