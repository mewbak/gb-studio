import React, { ReactNode } from "react";
import {
  StyledToolbar,
  StyledToolbarCentre,
  StyledToolbarLeft,
  StyledToolbarRight,
  StyledToolbarTitle,
} from "ui/toolbar/style";

interface ToolbarProps {
  readonly children?: ReactNode;
  readonly focus?: boolean;
}

export const Toolbar = ({ children, focus }: ToolbarProps) => {
  return <StyledToolbar $focus={focus} children={children} />;
};

interface ToolbarTitleProps {
  readonly children?: ReactNode;
}

export const ToolbarTitle = ({ children }: ToolbarTitleProps) => {
  return <StyledToolbarTitle children={children} />;
};

interface ToolbarBlockProps {
  readonly children?: ReactNode;
}

export const ToolbarLeft = ({ children }: ToolbarBlockProps) => {
  return <StyledToolbarLeft children={children} />;
};

export const ToolbarCentre = ({ children }: ToolbarBlockProps) => {
  return <StyledToolbarCentre children={children} />;
};

export const ToolbarRight = ({ children }: ToolbarBlockProps) => {
  return <StyledToolbarRight children={children} />;
};
