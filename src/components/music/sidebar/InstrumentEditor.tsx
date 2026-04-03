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
import { InstrumentSubpatternTracker } from "components/music/form/subpattern/InstrumentSubpatternTracker";
import { InstrumentSubpatternScript } from "components/music/form/subpattern/InstrumentSubpatternScript";

import {
  DutyInstrument,
  NoiseInstrument,
  SubPatternCell,
  WaveInstrument,
} from "shared/lib/uge/types";
import l10n from "shared/lib/lang/l10n";
import trackerActions from "store/features/tracker/trackerActions";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { BlankIcon, CheckIcon } from "ui/icons/Icons";
import { DropdownButton } from "ui/buttons/DropdownButton";
import { MenuDivider, MenuItem } from "ui/menu/Menu";
import {
  doubleSubpattern,
  halfSubpattern,
  offsetToStoredPitch,
} from "components/music/form/subpattern/helpers";
import { createSubPattern } from "shared/lib/uge/song";
import { InstrumentTester } from "components/music/form/InstrumentTester";

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

const StyledStickyFooter = styled.div`
  position: sticky;
  bottom: 0;
  background: ${(props) => props.theme.colors.sidebar.background};
  border-top: 1px solid ${(props) => props.theme.colors.sidebar.border};
  padding-top: 10px;
  padding-bottom: env(safe-area-inset-bottom);
`;

const instrumentTypeLabels: Record<InstrumentType, string> = {
  duty: "Duty",
  wave: "Wave",
  noise: "Noise",
};

type SubpatternPreset = {
  name: string;
  value: SubPatternCell[];
};

type SubpatternJump = readonly [fromIndex: number, toIndex: number];

const createSubpatternPreset = (
  name: string,
  pitch: number[],
  jump: SubpatternJump[] = [],
): SubpatternPreset => {
  const cells = createSubPattern();

  const jumpMap = new Map<number, number>(jump);

  pitch.forEach((offset, index) => {
    const jumpTo = jumpMap.get(index);
    cells[index] = {
      note: offsetToStoredPitch(offset),
      jump: jumpTo !== undefined ? jumpTo + 1 : null,
      effectcode: null,
      effectparam: null,
    };
  });

  return {
    name,
    value: cells,
  };
};

const presets: (SubpatternPreset | "divider")[] = [
  createSubpatternPreset("Major (0 +4 +7)", [0, 4, 7], [[2, 0]]),
  createSubpatternPreset("Minor (0 +3 +7)", [0, 3, 7], [[2, 0]]),
  createSubpatternPreset("Diminished (0 +3 +6)", [0, 3, 6], [[2, 0]]),
  createSubpatternPreset("Augmented (0 +4 +8)", [0, 4, 8], [[2, 0]]),
  "divider",
  createSubpatternPreset("Major 7 (0 +4 +7 +11)", [0, 4, 7, 11], [[3, 0]]),
  createSubpatternPreset("Dominant 7 (0 +4 +7 +10)", [0, 4, 7, 10], [[3, 0]]),
  createSubpatternPreset("Minor 7 (0 +3 +7 +10)", [0, 3, 7, 10], [[3, 0]]),
  "divider",
  createSubpatternPreset("Sus2 (0 +2 +7)", [0, 2, 7], [[2, 0]]),
  createSubpatternPreset("Sus4 (0 +5 +7)", [0, 5, 7], [[2, 0]]),
  "divider",
  createSubpatternPreset("Power (0 +7)", [0, 7], [[1, 0]]),
  createSubpatternPreset("Octave (0 +12)", [0, 12], [[1, 0]]),
  createSubpatternPreset("Octave + Fifth (0 +7 +12)", [0, 7, 12], [[2, 0]]),
  "divider",
  createSubpatternPreset("Major Up-Down (0 +4 +7 +4)", [0, 4, 7, 4], [[3, 0]]),
  createSubpatternPreset("Minor Up-Down (0 +3 +7 +3)", [0, 3, 7, 3], [[3, 0]]),
];

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

  const onSetViewTracker = useCallback(() => {
    dispatch(trackerActions.setSubpatternEditorModeAndSave("tracker"));
  }, [dispatch]);

  const onSetViewScript = useCallback(() => {
    dispatch(trackerActions.setSubpatternEditorModeAndSave("script"));
  }, [dispatch]);

  const onSetPreset = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!resolvedInstrument) {
        return;
      }
      console.log(e.currentTarget, e.currentTarget.dataset);
      const presetId = parseInt(e.currentTarget.dataset.presetId ?? "0", 10);
      const preset = presets[presetId];
      if (preset !== "divider" && preset.value) {
        dispatch(
          editInstrument({
            instrumentId: resolvedInstrument.instrument.index,
            changes: {
              subpattern: preset.value,
            },
          }),
        );
      }
    },
    [dispatch, editInstrument, resolvedInstrument],
  );

  const onSpreadSubpattern = useCallback(() => {
    if (!resolvedInstrument || !resolvedInstrument.instrument.subpattern) {
      return;
    }
    dispatch(
      editInstrument({
        instrumentId: resolvedInstrument.instrument.index,
        changes: {
          subpattern: doubleSubpattern(
            resolvedInstrument.instrument.subpattern,
          ),
        },
      }),
    );
  }, [dispatch, editInstrument, resolvedInstrument]);

  const onCompactSubpattern = useCallback(() => {
    if (!resolvedInstrument || !resolvedInstrument.instrument.subpattern) {
      return;
    }
    dispatch(
      editInstrument({
        instrumentId: resolvedInstrument.instrument.index,
        changes: {
          subpattern: halfSubpattern(resolvedInstrument.instrument.subpattern),
        },
      }),
    );
  }, [dispatch, editInstrument, resolvedInstrument]);

  const onResetSubpattern = useCallback(() => {
    if (!resolvedInstrument || !resolvedInstrument.instrument.subpattern) {
      return;
    }
    dispatch(
      editInstrument({
        instrumentId: resolvedInstrument.instrument.index,
        changes: {
          subpattern: createSubPattern(),
        },
      }),
    );
  }, [dispatch, editInstrument, resolvedInstrument]);

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
                <DropdownButton variant="transparent">
                  <MenuItem
                    subMenu={[
                      <MenuItem
                        key="script"
                        onClick={onSetViewScript}
                        icon={
                          subpatternEditorMode === "script" ? (
                            <CheckIcon />
                          ) : (
                            <BlankIcon />
                          )
                        }
                      >
                        {l10n("FIELD_SCRIPT")}
                      </MenuItem>,
                      <MenuItem
                        key="tracker"
                        onClick={onSetViewTracker}
                        icon={
                          subpatternEditorMode === "tracker" ? (
                            <CheckIcon />
                          ) : (
                            <BlankIcon />
                          )
                        }
                      >
                        {l10n("FIELD_TRACKER")}
                      </MenuItem>,
                    ]}
                  >
                    {l10n("MENU_VIEW")}
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem
                    subMenu={presets.map((preset, presetIndex) =>
                      preset === "divider" ? (
                        <MenuDivider key={presetIndex} />
                      ) : (
                        <MenuItem
                          key={preset.name}
                          data-preset-id={presetIndex}
                          onClick={onSetPreset}
                        >
                          {preset.name}
                        </MenuItem>
                      ),
                    )}
                  >
                    {l10n("FIELD_PRESETS")}
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem onClick={onSpreadSubpattern}>
                    {l10n("FIELD_SPREAD")}
                  </MenuItem>
                  <MenuItem onClick={onCompactSubpattern}>
                    {l10n("FIELD_COMPACT")}
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem onClick={onResetSubpattern}>
                    {l10n("FIELD_RESET_SUBPATTERN")}
                  </MenuItem>
                </DropdownButton>
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
          <InstrumentSubpatternTracker
            subpattern={resolvedInstrument.instrument.subpattern}
            instrumentId={resolvedInstrument.instrument.index}
            instrumentType={resolvedInstrument.instrumentType}
          />
        ) : (
          <InstrumentSubpatternScript
            subpattern={resolvedInstrument.instrument.subpattern}
            instrumentId={resolvedInstrument.instrument.index}
            instrumentType={resolvedInstrument.instrumentType}
          />
        )
      ) : null}

      <StyledStickyFooter>
        <InstrumentTester
          instrumentId={selectedInstrumentId}
          instrumentType={instrumentType}
        />
        <div id="PortalInstrumentEditorFooter" />
      </StyledStickyFooter>
    </>
  );
};
