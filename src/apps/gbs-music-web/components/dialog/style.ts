import styled from "styled-components";
import { MenuOverlay } from "ui/menu/Menu";

export const StyledConfirmOverlay = styled(MenuOverlay)`
  background: rgba(0, 0, 0, 0.35);
`;

export const StyledConfirmModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  width: min(300px, calc(100vw - 32px));
  transform: translate(-50%, -50%);
  background: ${(props) => props.theme.colors.card.background};
  color: ${(props) => props.theme.colors.card.text};
  border: 1px solid ${(props) => props.theme.colors.card.border};
  box-shadow: ${(props) => props.theme.colors.card.boxShadow};
  border-radius: 20px;
  padding: 24px;
  z-index: 1001;
`;

export const StyledConfirmTitle = styled.div`
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 10px;
`;

export const StyledConfirmDetail = styled.p`
  margin: 0;
  line-height: 1.5;
`;

export const StyledConfirmActions = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 20px;
  margin-top: 20px;
`;
