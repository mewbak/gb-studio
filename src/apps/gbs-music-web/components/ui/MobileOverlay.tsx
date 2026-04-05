import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyledMobileOverlayClose,
  StyledMobileOverlayContainer,
  StyledMobileOverlayContent,
  StyledMobileOverlayHandle,
  StyledMobileOverlayWrapper,
} from "gbs-music-web/components/ui/style";

const MOBILE_OVERLAY_DRAG_CLOSE_THRESHOLD_PX = 30;
const MOBILE_OVERLAY_MAX_DRAG_UP_PX = 250;
const MOBILE_OVERLAY_ELASTIC_DRAG_UP_PX = 50;

interface MobileOverlayProps {
  open: boolean;
  fullHeight?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const elasticDrag = (
  inputValue: number,
  easeStart: number,
  maxValue: number,
): number => {
  if (inputValue <= easeStart) {
    return inputValue;
  }
  const range = maxValue - easeStart;
  const x = inputValue - easeStart;
  const k = 1 / range;
  return easeStart + range * (1 - Math.exp(-k * x));
};

export const MobileOverlay = ({
  open,
  fullHeight,
  onClose,
  children,
}: MobileOverlayProps) => {
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleStartY = useRef(-1);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    handleStartY.current = e.clientY;
    setIsDragging(true);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const elasticDiffY = elasticDrag(
      -(e.pageY - handleStartY.current),
      MOBILE_OVERLAY_ELASTIC_DRAG_UP_PX,
      MOBILE_OVERLAY_MAX_DRAG_UP_PX,
    );
    setOffsetY(-elasticDiffY);
  }, []);

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const diffY = e.pageY - handleStartY.current;
      if (diffY > MOBILE_OVERLAY_DRAG_CLOSE_THRESHOLD_PX) {
        onClose();
      } else {
        setOffsetY(0);
      }
      setIsDragging(false);
    },
    [onClose],
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", onPointerUp, { passive: false });
    }
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  });

  useEffect(() => {
    if (open) {
      setIsDragging(false);
      setOffsetY(0);
    }
  }, [open]);

  return (
    <StyledMobileOverlayWrapper $open={open} $fullHeight={fullHeight}>
      <StyledMobileOverlayContainer
        style={{
          transform: `translateY(${offsetY}px)`,
        }}
        $open={open}
        $fullHeight={fullHeight}
        $isDragging={isDragging}
      >
        {open && <StyledMobileOverlayClose onClick={onClose} />}
        {open && (
          <StyledMobileOverlayHandle
            onPointerDown={onPointerDown}
            onClick={onClose}
          />
        )}
        <StyledMobileOverlayContent>{children}</StyledMobileOverlayContent>
      </StyledMobileOverlayContainer>
    </StyledMobileOverlayWrapper>
  );
};
