import React, { useCallback, useRef } from "react";
import { StyledPianoKeyboard, StyledPianoKey } from "./style";
import { MAX_OCTAVE, TOTAL_OCTAVES } from "consts";

interface PianoKeyboardProps {
  hoverNote: number | null;
  c5Ref: React.RefObject<HTMLDivElement>;
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
  c5Ref,
  onPlayNote,
}: PianoKeyboardProps) => {
  const keyboardRef = useRef<HTMLDivElement | null>(null);
  const lastTouchedNoteRef = useRef<number | null>(null);

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

  const playTouchedNote = useCallback(
    (touch: React.Touch | Touch) => {
      const noteNumber = getNoteFromTouch(touch);
      if (noteNumber === null) {
        return;
      }

      if (lastTouchedNoteRef.current !== noteNumber) {
        lastTouchedNoteRef.current = noteNumber;
        onPlayNote(noteNumber);
      }
    },
    [getNoteFromTouch, onPlayNote],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 0) {
        return;
      }

      e.preventDefault();
      playTouchedNote(e.touches[0]);
    },
    [playTouchedNote],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 0) {
        return;
      }

      e.preventDefault();
      playTouchedNote(e.touches[0]);
    },
    [playTouchedNote],
  );

  const handleTouchEnd = useCallback(() => {
    lastTouchedNoteRef.current = null;
  }, []);

  const handleTouchCancel = useCallback(() => {
    lastTouchedNoteRef.current = null;
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
              const isC5 = isC && octave === 5;

              return (
                <StyledPianoKey
                  key={`${note}${octave}`}
                  data-note-number={noteNumber}
                  $color={isBlack ? "black" : "white"}
                  $highlight={hoverNote === noteNumber}
                  $tall={isTall || undefined}
                  ref={isC5 ? c5Ref : undefined}
                  title={`${note}${octave}`}
                  onMouseDown={(e) => {
                    if (e.buttons & 1) {
                      onPlayNote(noteNumber);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (e.buttons & 1) {
                      onPlayNote(noteNumber);
                    }
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
