import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import API from "renderer/lib/api";
import clamp from "shared/lib/helpers/clamp";
import { useAppSelector } from "store/hooks";
import styled, { css } from "styled-components";

interface WaveEditorInputProps {
  waveId: number;
  onEditWave: (newWave: Uint8Array) => void;
}

const validKeys = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
];

interface InputWrapperProps {
  $focus?: boolean;
}
const InputWrapper = styled.div<InputWrapperProps>`
  position: relative;

  font-family: monospace;

  display: flex;
  align-items: center;
  justify-content: space-around;

  background: ${(props) => props.theme.colors.input.background};
  color: ${(props) => props.theme.colors.input.text};
  border: 1px solid ${(props) => props.theme.colors.input.border};
  font-size: ${(props) => props.theme.typography.fontSize};
  border-radius: ${(props) => props.theme.borderRadius}px;

  padding: 5px;
  box-sizing: border-box;
  width: 100%;
  height: 28px;

  cursor: text;

  &:hover {
    background: ${(props) => props.theme.colors.input.hoverBackground};
  }

  ${(props) =>
    props.$focus &&
    css`
      outline: none;
      border: 1px solid ${(props) => props.theme.colors.highlight} !important;
      box-shadow: 0 0 0px 2px ${(props) => props.theme.colors.highlight} !important;
      background: ${(props) => props.theme.colors.input.activeBackground};
      transition: box-shadow 0.2s cubic-bezier(0.175, 0.885, 0.71, 2.65);
    `}

  &:disabled {
    opacity: 0.5;
  }

  input {
    position: absolute;
    pointer-events: none;
    caret-color: transparent;
    color: transparent;
    background: transparent;
    border: 0;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: ${(props) => props.theme.borderRadius}px;
  }
`;

interface InputCellProps {
  $active: boolean;
}
const InputCell = styled.span<InputCellProps>`
  display: flex;
  align-items: center;
  flex-grow: 1;
  height: 28px;
  box-sizing: border-box;

  color: ${(props) => (props.$active ? props.theme.colors.highlight : "")};
`;

export const WaveEditorInput = ({
  waveId,
  onEditWave,
}: WaveEditorInputProps) => {
  const wave = useAppSelector(
    (state) => state.trackerDocument.present.song?.waves[waveId],
  );
  const waveArray = useMemo(() => (wave ? Array.from(wave) : []), [wave]);

  const [editPosition, setEditPosition] = useState(0);
  const [hasFocus, setHasFocus] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!wave || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      e.stopPropagation();

      let tmpEditPosition = editPosition;
      if (e.key === "ArrowLeft") {
        tmpEditPosition -= 1;
      }
      if (e.key === "ArrowRight") {
        tmpEditPosition += 1;
      }

      if (tmpEditPosition !== editPosition) {
        const newEditPosition = ((tmpEditPosition % 32) + 32) % 32;
        setEditPosition(newEditPosition);
        return;
      }

      if (e.key === "ArrowDown") {
        wave[editPosition] = (((wave[editPosition] - 1) % 16) + 16) % 16;
        onEditWave(Uint8Array.from(wave));
      } else if (e.key === "ArrowUp") {
        wave[editPosition] = (((wave[editPosition] + 1) % 16) + 16) % 16;
        onEditWave(Uint8Array.from(wave));
      } else if (e.key === "Backspace" || e.key === "Delete") {
        wave[editPosition] = 0;
        const newEditPosition = clamp(editPosition - 1, 0, 31);
        setEditPosition(newEditPosition);
        onEditWave(Uint8Array.from(wave));
      } else if (validKeys.includes(e.key.toUpperCase())) {
        const newValue = parseInt(e.key, 16);
        if (!isNaN(newValue)) {
          wave[editPosition] = newValue;
          const newEditPosition = clamp(editPosition + 1, 0, 31);
          setEditPosition(newEditPosition);
        }
        onEditWave(Uint8Array.from(wave));
      }
    },
    [editPosition, onEditWave, wave],
  );

  useEffect(() => {
    if (hasFocus) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, hasFocus]);

  const onCopy = useCallback(
    (e?: ClipboardEvent) => {
      const waveString = waveArray
        .map((value) => value.toString(16).toUpperCase())
        .join("");
      e?.preventDefault();
      e?.clipboardData?.setData("text/plain", waveString);
      void API.clipboard.writeText(waveString);
    },
    [waveArray],
  );

  const onCut = useCallback(
    (e?: ClipboardEvent) => {
      const waveString = waveArray
        .map((value) => value.toString(16).toUpperCase())
        .join("");
      e?.preventDefault();
      e?.clipboardData?.setData("text/plain", waveString);
      void API.clipboard.writeText(waveString);
      onEditWave(Uint8Array.from(waveArray.map(() => 0)));
    },
    [onEditWave, waveArray],
  );

  const onPaste = useCallback(async () => {
    const newWaveString = await API.clipboard.readText();
    if (newWaveString) {
      const isValid = newWaveString.length === 32;
      if (isValid) {
        const newWave = [];
        for (let i = 0; i < newWaveString.length; i++) {
          newWave.push(parseInt(newWaveString[i], 16));
        }
        onEditWave(Uint8Array.from(newWave));
      }
    }
  }, [onEditWave]);

  // Clipboard
  useEffect(() => {
    if (hasFocus) {
      window.addEventListener("copy", onCopy);
      window.addEventListener("cut", onCut);
      window.addEventListener("paste", onPaste);
      return () => {
        window.removeEventListener("copy", onCopy);
        window.removeEventListener("cut", onCut);
        window.removeEventListener("paste", onPaste);
      };
    }
  }, [onCopy, onCut, hasFocus, onPaste]);

  const inputRef = useRef<HTMLInputElement>(null);
  const handleFocus = useCallback(() => {
    if (!hasFocus && inputRef && inputRef.current) {
      inputRef.current.focus();
      setHasFocus(true);
    }
  }, [hasFocus]);

  const handleBlur = useCallback(() => {
    setHasFocus(false);
  }, []);

  return (
    <InputWrapper tabIndex={-1} $focus={hasFocus}>
      {waveArray.map((w, i) => {
        return (
          <InputCell
            key={`${w}:${i}`}
            $active={hasFocus && i === editPosition}
            onClick={() => {
              setEditPosition(i);
              handleFocus();
            }}
          >
            {w.toString(16).toUpperCase()}
          </InputCell>
        );
      })}
      <input
        tabIndex={0}
        ref={inputRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(e) => (e.target.value = "")}
      />
    </InputWrapper>
  );
};
