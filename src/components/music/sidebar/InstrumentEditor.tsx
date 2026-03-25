import React, { useCallback, useMemo, useState } from "react";
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
import { InstrumentSubpatternEditor } from "components/music/subpattern/SongSubpatternTracker";
import { InstrumentSubpatternSimpleEditor } from "components/music/subpattern/SongSubpatternScript";

import {
  DutyInstrument,
  NoiseInstrument,
  WaveInstrument,
} from "shared/lib/uge/types";
import l10n from "shared/lib/lang/l10n";
import trackerActions from "store/features/tracker/trackerActions";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { TrackerIcon } from "ui/icons/Icons";
import { Button } from "ui/buttons/Button";

type Instrument = DutyInstrument | NoiseInstrument | WaveInstrument;
type InstrumentType = "duty" | "wave" | "noise";

type InstrumentEditorTab = "main" | "subpattern";
type InstrumentEditorTabs = Record<InstrumentEditorTab, string>;

const InstrumentEditorWrapper = styled.div`
  padding-top: 10px;
`;

const SubpatternSettings = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
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
  const subpatternEditorMode = useAppSelector(
    (state) => state.tracker.subpatternEditorMode,
  );

  const [instrumentEditorTab, setInstrumentEditorTab] =
    useState<InstrumentEditorTab>("main");

  const instrumentType = selectedInstrument.type as InstrumentType;
  const selectedInstrumentId = Number.parseInt(selectedInstrument.id, 10);

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

  const instrumentEditorTabs = useMemo<InstrumentEditorTabs>(
    () => ({
      main: l10n("MENU_SETTINGS"),
      subpattern: resolvedInstrument?.instrument?.subpattern_enabled
        ? `${l10n("SIDEBAR_SUBPATTERN")}*`
        : l10n("SIDEBAR_SUBPATTERN"),
    }),
    [resolvedInstrument?.instrument?.subpattern_enabled],
  );

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

  const onToggleSubpatternEditorMode = useCallback(() => {
    if (subpatternEditorMode === "tracker") {
      dispatch(trackerActions.setSubpatternEditorModeAndSave("simple"));
    } else {
      dispatch(trackerActions.setSubpatternEditorModeAndSave("tracker"));
    }
    if (
      resolvedInstrument &&
      !resolvedInstrument.instrument.subpattern_enabled
    ) {
      dispatch(
        editInstrument({
          instrumentId: resolvedInstrument.instrument.index,
          changes: {
            // eslint-disable-next-line camelcase
            subpattern_enabled: true,
          },
        }),
      );
    }
  }, [dispatch, editInstrument, resolvedInstrument, subpatternEditorMode]);

  if (!song || !resolvedInstrument || !resolvedInstrument.instrument) {
    return null;
  }

  return (
    <>
      <FormSection>
        <FormSectionTitle>
          {instrumentTypeLabels[resolvedInstrument.instrumentType]}
          {" / "}
          {l10n("SIDEBAR_INSTRUMENT")}{" "}
          {String(resolvedInstrument.instrument.index + 1).padStart(2, "0")}
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
            <SubpatternSettings>
              <CheckboxField
                name="subpatternEnabled"
                label={l10n("FIELD_SUBPATTERN_ENABLED")}
                checked={resolvedInstrument.instrument.subpattern_enabled}
                onChange={(e) =>
                  onChangeInstrumentSubpatternEnabled(e.target.checked)
                }
              />
              {resolvedInstrument.instrument.subpattern_enabled && (
                <Button
                  variant={
                    subpatternEditorMode === "tracker" ? "primary" : "normal"
                  }
                  onClick={onToggleSubpatternEditorMode}
                >
                  <TrackerIcon />
                </Button>
              )}
            </SubpatternSettings>
          </TabSettings>
        ) : null}
      </StickyTabs>

      {instrumentEditorTab === "main" &&
      resolvedInstrument.instrumentType === "duty" ? (
        <InstrumentEditorWrapper>
          <InstrumentDutyEditor
            id={`instrument_${resolvedInstrument.instrument.index}`}
            instrument={resolvedInstrument.instrument}
          />
        </InstrumentEditorWrapper>
      ) : null}

      {instrumentEditorTab === "main" &&
      resolvedInstrument.instrumentType === "noise" ? (
        <InstrumentEditorWrapper>
          <InstrumentNoiseEditor
            id={`instrument_${resolvedInstrument.instrument.index}`}
            instrument={resolvedInstrument.instrument}
          />
        </InstrumentEditorWrapper>
      ) : null}

      {instrumentEditorTab === "main" &&
      resolvedInstrument.instrumentType === "wave" ? (
        <InstrumentEditorWrapper>
          <InstrumentWaveEditor
            id={`instrument_${resolvedInstrument.instrument.index}`}
            instrument={resolvedInstrument.instrument}
            waveForms={song.waves}
          />
        </InstrumentEditorWrapper>
      ) : null}

      {instrumentEditorTab === "subpattern" &&
      resolvedInstrument.instrument.subpattern_enabled ? (
        subpatternEditorMode === "tracker" ? (
          <InstrumentSubpatternEditor
            subpattern={resolvedInstrument.instrument.subpattern}
            instrumentId={resolvedInstrument.instrument.index}
            instrumentType={resolvedInstrument.instrumentType}
          />
        ) : (
          <InstrumentSubpatternSimpleEditor
            subpattern={resolvedInstrument.instrument.subpattern}
            instrumentId={resolvedInstrument.instrument.index}
            instrumentType={resolvedInstrument.instrumentType}
          />
        )
      ) : null}
    </>
  );
};
