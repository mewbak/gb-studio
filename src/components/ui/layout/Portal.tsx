import { ReactNode } from "react";
import ReactDOM from "react-dom";

export const portalRoot: HTMLElement = document.getElementById(
  "MenuPortal",
) as HTMLElement;

interface PortalProps {
  children: ReactNode;
  root?: HTMLElement;
}

export const Portal = ({ children, root }: PortalProps) => {
  return ReactDOM.createPortal(children, root ?? portalRoot);
};
