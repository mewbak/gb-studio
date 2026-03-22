import React, { ReactNode, useCallback, useMemo, useState } from "react";
import { ContextMenu } from "ui/menu/ContextMenu";

interface ContextMenuState {
  x: number;
  y: number;
  menu: JSX.Element[];
}

interface UseContextMenuOptions {
  enabled?: boolean;
  getIsEnabled?: (e: React.MouseEvent) => boolean;
  getMenu: (args: { closeMenu: () => void }) => JSX.Element[];
}

interface UseContextMenuResult {
  onContextMenu: (e: React.MouseEvent) => void;
  closeMenu: () => void;
  contextMenuElement: ReactNode;
  isOpen: boolean;
}

export const useContextMenu = ({
  enabled = true,
  getIsEnabled,
  getMenu,
}: UseContextMenuOptions): UseContextMenuResult => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const closeMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) {
        return;
      }
      if (getIsEnabled !== undefined) {
        if (!getIsEnabled(e)) {
          return;
        }
      }

      const menu = getMenu({ closeMenu });

      if (!menu || menu.length === 0) {
        return;
      }

      e.preventDefault();

      setContextMenu({
        x: e.pageX,
        y: e.pageY,
        menu,
      });
    },
    [enabled, getIsEnabled, getMenu, closeMenu],
  );

  const contextMenuElement = useMemo(() => {
    if (!contextMenu) {
      return null;
    }

    return (
      <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeMenu}>
        {contextMenu.menu}
      </ContextMenu>
    );
  }, [contextMenu, closeMenu]);

  return {
    onContextMenu,
    closeMenu,
    contextMenuElement,
    isOpen: contextMenu !== null,
  };
};
