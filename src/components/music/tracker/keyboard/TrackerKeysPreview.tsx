import React, { useMemo } from "react";
import styled from "styled-components";
import { MIN_OCTAVE, OCTAVE_SIZE } from "consts";
import {
  milkytrackerKeys,
  openMPTKeys,
} from "renderer/lib/keybindings/defaultKeys";
import { useTrackerKeyBindings } from "components/music/hooks/useTrackerKeyBindings";

interface TrackerKeysPreviewProps {
  octaveOffset: number;
}

const KEYBOARD_ROWS = [
  [
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
    "Digit0",
    "Minus",
    "Equal",
  ],
  [
    "KeyQ",
    "KeyW",
    "KeyE",
    "KeyR",
    "KeyT",
    "KeyY",
    "KeyU",
    "KeyI",
    "KeyO",
    "KeyP",
    "BracketLeft",
    "BracketRight",
  ],
  [
    "KeyA",
    "KeyS",
    "KeyD",
    "KeyF",
    "KeyG",
    "KeyH",
    "KeyJ",
    "KeyK",
    "KeyL",
    "Semicolon",
    "Quote",
    "Backslash",
  ],
  [
    "KeyZ",
    "KeyX",
    "KeyC",
    "KeyV",
    "KeyB",
    "KeyN",
    "KeyM",
    "Comma",
    "Period",
    "Slash",
  ],
] as const;

const KEYBOARD_ROW_OFFSETS = [0, 16, 28, 44];

const KEY_LABELS: Record<string, string> = {
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  Digit0: "0",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Semicolon: ";",
  Quote: "'",
  Backslash: "\\",
  Comma: ",",
  Period: ".",
  Slash: "/",
};

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const KeyboardPreview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
`;

const KeyboardRow = styled.div<{ $offset: number }>`
  display: flex;
  gap: 6px;
  margin-left: ${(props) => props.$offset}px;
`;

const KeyboardKey = styled.div<{ $active: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: ${(props) =>
    props.$active
      ? `${props.theme.colors.highlight}`
      : props.theme.colors.input.background};
  color: ${(props) =>
    props.$active ? props.theme.colors.highlightText : props.theme.colors.text};
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
`;

const KeyboardKeyCode = styled.div`
  position: absolute;
  top: 6px;
  left: 8px;
  font-size: 11px;
  font-weight: bold;
  opacity: 0.75;
`;

const KeyboardKeyNote = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 8px;
  text-align: center;
  font-size: 12px;
  font-weight: bold;
`;

const formatKeyLabel = (code: string) =>
  KEY_LABELS[code] ?? code.replace(/^Key/, "");

const formatNoteLabel = (note: number, octaveOffset: number) => {
  const noteIndex = note + octaveOffset * OCTAVE_SIZE;
  const octave = MIN_OCTAVE + Math.floor(noteIndex / OCTAVE_SIZE);
  return `${NOTE_NAMES[noteIndex % OCTAVE_SIZE]}${octave}`;
};

export const TrackerKeysPreview = ({
  octaveOffset,
}: TrackerKeysPreviewProps) => {
  const trackerKeyBindings = useTrackerKeyBindings();

  const noteLabelsByCode = useMemo(() => {
    const noteBindings =
      trackerKeyBindings === 1 ? milkytrackerKeys : openMPTKeys;

    const labels: Record<string, string> = {};

    for (const binding of noteBindings) {
      if (
        binding.when === "noteColumnFocus" &&
        binding.command === "editNoteField" &&
        typeof binding.args === "number"
      ) {
        labels[binding.code] = formatNoteLabel(binding.args, octaveOffset);
      }
    }

    return labels;
  }, [octaveOffset, trackerKeyBindings]);

  return (
    <KeyboardPreview>
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <KeyboardRow key={rowIndex} $offset={KEYBOARD_ROW_OFFSETS[rowIndex]}>
          {row.map((code) => {
            const noteLabel = noteLabelsByCode[code];
            return (
              <KeyboardKey key={code} $active={!!noteLabel}>
                <KeyboardKeyCode>{formatKeyLabel(code)}</KeyboardKeyCode>
                {noteLabel && <KeyboardKeyNote>{noteLabel}</KeyboardKeyNote>}
              </KeyboardKey>
            );
          })}
        </KeyboardRow>
      ))}
    </KeyboardPreview>
  );
};
