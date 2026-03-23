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

  const instrumentData = useMemo(() => {
    if (!song) {
      return null;
    }

    if (instrumentType === "duty") {
      return {
        instrumentType,
        data: song.duty_instruments[selectedInstrumentId] ?? null,
      };
    }

    if (instrumentType === "noise") {
      return {
        instrumentType,
        data: song.noise_instruments[selectedInstrumentId] ?? null,
      };
    }

    return {
      instrumentType,
      data: song.wave_instruments[selectedInstrumentId] ?? null,
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
      if (!instrumentData) {
        return;
      }

      dispatch(
        editInstrument({
          instrumentId: instrumentData.data.index,
          changes: {
            name: e.currentTarget.value,
          },
        }),
      );
    },
    [dispatch, editInstrument, instrumentData],
  );

  const onChangeInstrumentSubpatternEnabled = useCallback(
    (enabled: boolean) => {
      if (!instrumentData) {
        return;
      }

      dispatch(
        editInstrument({
          instrumentId: instrumentData.data.index,
          changes: {
            // eslint-disable-next-line camelcase
            subpattern_enabled: enabled,
          },
        }),
      );
    },
    [dispatch, editInstrument, instrumentData],
  );

  if (!song || !instrumentData) {
    return null;
  }

  return (
    <>
      ABC
      <FormSection>
        <FormSectionTitle>
          {l10n("SIDEBAR_INSTRUMENT")}{" "}
          {getDefaultInstrumentName(
            instrumentData.data,
            instrumentData.instrumentType,
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
              instrumentData.data,
              instrumentData.instrumentType,
            )}
            value={instrumentData.data.name || ""}
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
              checked={instrumentData.data.subpattern_enabled}
              onChange={(e) =>
                onChangeInstrumentSubpatternEnabled(e.target.checked)
              }
            />
          </TabSettings>
        ) : null}
      </StickyTabs>
      <InstrumentEditorWrapper>
        {instrumentEditorTab === "main" &&
        instrumentData.instrumentType === "duty" ? (
          <InstrumentDutyEditor
            id={`instrument_${instrumentData.data.index}`}
            instrument={instrumentData.data}
          />
        ) : null}

        {instrumentEditorTab === "main" &&
        instrumentData.instrumentType === "noise" ? (
          <InstrumentNoiseEditor
            id={`instrument_${instrumentData.data.index}`}
            instrument={instrumentData.data}
          />
        ) : null}

        {instrumentEditorTab === "main" &&
        instrumentData.instrumentType === "wave" ? (
          <InstrumentWaveEditor
            id={`instrument_${instrumentData.data.index}`}
            instrument={instrumentData.data}
            waveForms={song.waves}
          />
        ) : null}

        {instrumentEditorTab === "subpattern" ? (
          <InstrumentSubpatternEditor
            enabled={instrumentData.data.subpattern_enabled}
            subpattern={instrumentData.data.subpattern}
            instrumentId={instrumentData.data.index}
            instrumentType={instrumentData.instrumentType}
          />
        ) : null}
      </InstrumentEditorWrapper>
    </>
  );
};
