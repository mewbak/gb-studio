import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FormContainer,
  FormRow,
  FormSection,
  FormSectionTitle,
} from "ui/form/layout/FormLayout";
import { Sidebar } from "ui/sidebars/Sidebar";
import { Label } from "ui/form/Label";
import { Input } from "ui/form/Input";
import { InstrumentDutyEditor } from "./InstrumentDutyEditor";
import { InstrumentWaveEditor } from "./InstrumentWaveEditor";
import { InstrumentNoiseEditor } from "./InstrumentNoiseEditor";
import {
  DutyInstrument,
  NoiseInstrument,
  WaveInstrument,
} from "shared/lib/uge/types";
import l10n from "shared/lib/lang/l10n";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { PatternCellEditor } from "./PatternCellEditor";
import trackerActions from "store/features/tracker/trackerActions";
import { StickyTabs, TabBar, TabSettings } from "ui/tabs/Tabs";
import { InstrumentSubpatternEditor } from "./InstrumentSubpatternEditor";
import styled from "styled-components";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { CheckboxField } from "ui/form/CheckboxField";
import { SongMetadataEditor } from "./SongMetadataEditor";

type Instrument = DutyInstrument | NoiseInstrument | WaveInstrument;

type InstrumentEditorTab = "main" | "subpattern";
type InstrumentEditorTabs = { [key in InstrumentEditorTab]: string };

const InstrumentEditorWrapper = styled.div`
  padding-top: 10px;
`;

const renderInstrumentEditor = (
  type: string,
  instrumentData: Instrument | null,
  waveForms: Uint8Array[],
) => {
  if (type === "duty")
    return (
      <InstrumentDutyEditor
        id={`instrument_${instrumentData?.index}`}
        instrument={instrumentData as DutyInstrument}
      />
    );

  if (type === "noise")
    return (
      <InstrumentNoiseEditor
        id={`instrument_${instrumentData?.index}`}
        instrument={instrumentData as NoiseInstrument}
      />
    );

  if (type === "wave")
    return (
      <InstrumentWaveEditor
        id={`instrument_${instrumentData?.index}`}
        instrument={instrumentData as WaveInstrument}
        waveForms={waveForms}
      />
    );
};

const instrumentName = (instrument: Instrument, type: string) => {
  let typeName = "Instrument";
  if (type === "duty") typeName = "Duty";
  if (type === "wave") typeName = "Wave";
  if (type === "noise") typeName = "Noise";

  return instrument.name
    ? instrument.name
    : `${typeName} ${instrument.index + 1}`;
};

export const SongEditor = () => {
  const dispatch = useAppDispatch();
  const selectedInstrument = useAppSelector(
    (state) => state.tracker.selectedInstrument,
  );
  useEffect(() => {
    dispatch(trackerActions.setSelectedEffectCell(null));
  }, [dispatch, selectedInstrument]);
  const sequenceId = useAppSelector((state) => state.tracker.selectedSequence);
  const song = useAppSelector((state) => state.trackerDocument.present.song);

  const selectSidebar = () => {};

  const onChangeInstrumentName =
    (type: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const editValue = e.currentTarget.value;

      let action;
      if (type === "duty") action = trackerDocumentActions.editDutyInstrument;
      if (type === "wave") action = trackerDocumentActions.editWaveInstrument;
      if (type === "noise") action = trackerDocumentActions.editNoiseInstrument;

      if (!action || !instrumentData) return;

      dispatch(
        action({
          instrumentId: instrumentData.index,
          changes: {
            name: editValue,
          },
        }),
      );
    };

  const onChangeInstrumentSubpatternEnabled =
    (type: string) => (editValue: boolean) => {
      if (!instrumentData) return;

      const payload = {
        instrumentId: instrumentData.index,
        changes: {
          // eslint-disable-next-line camelcase
          subpattern_enabled: editValue,
        },
      };

      switch (type) {
        case "duty": {
          dispatch(trackerDocumentActions.editDutyInstrument(payload));
          break;
        }
        case "wave": {
          dispatch(trackerDocumentActions.editWaveInstrument(payload));
          break;
        }
        case "noise": {
          dispatch(trackerDocumentActions.editNoiseInstrument(payload));
          break;
        }
      }
    };

  let instrumentData: Instrument | null = null;
  if (song) {
    const selectedInstrumentId = parseInt(selectedInstrument.id);
    switch (selectedInstrument.type) {
      case "duty":
        instrumentData = song.duty_instruments[selectedInstrumentId];
        break;
      case "noise":
        instrumentData = song.noise_instruments[selectedInstrumentId];
        break;
      case "wave":
        instrumentData = song.wave_instruments[selectedInstrumentId];
        break;
    }
  }

  const selectedEffectCell = useAppSelector(
    (state) => state.tracker.selectedEffectCell,
  );

  const patternId = song?.sequence[sequenceId] || 0;

  const [instrumentEditorTab, setInstrumentEditorTab] =
    useState<InstrumentEditorTab>("main");
  const onInstrumentEditorChange = useCallback((mode: InstrumentEditorTab) => {
    setInstrumentEditorTab(mode);
  }, []);

  const instrumentEditorTabs = useMemo(
    () =>
      ({
        main: l10n("MENU_SETTINGS"),
        subpattern: l10n("SIDEBAR_SUBPATTERN"),
      }) as InstrumentEditorTabs,
    [],
  );

  if (!song) {
    return null;
  }

  return (
    <Sidebar onClick={selectSidebar}>
      <SongMetadataEditor />

      <FormContainer>
        {selectedEffectCell !== null ? (
          <div style={{ marginTop: -1 }}>
            <PatternCellEditor
              id={selectedEffectCell}
              patternId={patternId}
              pattern={song?.patterns[patternId][selectedEffectCell]}
            />
          </div>
        ) : instrumentData ? (
          <div style={{ marginTop: -1 }}>
            <FormSection>
              <FormSectionTitle>
                {l10n("SIDEBAR_INSTRUMENT")}{" "}
                {String(parseInt(selectedInstrument.id, 10) + 1).padStart(
                  2,
                  "0",
                )}
              </FormSectionTitle>
              <FormRow>
                <Label htmlFor="instrument_name">{l10n("FIELD_NAME")}</Label>
              </FormRow>
              <FormRow>
                <Input
                  id="instrument_name"
                  name="instrument_name"
                  placeholder={instrumentName(
                    instrumentData,
                    selectedInstrument.type,
                  )}
                  value={instrumentData.name || ""}
                  onChange={onChangeInstrumentName(selectedInstrument.type)}
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
              {instrumentEditorTab === "subpattern" && (
                <TabSettings>
                  <CheckboxField
                    name="subpatternEnabled"
                    label={l10n("FIELD_SUBPATTERN_ENBALED")}
                    checked={instrumentData.subpattern_enabled}
                    onChange={(e) => {
                      onChangeInstrumentSubpatternEnabled(
                        selectedInstrument.type,
                      )(e.target.checked);
                    }}
                  />
                </TabSettings>
              )}
            </StickyTabs>
            <InstrumentEditorWrapper>
              {instrumentEditorTab === "main" ? (
                <>
                  {renderInstrumentEditor(
                    selectedInstrument.type,
                    instrumentData,
                    song.waves,
                  )}
                </>
              ) : (
                <InstrumentSubpatternEditor
                  enabled={instrumentData.subpattern_enabled}
                  subpattern={instrumentData.subpattern}
                  instrumentId={instrumentData.index}
                  instrumentType={selectedInstrument.type}
                />
              )}
            </InstrumentEditorWrapper>
          </div>
        ) : (
          ""
        )}
      </FormContainer>
    </Sidebar>
  );
};
