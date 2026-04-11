import React, { useCallback, useRef } from "react";
import { StyledPianoKeyboard, StyledPianoKey } from "./style";
import { MAX_OCTAVE, TOTAL_OCTAVES } from "consts";

interface PianoKeyboardProps {
  hoverNote: number | null;
  onPlayNote: (noteIndex: number) => void;
}

const octaves = Array.from({ length: TOTAL_OCTAVES }, (_, i) => MAX_OCTAVE - i);

const notes = [
  "B",
  "A#",
  "A",
  "G#",
  "G",
  "F#",
  "F",
  "E",
  "D#",
  "D",
  "C#",
  "C",
] as const;

const blackNotes = ["A#", "G#", "F#", "D#", "C#"];
const tallNotes = ["A", "G", "D"];

export const PianoKeyboard = ({
  hoverNote,
  onPlayNote,
}: PianoKeyboardProps) => {
  const keyboardRef = useRef<HTMLDivElement | null>(null);
  const activeTouchesRef = useRef(new Map<number, number | null>());

  const getNoteFromTouch = useCallback((touch: React.Touch | Touch) => {
    const element = document.elementFromPoint(
      touch.clientX,
      touch.clientY,
    ) as HTMLElement | null;

    const keyElement = element?.closest(
      "[data-note-number]",
    ) as HTMLElement | null;

    if (!keyElement) {
      return null;
    }

    const noteNumber = Number(keyElement.dataset.noteNumber);
    return Number.isNaN(noteNumber) ? null : noteNumber;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      for (const touch of Array.from(e.changedTouches)) {
        const noteNumber = getNoteFromTouch(touch);
        activeTouchesRef.current.set(touch.identifier, noteNumber);

        if (noteNumber !== null) {
          onPlayNote(noteNumber);
        }
      }
    },
    [getNoteFromTouch, onPlayNote],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      for (const touch of Array.from(e.changedTouches)) {
        const previousNote = activeTouchesRef.current.get(touch.identifier);
        const noteNumber = getNoteFromTouch(touch);

        if (noteNumber !== previousNote) {
          activeTouchesRef.current.set(touch.identifier, noteNumber);
          if (noteNumber !== null) {
            onPlayNote(noteNumber);
          }
        }
      }
    },
    [getNoteFromTouch, onPlayNote],
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    for (const touch of Array.from(e.changedTouches)) {
      activeTouchesRef.current.delete(touch.identifier);
    }
  }, []);

  const handleTouchCancel = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.stopPropagation();
      for (const touch of Array.from(e.changedTouches)) {
        activeTouchesRef.current.delete(touch.identifier);
      }
    },
    [],
  );

  const isDraggingRef = useRef(false);

  const handleMouseDown = useCallback(
    (noteNumber: number) => {
      isDraggingRef.current = true;
      onPlayNote(noteNumber);
    },
    [onPlayNote],
  );

  const handleMouseEnter = useCallback(
    (noteNumber: number) => {
      if (isDraggingRef.current) {
        onPlayNote(noteNumber);
      }
    },
    [onPlayNote],
  );

  React.useEffect(() => {
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <StyledPianoKeyboard
      ref={keyboardRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{ touchAction: "none" }}
    >
      {octaves.map((octave) => {
        const base = (octave - 3) * 12;

        return (
          <React.Fragment key={`pianokey_${octave}`}>
            {notes.map((note, index) => {
              const offset = notes.length - 1 - index;
              const noteNumber = base + offset;
              const isBlack = blackNotes.includes(note);
              const isTall = tallNotes.includes(note);
              const isC = note === "C";

              return (
                <StyledPianoKey
                  key={`${note}${octave}`}
                  data-note-number={noteNumber}
                  $color={isBlack ? "black" : "white"}
                  $highlight={hoverNote === noteNumber}
                  $tall={isTall || undefined}
                  title={`${note}${octave}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.buttons & 1) {
                      handleMouseDown(noteNumber);
                    }
                  }}
                  onMouseEnter={() => {
                    handleMouseEnter(noteNumber);
                  }}
                >
                  {isC ? `C${octave}` : undefined}
                </StyledPianoKey>
              );
            })}
          </React.Fragment>
        );
      })}
    </StyledPianoKeyboard>
  );
};
