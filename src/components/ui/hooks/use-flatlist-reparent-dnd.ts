import { useCallback } from "react";
import { getParentPath } from "shared/lib/helpers/virtualFilesystem";

export type ReparentArgs = {
  draggedPath: string;
  dropFolder: string;
};

export const useFlatListReparentDnD = <TItem>({
  acceptTypes,
  onReparent,
  isReparentable,
  canDrop,
  getName,
  getDropFolder,
}: {
  acceptTypes: string[];
  onReparent: (item: TItem, args: ReparentArgs) => void;
  isReparentable?: (item: TItem) => boolean;
  canDrop?: (dragged: TItem, target: TItem) => boolean;
  getName: (item: TItem) => string;
  getDropFolder: (target: TItem) => string;
}) => {
  const handleReparent = useCallback(
    (draggedItem: TItem, dropFolder: string) => {
      if (isReparentable && !isReparentable(draggedItem)) {
        return;
      }

      const name = getName(draggedItem);

      if (getParentPath(name) === dropFolder) {
        return;
      }

      onReparent(draggedItem, {
        draggedPath: name,
        dropFolder,
      });
    },
    [isReparentable, getName, onReparent],
  );

  const onDropOntoItem = useCallback(
    (draggedItem: TItem, targetItem: TItem) => {
      if (canDrop && !canDrop(draggedItem, targetItem)) {
        return;
      }

      handleReparent(draggedItem, getDropFolder(targetItem));
    },
    [canDrop, getDropFolder, handleReparent],
  );

  const onDropOntoRoot = useCallback(
    (draggedItem: TItem) => {
      handleReparent(draggedItem, "");
    },
    [handleReparent],
  );

  return {
    onDropOntoItem,
    flatListDropProviderValue: {
      acceptTypes,
      onItemDrop: onDropOntoRoot as (item: unknown) => void,
    },
  };
};
