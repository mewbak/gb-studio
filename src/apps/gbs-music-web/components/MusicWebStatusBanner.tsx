import React from "react";
import styled from "styled-components";
import { Button } from "ui/buttons/Button";

const StyledBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  color: ${(props) => props.theme.colors.highlightText};
  background: ${(props) => props.theme.colors.highlight};
  box-sizing: border-box;
`;

const StyledBannerText = styled.div`
  flex-grow: 1;
`;

export interface MusicWebStatusBannerProps {
  title: string;
  actionLabel: string;
  onAction: () => void;
}

export const MusicWebStatusBanner = ({
  title,
  actionLabel,
  onAction,
}: MusicWebStatusBannerProps) => {
  return (
    <StyledBanner onClick={onAction}>
      <StyledBannerText>{title}</StyledBannerText>
      <Button variant="primary">{actionLabel}</Button>
    </StyledBanner>
  );
};
