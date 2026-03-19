import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DropdownButton } from "ui/buttons/DropdownButton";
import { EditableText } from "ui/form/EditableText";
import {
  FormContainer,
  FormDivider,
  FormHeader,
  FormRow,
  FormSectionTitle,
} from "ui/form/layout/FormLayout";
import { Sidebar, SidebarColumn, SidebarColumns } from "ui/sidebars/Sidebar";
import { Label } from "ui/form/Label";
import { Input } from "ui/form/Input";
import { InstrumentDutyEditor } from "./sidebar/InstrumentDutyEditor";
import { InstrumentWaveEditor } from "./sidebar/InstrumentWaveEditor";
import { InstrumentNoiseEditor } from "./sidebar/InstrumentNoiseEditor";
import {
  Song,
  DutyInstrument,
  NoiseInstrument,
  WaveInstrument,
} from "shared/lib/uge/types";
import { castEventToInt } from "renderer/lib/helpers/castEventValue";
import l10n from "shared/lib/lang/l10n";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { MenuItem } from "ui/menu/Menu";
import { PatternCellEditor } from "./sidebar/PatternCellEditor";
import trackerActions from "store/features/tracker/trackerActions";
import { StickyTabs, TabBar, TabSettings } from "ui/tabs/Tabs";
import { InstrumentSubpatternEditor } from "./sidebar/InstrumentSubpatternEditor";
import styled from "styled-components";
import { NumberInput } from "ui/form/NumberInput";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { SidebarHeader } from "ui/form/SidebarHeader";
import { getBaseName } from "shared/lib/helpers/virtualFilesystem";
import { InputGroup, InputGroupAppend } from "ui/form/InputGroup";
import { DutyIcon } from "ui/icons/Icons";
import { CheckboxField } from "ui/form/CheckboxField";

type Instrument = DutyInstrument | NoiseInstrument | WaveInstrument;

type InstrumentEditorTab = "main" | "subpattern";
type InstrumentEditorTabs = { [key in InstrumentEditorTab]: string };

const InstrumentEditorWrapper = styled.div`
  padding-top: 10px;
`;

const renderInstrumentEditor = (
  type: string,
  instrumentData: Instrument | null,
  waveForms?: Uint8Array[],
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
    (state) => state.editor.selectedInstrument,
  );
  useEffect(() => {
    dispatch(trackerActions.setSelectedEffectCell(null));
  }, [dispatch, selectedInstrument]);
  const sequenceId = useAppSelector((state) => state.editor.selectedSequence);
  const song = useAppSelector((state) => state.trackerDocument.present.song);

  const selectSidebar = () => {};

  const onChangeSongProp = useCallback(
    <K extends keyof Song>(key: K, value: Song[K]) => {
      dispatch(
        trackerDocumentActions.editSong({
          changes: {
            [key]: value,
          },
        }),
      );
    },
    [dispatch],
  );

  const onChangeName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChangeSongProp("name", e.currentTarget.value),
    [onChangeSongProp],
  );

  const onChangeArtist = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChangeSongProp("artist", e.currentTarget.value),
    [onChangeSongProp],
  );

  const onChangeTicksPerRow = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChangeSongProp("ticks_per_row", castEventToInt(e, 0)),
    [onChangeSongProp],
  );

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

  const onRemovePattern = useCallback(() => {
    dispatch(
      trackerDocumentActions.removeSequence({
        sequenceIndex: sequenceId,
      }),
    );
  }, [dispatch, sequenceId]);

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
      <FormHeader>
        <SidebarHeader>{getBaseName(song.filename)}</SidebarHeader>
        <DropdownButton
          size="small"
          variant="transparent"
          menuDirection="right"
        >
          <MenuItem onClick={onRemovePattern}>
            {l10n("MENU_PATTERN_DELETE")}
          </MenuItem>
        </DropdownButton>
      </FormHeader>
      <SidebarColumns>
        <SidebarColumn>
          <div style={{ display: "flex", gap: 10, padding: 10, paddingTop: 0 }}>
            <div style={{ width: "100%" }}>
              <Label htmlFor="name">{l10n("FIELD_NAME")}</Label>
              <Input
                name="name"
                placeholder={l10n("FIELD_SONG")}
                value={song?.name}
                onChange={onChangeName}
              />
            </div>
            <div style={{ width: "100%" }}>
              <Label htmlFor="artist">{l10n("FIELD_ARTIST")}</Label>

              <Input
                name="artist"
                placeholder={l10n("FIELD_ARTIST")}
                value={song?.artist}
                onChange={onChangeArtist}
              />
            </div>
          </div>
        </SidebarColumn>
        <SidebarColumn>
          <div style={{ display: "flex", gap: 10, padding: 10, paddingTop: 0 }}>
            <div style={{ width: "100%" }}>
              <Label htmlFor="ticks_per_row">{l10n("FIELD_TEMPO")}</Label>
              <div style={{ display: "flex", gap: 5 }}>
                <InputGroup>
                  <NumberInput
                    name="ticks_per_row"
                    type="number"
                    value={song?.ticks_per_row}
                    min={1}
                    max={20}
                    placeholder="1"
                    onChange={onChangeTicksPerRow}
                    title={l10n("FIELD_TEMPO_TOOLTIP")}
                  />
                  <InputGroupAppend>
                    <div
                      style={{
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        background: "white",
                        border: "1px solid #ccc",
                        borderLeft: 0,
                        borderTopRightRadius: 4,
                        borderBottomRightRadius: 4,
                        boxSizing: "border-box",
                        height: "100%",
                        padding: 5,
                        fontSize: 11,
                      }}
                    >
                      ~120 BPM
                    </div>
                  </InputGroupAppend>
                </InputGroup>
              </div>
            </div>
          </div>
        </SidebarColumn>
      </SidebarColumns>

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
            <div style={{ borderBottom: "1px solid #ccc" }}>
              <FormSectionTitle>
                {l10n("SIDEBAR_INSTRUMENT")}
                <div style={{ flexGrow: 1 }}></div>
                <DutyIcon />
              </FormSectionTitle>
              <FormRow>
                <Label htmlFor="name">{l10n("FIELD_NAME")}</Label>
              </FormRow>
              <FormRow>
                <Input
                  name="name"
                  placeholder={instrumentName(
                    instrumentData,
                    selectedInstrument.type,
                  )}
                  value={instrumentData.name || ""}
                  onChange={onChangeInstrumentName(selectedInstrument.type)}
                />
              </FormRow>
            </div>

            {/* <FormHeader>

              
              <EditableText
                name="instrumentName"
                placeholder={instrumentName(
                  instrumentData,
                  selectedInstrument.type,
                )}
                value={instrumentData.name || ""}
                onChange={onChangeInstrumentName(selectedInstrument.type)}
              />

    
            </FormHeader>

             */}

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
