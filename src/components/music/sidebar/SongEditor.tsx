import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import {
  FormContainer,
  FormRow,
  FormSection,
  FormSectionTitle,
} from "ui/form/layout/FormLayout";
import { Sidebar } from "ui/sidebars/Sidebar";
import { Label } from "ui/form/Label";
import { Input } from "ui/form/Input";
import { CheckboxField } from "ui/form/CheckboxField";
import { StickyTabs, TabBar, TabSettings } from "ui/tabs/Tabs";

import { InstrumentDutyEditor } from "./InstrumentDutyEditor";
import { InstrumentWaveEditor } from "./InstrumentWaveEditor";
import { InstrumentNoiseEditor } from "./InstrumentNoiseEditor";
import { InstrumentSubpatternEditor } from "./InstrumentSubpatternEditor";
import { PatternCellEditor } from "./PatternCellEditor";
import { SongMetadataEditor } from "./SongMetadataEditor";

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

const renderInstrumentEditor = (
  type: InstrumentType,
  instrument: Instrument,
  waveForms: Uint8Array[],
) => {
  switch (type) {
    case "duty":
      return (
        <InstrumentDutyEditor
          id={`instrument_${instrument.index}`}
          instrument={instrument as DutyInstrument}
        />
      );
    case "noise":
      return (
        <InstrumentNoiseEditor
          id={`instrument_${instrument.index}`}
          instrument={instrument as NoiseInstrument}
        />
      );
    case "wave":
      return (
        <InstrumentWaveEditor
          id={`instrument_${instrument.index}`}
          instrument={instrument as WaveInstrument}
          waveForms={waveForms}
        />
      );
  }
};

export const SongEditor = () => {
  const dispatch = useAppDispatch();

  const selectedInstrument = useAppSelector(
    (state) => state.tracker.selectedInstrument,
  );
  const selectedEffectCell = useAppSelector(
    (state) => state.tracker.selectedEffectCell,
  );
  const sequenceId = useAppSelector((state) => state.tracker.selectedSequence);
  const song = useAppSelector((state) => state.trackerDocument.present.song);

  const [instrumentEditorTab, setInstrumentEditorTab] =
    useState<InstrumentEditorTab>("main");

  useEffect(() => {
    dispatch(trackerActions.setSelectedEffectCell(null));
  }, [dispatch, selectedInstrument]);

  const instrumentType = selectedInstrument.type as InstrumentType;
  const selectedInstrumentId = Number.parseInt(selectedInstrument.id, 10);

  const instrumentData = useMemo(() => {
    if (!song) {
      return null;
    }

    switch (instrumentType) {
      case "duty":
        return song.duty_instruments[selectedInstrumentId] ?? null;
      case "noise":
        return song.noise_instruments[selectedInstrumentId] ?? null;
      case "wave":
        return song.wave_instruments[selectedInstrumentId] ?? null;
    }
  }, [song, instrumentType, selectedInstrumentId]);

  const patternId = song?.sequence[sequenceId] ?? 0;

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

  const onChangeInstrumentName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!instrumentData) {
        return;
      }

      const changes = { name: e.currentTarget.value };

      switch (instrumentType) {
        case "duty":
          dispatch(
            trackerDocumentActions.editDutyInstrument({
              instrumentId: instrumentData.index,
              changes,
            }),
          );
          break;
        case "wave":
          dispatch(
            trackerDocumentActions.editWaveInstrument({
              instrumentId: instrumentData.index,
              changes,
            }),
          );
          break;
        case "noise":
          dispatch(
            trackerDocumentActions.editNoiseInstrument({
              instrumentId: instrumentData.index,
              changes,
            }),
          );
          break;
      }
    },
    [dispatch, instrumentData, instrumentType],
  );

  const onChangeInstrumentSubpatternEnabled = useCallback(
    (enabled: boolean) => {
      if (!instrumentData) {
        return;
      }

      const payload = {
        instrumentId: instrumentData.index,
        changes: {
          // eslint-disable-next-line camelcase
          subpattern_enabled: enabled,
        },
      };

      switch (instrumentType) {
        case "duty":
          dispatch(trackerDocumentActions.editDutyInstrument(payload));
          break;
        case "wave":
          dispatch(trackerDocumentActions.editWaveInstrument(payload));
          break;
        case "noise":
          dispatch(trackerDocumentActions.editNoiseInstrument(payload));
          break;
      }
    },
    [dispatch, instrumentData, instrumentType],
  );

  if (!song) {
    return null;
  }

  const renderContent = () => {
    if (selectedEffectCell !== null) {
      return (
        <div style={{ marginTop: -1 }}>
          <PatternCellEditor
            id={selectedEffectCell}
            patternId={patternId}
            pattern={song.patterns[patternId][selectedEffectCell]}
          />
        </div>
      );
    }

    if (!instrumentData) {
      return null;
    }

    return (
      <div style={{ marginTop: -1 }}>
        <FormSection>
          <FormSectionTitle>
            {l10n("SIDEBAR_INSTRUMENT")}{" "}
            {getDefaultInstrumentName(instrumentData, instrumentType)}
          </FormSectionTitle>

          <FormRow>
            <Label htmlFor="instrument_name">{l10n("FIELD_NAME")}</Label>
          </FormRow>

          <FormRow>
            <Input
              id="instrument_name"
              name="instrument_name"
              placeholder={getInstrumentName(instrumentData, instrumentType)}
              value={instrumentData.name || ""}
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
                label={l10n("FIELD_SUBPATTERN_ENBALED")}
                checked={instrumentData.subpattern_enabled}
                onChange={(e) =>
                  onChangeInstrumentSubpatternEnabled(e.target.checked)
                }
              />
            </TabSettings>
          ) : null}
        </StickyTabs>

        <InstrumentEditorWrapper>
          {instrumentEditorTab === "main" ? (
            renderInstrumentEditor(instrumentType, instrumentData, song.waves)
          ) : (
            <InstrumentSubpatternEditor
              enabled={instrumentData.subpattern_enabled}
              subpattern={instrumentData.subpattern}
              instrumentId={instrumentData.index}
              instrumentType={instrumentType}
            />
          )}
        </InstrumentEditorWrapper>
      </div>
    );
  };

  return (
    <Sidebar onClick={() => {}}>
      <SongMetadataEditor />
      <FormContainer>{renderContent()}</FormContainer>
    </Sidebar>
  );
};
