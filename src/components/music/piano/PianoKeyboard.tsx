import React, { useCallback, useEffect, useRef } from "react";
import { StyledPianoKeyboard, StyledPianoKey } from "./style";
import { MAX_OCTAVE, TOTAL_OCTAVES } from "consts";
import { useAppSelector } from "store/hooks";

interface PianoKeyboardProps {
  onPlayNote: (noteIndex: number) => void;
}

interface PianoKeyProps {
  noteNumber: number;
  note: (typeof notes)[number];
  octave: number;
  isBlack: boolean;
  isTall: boolean;
  isC: boolean;
  onMouseDownNote: (noteNumber: number) => void;
  onMouseEnterNote: (noteNumber: number) => void;
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

const blackNotes = new Set(["A#", "G#", "F#", "D#", "C#"]);
const tallNotes = new Set(["A", "G", "D"]);

const PianoKey = React.memo(
  ({
    noteNumber,
    note,
    octave,
    isBlack,
    isTall,
    isC,
    onMouseDownNote,
    onMouseEnterNote,
  }: PianoKeyProps) => {
    const isHighlighted = useAppSelector(
      (state) => state.tracker.hoverNote === noteNumber,
    );

    const handleMouseDown = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.buttons & 1) {
          onMouseDownNote(noteNumber);
        }
      },
      [noteNumber, onMouseDownNote],
    );

    const handleMouseEnter = useCallback(() => {
      onMouseEnterNote(noteNumber);
    }, [noteNumber, onMouseEnterNote]);

    return (
      <StyledPianoKey
        data-note-number={noteNumber}
        $color={isBlack ? "black" : "white"}
        $highlight={isHighlighted}
        $tall={isTall || undefined}
        title={`${note}${octave}`}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
      >
        {isC ? `C${octave}` : undefined}
      </StyledPianoKey>
    );
  },
);

PianoKey.displayName = "PianoKey";

export const PianoKeyboard = ({ onPlayNote }: PianoKeyboardProps) => {
  const keyboardRef = useRef<HTMLDivElement | null>(null);
  const activeTouchesRef = useRef(new Map<number, number | null>());
  const isDraggingRef = useRef(false);

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

  useEffect(() => {
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
        return notes.map((note, index) => {
          const offset = notes.length - 1 - index;
          const noteNumber = base + offset;
          const isBlack = blackNotes.has(note);
          const isTall = tallNotes.has(note);
          const isC = note === "C";

          return (
            <PianoKey
              key={`${note}${octave}`}
              noteNumber={noteNumber}
              note={note}
              octave={octave}
              isBlack={isBlack}
              isTall={isTall}
              isC={isC}
              onMouseDownNote={handleMouseDown}
              onMouseEnterNote={handleMouseEnter}
            />
          );
        });
      })}
    </StyledPianoKeyboard>
  );
};
