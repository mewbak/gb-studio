import React from "react";
import { useDrop } from "react-dnd";
import { useFlatListOuterDropContext } from "ui/lists/FlatListOuterDropContext";
import {
  StyledListDropzone,
  StyledListWithDropzoneWrapper,
} from "ui/lists/style";

export const FlatListOuterDropTarget = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { acceptTypes, onItemDrop } = useFlatListOuterDropContext<unknown>();

  const [{ isOver }, drop] = useDrop<unknown, void, { isOver: boolean }>({
    accept: acceptTypes,
    drop: (item, monitor) => {
      if (monitor.didDrop()) {
        return;
      }
      onItemDrop(item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  });

  return (
    <StyledListWithDropzoneWrapper {...props} ref={ref}>
      {props.children}
      <StyledListDropzone
        ref={(node) => {
          drop(node);
        }}
        $isOver={isOver}
      />
    </StyledListWithDropzoneWrapper>
  );
});

FlatListOuterDropTarget.displayName = "FlatListOuterDropTarget";
