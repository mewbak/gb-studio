import React, { useCallback } from "react";
import l10n from "shared/lib/lang/l10n";
import styled from "styled-components";
import { CheckboxField } from "ui/form/CheckboxField";
import { Knob } from "ui/form/Knob";
import { Label } from "ui/form/Label";

interface InstrumentWaveEnvelopeEditorProps {
  volume: number;
  length: number | null;
  onChangeVolume: (value: number) => void;
  onChangeLength: (value: number | null) => void;
}

const StyledEnvelopeForm = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
  align-items: end;
  padding: 0 10px;
  padding-bottom: 10px;
`;

const StyledEnvelopeField = styled.div`
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 6px;

  > *:first-child {
    align-self: end;
    align-items: center;
    text-align: center;
    justify-content: center;
    height: auto;
  }

  &:first-child > *:first-child {
    position: relative;
    top: -1px;
  }

  > *:last-child {
    width: 100%;
  }
`;

const fixVolume = (input: number): number => {
  if (input === 0) {
    return 0;
  }
  return 4 - input;
};

export const InstrumentWaveEnvelopeEditor = ({
  volume,
  length,
  onChangeVolume,
  onChangeLength,
}: InstrumentWaveEnvelopeEditorProps) => {
  const fixedOnChangeVolume = useCallback(
    (value: number) => onChangeVolume(fixVolume(value)),
    [onChangeVolume],
  );

  const formatValue = useCallback((value: number) => {
    if (value === 0) {
      return "0%";
    }
    if (value === 1) {
      return "25%";
    }
    if (value === 2) {
      return "50%";
    }
    return "100%";
  }, []);

  return (
    <StyledEnvelopeForm>
      <StyledEnvelopeField>
        <CheckboxField
          label={l10n("FIELD_LENGTH")}
          name="length"
          checked={length !== null}
          onChange={(e) => {
            const value = e.target.checked;
            if (!value) {
              onChangeLength(null);
            } else {
              onChangeLength(32);
            }
          }}
        />
        <Knob
          name="length"
          value={length ?? 0}
          min={1}
          max={256}
          sensitivity={3}
          onChange={onChangeLength}
        />
      </StyledEnvelopeField>

      <StyledEnvelopeField>
        <Label htmlFor="initialVolume">{l10n("FIELD_VOLUME")}</Label>
        <Knob
          name="initialVolume"
          value={fixVolume(volume)}
          min={0}
          max={3}
          sensitivity={0.1}
          onChange={fixedOnChangeVolume}
          formatValue={formatValue}
        />
      </StyledEnvelopeField>
    </StyledEnvelopeForm>
  );
};
