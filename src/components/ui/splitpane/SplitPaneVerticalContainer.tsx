import React, {
  Children,
  ReactElement,
  ReactNode,
  isValidElement,
  useMemo,
} from "react";
import { SplitPaneVerticalDivider } from "ui/splitpane/SplitPaneDivider";
import useVerticalSplitPane, {
  SplitPaneLayout,
} from "ui/hooks/use-vertical-split-pane";
export type { SplitPaneLayout } from "ui/hooks/use-vertical-split-pane";

const COLLAPSED_SIZE = 30;

export interface SplitPaneChildProps {
  height?: number;
  onToggle?: () => void;
  ensureMinHeight?: (minHeight: number) => void;
}

interface SplitPaneVerticalContainerProps {
  height: number;
  children: ReactNode;
  minPaneSize?: number;
  collapsedSize?: number;
  defaultLayout?: SplitPaneLayout[];
}

export const SplitPaneVerticalContainer = ({
  height,
  children,
  minPaneSize = COLLAPSED_SIZE,
  collapsedSize = COLLAPSED_SIZE,
  defaultLayout,
}: SplitPaneVerticalContainerProps) => {
  const childArray = useMemo(
    () =>
      Children.toArray(children).filter(
        (child): child is ReactElement<SplitPaneChildProps> =>
          isValidElement<SplitPaneChildProps>(child),
      ),
    [children],
  );

  const panelCount = childArray.length;

  const { sizes, onDragStart, togglePane, ensurePaneMinHeight } =
    useVerticalSplitPane({
      height,
      panelCount,
      minPaneSize,
      collapsedSize,
      defaultLayout,
    });

  if (panelCount <= 0 || height <= 0) {
    return null;
  }

  return (
    <>
      {childArray.map((child, index) => {
        const paneHeight = sizes[index] ?? 0;
        const isLast = index === panelCount - 1;

        return (
          <React.Fragment key={child.key ?? index}>
            {React.cloneElement(child, {
              height: paneHeight,
              onToggle: () => togglePane(index),
              ensureMinHeight: (minHeight: number) =>
                ensurePaneMinHeight(index, minHeight),
            })}
            {!isLast ? (
              <SplitPaneVerticalDivider onMouseDown={onDragStart(index)} />
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default SplitPaneVerticalContainer;
