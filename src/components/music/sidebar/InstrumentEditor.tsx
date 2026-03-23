import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import {
  FormRow,
  FormSection,
  FormSectionTitle,
} from "ui/form/layout/FormLayout";
import { Label } from "ui/form/Label";
import { Input } from "ui/form/Input";
import { CheckboxField } from "ui/form/CheckboxField";
import { StickyTabs, TabBar, TabSettings } from "ui/tabs/Tabs";

import { InstrumentDutyEditor } from "./InstrumentDutyEditor";
import { InstrumentWaveEditor } from "./InstrumentWaveEditor";
import { InstrumentNoiseEditor } from "./InstrumentNoiseEditor";
import { InstrumentSubpatternEditor } from "./InstrumentSubpatternEditor";

import {
  DutyInstrument,
  NoiseInstrument,
  WaveInstrument,
} from "shared/lib/uge/types";
import l10n from "shared/lib/lang/l10n";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector } from "store/hooks";

type Instrument = DutyInstrument | NoiseInstrument | WaveInstrument;
type InstrumentType = "duty" | "wave" | "noise";

type InstrumentEditorTab = "main" | "subpattern";
type InstrumentEditorTabs = Record<InstrumentEditorTab, string>;

const InstrumentEditorWrapper = styled.div`
  padding-top: 10px;
`;

const instrumentTypeLabels: Record<InstrumentType, string> = {
  duty: "Duty",
  wave: "Wave",
  noise: "Noise",
};

const getDefaultInstrumentName = (
  instrument: Instrument,
  type: InstrumentType,
) => {
  return `${instrumentTypeLabels[type]} ${String(instrument.index + 1).padStart(2, "0")}`;
};

const getInstrumentName = (instrument: Instrument, type: InstrumentType) => {
  return instrument.name || getDefaultInstrumentName(instrument, type);
};

export const InstrumentEditor = () => {
  const dispatch = useAppDispatch();

  const selectedInstrument = useAppSelector(
    (state) => state.tracker.selectedInstrument,
  );
  const song = useAppSelector((state) => state.trackerDocument.present.song);

  const [instrumentEditorTab, setInstrumentEditorTab] =
    useState<InstrumentEditorTab>("main");

  useEffect(() => {
    dispatch(trackerActions.setSelectedEffectCell(null));
  }, [dispatch, selectedInstrument]);

  const instrumentType = selectedInstrument.type as InstrumentType;
  const selectedInstrumentId = Number.parseInt(selectedInstrument.id, 10);

  const instrumentEditorTabs = useMemo<InstrumentEditorTabs>(
    () => ({
      main: l10n("MENU_SETTINGS"),
      subpattern: l10n("SIDEBAR_SUBPATTERN"),
    }),
    [],
  );

  const onInstrumentEditorChange = useCallback((tab: InstrumentEditorTab) => {
    setInstrumentEditorTab(tab);
  }, []);

  const resolvedInstrument = useMemo(() => {
    if (!song) {
      return null;
    }

    if (instrumentType === "duty") {
      return {
        instrumentType,
        instrument: song.duty_instruments[selectedInstrumentId] ?? null,
      };
    }

    if (instrumentType === "noise") {
      return {
        instrumentType,
        instrument: song.noise_instruments[selectedInstrumentId] ?? null,
      };
    }

    return {
      instrumentType,
      instrument: song.wave_instruments[selectedInstrumentId] ?? null,
    };
  }, [song, instrumentType, selectedInstrumentId]);

  const editInstrument = useMemo(() => {
    if (instrumentType === "duty") {
      return trackerDocumentActions.editDutyInstrument;
    }

    if (instrumentType === "noise") {
      return trackerDocumentActions.editNoiseInstrument;
    }

    return trackerDocumentActions.editWaveInstrument;
  }, [instrumentType]);

  const onChangeInstrumentName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!resolvedInstrument) {
        return;
      }

      dispatch(
        editInstrument({
          instrumentId: resolvedInstrument.instrument.index,
          changes: {
            name: e.currentTarget.value,
          },
        }),
      );
    },
    [dispatch, editInstrument, resolvedInstrument],
  );

  const onChangeInstrumentSubpatternEnabled = useCallback(
    (enabled: boolean) => {
      if (!resolvedInstrument) {
        return;
      }

      dispatch(
        editInstrument({
          instrumentId: resolvedInstrument.instrument.index,
          changes: {
            // eslint-disable-next-line camelcase
            subpattern_enabled: enabled,
          },
        }),
      );
    },
    [dispatch, editInstrument, resolvedInstrument],
  );

  if (!song || !resolvedInstrument || !resolvedInstrument.instrument) {
    return null;
  }

  return (
    <>
      <FormSection>
        <FormSectionTitle>
          {l10n("SIDEBAR_INSTRUMENT")}{" "}
          {getDefaultInstrumentName(
            resolvedInstrument.instrument,
            resolvedInstrument.instrumentType,
          )}
        </FormSectionTitle>

        <FormRow>
          <Label htmlFor="instrument_name">{l10n("FIELD_NAME")}</Label>
        </FormRow>

        <FormRow>
          <Input
            id="instrument_name"
            name="instrument_name"
            placeholder={getInstrumentName(
              resolvedInstrument.instrument,
              resolvedInstrument.instrumentType,
            )}
            value={resolvedInstrument.instrument.name || ""}
            onChange={onChangeInstrumentName}
          />
        </FormRow>
      </FormSection>
      <StickyTabs>
        <TabBar
          value={instrumentEditorTab}
          values={instrumentEditorTabs}
          onChange={onInstrumentEditorChange}
          overflowActiveTab={instrumentEditorTab === "subpattern"}
        />

        {instrumentEditorTab === "subpattern" ? (
          <TabSettings>
            <CheckboxField
              name="subpatternEnabled"
              label={l10n("FIELD_SUBPATTERN_ENABLED")}
              checked={resolvedInstrument.instrument.subpattern_enabled}
              onChange={(e) =>
                onChangeInstrumentSubpatternEnabled(e.target.checked)
              }
            />
          </TabSettings>
        ) : null}
      </StickyTabs>
      <InstrumentEditorWrapper>
        {instrumentEditorTab === "main" &&
        resolvedInstrument.instrumentType === "duty" ? (
          <InstrumentDutyEditor
            id={`instrument_${resolvedInstrument.instrument.index}`}
            instrument={resolvedInstrument.instrument}
          />
        ) : null}

        {instrumentEditorTab === "main" &&
        resolvedInstrument.instrumentType === "noise" ? (
          <InstrumentNoiseEditor
            id={`instrument_${resolvedInstrument.instrument.index}`}
            instrument={resolvedInstrument.instrument}
          />
        ) : null}

        {instrumentEditorTab === "main" &&
        resolvedInstrument.instrumentType === "wave" ? (
          <InstrumentWaveEditor
            id={`instrument_${resolvedInstrument.instrument.index}`}
            instrument={resolvedInstrument.instrument}
            waveForms={song.waves}
          />
        ) : null}

        {instrumentEditorTab === "subpattern" ? (
          <InstrumentSubpatternEditor
            enabled={resolvedInstrument.instrument.subpattern_enabled}
            subpattern={resolvedInstrument.instrument.subpattern}
            instrumentId={resolvedInstrument.instrument.index}
            instrumentType={resolvedInstrument.instrumentType}
          />
        ) : null}
      </InstrumentEditorWrapper>
    </>
  );
};
