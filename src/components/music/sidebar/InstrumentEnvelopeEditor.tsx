import React, { useCallback } from "react";
import l10n from "shared/lib/lang/l10n";
import styled from "styled-components";
import { CheckboxField } from "ui/form/CheckboxField";
import { Knob } from "ui/form/Knob";
import { Label } from "ui/form/Label";

interface InstrumentEnvelopeEditorProps {
  volume: number;
  sweep: number;
  length: number | null;
  onChangeVolume: (value: number) => void;
  onChangeSweep: (value: number) => void;
  onChangeLength: (value: number | null) => void;
}

const StyledEnvelopeForm = styled.div`
  display: flex;
  padding: 0 10px;
`;

const StyledEnvelopeField = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-grow: 1;
  margin-bottom: 10px;
  > * {
    width: auto;
  }
  > *:first-child {
    height: 24px;
    margin: 0;
    display: flex;
    align-items: center;
    font-size: 11px;
  }
`;

// For UI preview flip positive values so the control feels symmetric
// The value is flipped back before being stored after changes.
const flipSweepChange = (value: number) => {
  if (value <= 0) {
    return value;
  }
  return 8 - value;
};

export const InstrumentEnvelopeEditor = ({
  volume,
  sweep,
  length,
  onChangeVolume,
  onChangeLength,
  onChangeSweep,
}: InstrumentEnvelopeEditorProps) => {
  const flippedOnChangeSweep = useCallback(
    (value: number) => onChangeSweep(flipSweepChange(value)),
    [onChangeSweep],
  );

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
          value={length ?? 0}
          min={1}
          max={64}
          sensitivity={3}
          onChange={onChangeLength}
        />
      </StyledEnvelopeField>

      <StyledEnvelopeField>
        <Label htmlFor="initialVolume">{l10n("FIELD_INITIAL_VOLUME")}</Label>
        <Knob value={volume} min={0} max={15} onChange={onChangeVolume} />
      </StyledEnvelopeField>
      <StyledEnvelopeField>
        <Label htmlFor="sweepChange">{l10n("FIELD_VOLUME_SWEEP_CHANGE")}</Label>
        <Knob
          value={flipSweepChange(sweep)}
          min={-7}
          max={7}
          onChange={flippedOnChangeSweep}
        />
      </StyledEnvelopeField>
    </StyledEnvelopeForm>
  );
};
