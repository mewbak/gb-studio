import React, { useCallback, useMemo } from "react";
import styled from "styled-components";
import { MIN_OCTAVE, OCTAVE_SIZE } from "consts";
import {
  StyledConfirmActions,
  StyledConfirmCloseButton,
  StyledConfirmModal,
} from "gbs-music-web/components/dialog/style";
import l10n from "shared/lib/lang/l10n";
import { Button } from "ui/buttons/Button";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { CloseIcon } from "ui/icons/Icons";
import { MenuOverlay } from "ui/menu/Menu";
import { useAppDispatch, useAppSelector } from "store/hooks";
import {
  milkytrackerKeys,
  openMPTKeys,
} from "renderer/lib/keybindings/defaultKeys";
import API from "renderer/lib/api";
import trackerActions from "store/features/tracker/trackerActions";
import { useTrackerKeyBindings } from "gbs-music-web/hooks/useTrackerKeyBindings";

interface KeyboardHelpDialogProps {
  onClose: () => void;
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

const HelpModal = styled(StyledConfirmModal)`
  width: min(620px, calc(100vw - 40px));
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding-top: 28px;
`;

const KeyboardPreview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  margin-top: 40px;
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

const KeyboardFields = styled.div`
  display: flex;
  gap: 20px;
  justify-content: center;
  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const KeyboardField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: center;
`;

const formatKeyLabel = (code: string) =>
  KEY_LABELS[code] ?? code.replace(/^Key/, "");

const formatNoteLabel = (note: number, octaveOffset: number) => {
  const noteIndex = note + octaveOffset * OCTAVE_SIZE;
  const octave = MIN_OCTAVE + Math.floor(noteIndex / OCTAVE_SIZE);
  return `${NOTE_NAMES[noteIndex % OCTAVE_SIZE]}${octave}`;
};

export const KeyboardHelpDialog = ({ onClose }: KeyboardHelpDialogProps) => {
  const dispatch = useAppDispatch();
  const octaveOffset = useAppSelector((state) => state.tracker.octaveOffset);
  const trackerKeyBindings = useTrackerKeyBindings();

  const onChangeTrackerKeyBindings = useCallback((value: number) => {
    void API.settings.app.setTrackerKeyBindings(value);
  }, []);

  const onChangeOctaveOffset = useCallback(
    (offset: number) => {
      dispatch(trackerActions.setOctaveOffset(offset));
    },
    [dispatch],
  );

  const noteLabelsByCode = useMemo(() => {
    const noteBindings =
      trackerKeyBindings === 1 ? milkytrackerKeys : openMPTKeys;

    return new Map(
      noteBindings.flatMap((binding) => {
        if (
          binding.when !== "noteColumnFocus" ||
          binding.command !== "editNoteField" ||
          typeof binding.args !== "number"
        ) {
          return [];
        }

        return [[binding.code, formatNoteLabel(binding.args, octaveOffset)]];
      }),
    );
  }, [octaveOffset, trackerKeyBindings]);

  return (
    <>
      <MenuOverlay onClick={onClose} />
      <HelpModal
        role="dialog"
        aria-modal="true"
        aria-label={l10n("FIELD_UI_TRACKER_KEYBINDINGS")}
      >
        <StyledConfirmCloseButton
          onClick={onClose}
          aria-label={l10n("FIELD_CLOSE")}
        >
          <CloseIcon />
        </StyledConfirmCloseButton>

        <KeyboardPreview>
          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <KeyboardRow
              key={rowIndex}
              $offset={KEYBOARD_ROW_OFFSETS[rowIndex]}
            >
              {row.map((code) => {
                const noteLabel = noteLabelsByCode.get(code);
                return (
                  <KeyboardKey key={code} $active={!!noteLabel}>
                    <KeyboardKeyCode>{formatKeyLabel(code)}</KeyboardKeyCode>
                    {noteLabel && (
                      <KeyboardKeyNote>{noteLabel}</KeyboardKeyNote>
                    )}
                  </KeyboardKey>
                );
              })}
            </KeyboardRow>
          ))}
        </KeyboardPreview>

        <StyledConfirmActions>
          <KeyboardFields>
            <KeyboardField>
              <label>{l10n("FIELD_LAYOUT")}</label>
              <ButtonGroup>
                <Button
                  variant={trackerKeyBindings === 0 ? "primary" : "normal"}
                  onClick={() => onChangeTrackerKeyBindings(0)}
                >
                  {l10n("FIELD_UI_LINEAR")}
                </Button>
                <Button
                  variant={trackerKeyBindings === 1 ? "primary" : "normal"}
                  onClick={() => onChangeTrackerKeyBindings(1)}
                >
                  {l10n("FIELD_UI_PIANO")}
                </Button>
              </ButtonGroup>
            </KeyboardField>

            <KeyboardField>
              <label>{l10n("FIELD_OCTAVE")}</label>
              <ButtonGroup>
                <Button
                  variant={octaveOffset === 0 ? "primary" : "normal"}
                  onClick={() => onChangeOctaveOffset(0)}
                >
                  3
                </Button>
                <Button
                  variant={octaveOffset === 1 ? "primary" : "normal"}
                  onClick={() => onChangeOctaveOffset(1)}
                >
                  4
                </Button>
                <Button
                  variant={octaveOffset === 2 ? "primary" : "normal"}
                  onClick={() => onChangeOctaveOffset(2)}
                >
                  5
                </Button>
                <Button
                  variant={octaveOffset === 3 ? "primary" : "normal"}
                  onClick={() => onChangeOctaveOffset(3)}
                >
                  6
                </Button>
              </ButtonGroup>
            </KeyboardField>
          </KeyboardFields>
        </StyledConfirmActions>
      </HelpModal>
    </>
  );
};
