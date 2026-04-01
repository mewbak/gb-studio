import React, { useContext, useEffect, useRef } from "react";
import { ThemeContext } from "styled-components";

interface InstrumentEnvelopePreviewProps {
  volume: number;
  sweep: number;
  length: number | null;
}

const PADDING = 10;

export const InstrumentEnvelopePreview = ({
  volume,
  sweep,
  length,
}: InstrumentEnvelopePreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeContext = useContext(ThemeContext);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    if (!themeContext) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;

    const drawWidth = canvas.width - PADDING * 2;
    const drawHeight = canvas.height - PADDING * 2;
    const ctx = canvas.getContext("2d");

    const normalisedVolume = volume / 15;
    const secLength = length === null ? 1 : length / 256;
    const centerLineY = canvas.height - PADDING - (7 / 15) * drawHeight;

    const defaultColor = themeContext.colors.highlight;

    // eslint-disable-next-line no-self-assign
    canvas.width = canvas.width;
    // eslint-disable-next-line no-self-assign
    canvas.height = canvas.height;

    if (ctx) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw center line
      ctx.beginPath();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.moveTo(0, centerLineY);
      ctx.lineTo(canvas.width, centerLineY);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.lineCap = "round";

      ctx.shadowColor = defaultColor;
      ctx.shadowBlur = 5; // glow strength

      ctx.beginPath();
      ctx.moveTo(
        PADDING,
        canvas.height - PADDING - normalisedVolume * drawHeight,
      );

      let localsweep;
      if (sweep < 0) {
        //fade down
        localsweep = sweep + 8;
        const envLength = ((localsweep / 64) * volume) / 2;

        ctx.lineTo(
          PADDING + Math.min(envLength, secLength) * drawWidth,
          drawHeight +
            PADDING -
            (1 - Math.min(secLength / envLength, 1)) *
              normalisedVolume *
              drawHeight,
        );
        ctx.lineTo(PADDING + secLength * drawWidth, canvas.height - PADDING);
      } else if (sweep > 0) {
        //fade up
        localsweep = 8 - sweep;
        const envLength = ((sweep / 64) * (15 - volume)) / 2;

        ctx.lineTo(
          PADDING + Math.min(envLength, secLength) * drawWidth,
          (1 - Math.min(secLength / envLength, 1)) *
            normalisedVolume *
            drawHeight +
            PADDING,
        );
        ctx.lineTo(
          PADDING + secLength * drawWidth,
          (1 - Math.min(secLength / envLength, 1)) *
            normalisedVolume *
            drawHeight +
            PADDING,
        );
      } else {
        //no fade
        ctx.lineTo(
          PADDING + secLength * drawWidth,
          canvas.height - PADDING - normalisedVolume * drawHeight,
        );
      }

      if (secLength !== 1) {
        ctx.lineTo(PADDING + secLength * drawWidth, canvas.height - PADDING);
        if (secLength < 1) {
          ctx.lineTo(PADDING + drawWidth, canvas.height - PADDING);
        }
      }

      ctx.shadowColor = defaultColor;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "black";
      for (let i = 0; i < 10; i++) {
        ctx.stroke();
        ctx.shadowBlur = i * 6;
      }

      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.shadowBlur = 0;
      ctx.strokeStyle = defaultColor;
      ctx.stroke();
    }
  }, [volume, length, themeContext, sweep]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100px",
        backgroundColor: "#000",
        borderRadius: 4,
      }}
      height={100}
    />
  );
};
