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
import { MenuDivider, MenuGroup, MenuItem } from "ui/menu/Menu";
import {
  doubleSubpattern,
  halfSubpattern,
  offsetToStoredPitch,
} from "components/music/form/subpattern/helpers";
import { createSubPattern } from "shared/lib/uge/song";
import { InstrumentTester } from "components/music/form/InstrumentTester";
import { FixedSpacer, FlexGrow } from "ui/spacing/Spacing";
import API from "renderer/lib/api";
import {
  isDutyInstrument,
  isNoiseInstrument,
  isWaveInstrument,
  ugiInstrumentType,
} from "shared/lib/uge/ugiHelper";

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
  type: "preset";
  name: string;
  value: SubPatternCell[];
};

type SubpatternPresetGroup = {
  type: "group";
  name: string;
};

type SubpatternJump = readonly [fromIndex: number, toIndex: number];

type SubpatternEffect = readonly [
  rowIndex: number,
  effectCode: number,
  effectParam: number,
];

const createSubpatternPreset = (
  name: string,
  pitch: number[],
  jump: SubpatternJump[] = [],
  effects: SubpatternEffect[] = [],
): SubpatternPreset => {
  const cells = createSubPattern();

  const jumpMap = new Map<number, number>(jump);
  const effectMap = new Map<number, readonly [number, number]>(
    effects.map(([rowIndex, effectCode, effectParam]) => [
      rowIndex,
      [effectCode, effectParam] as const,
    ]),
  );

  const lastPitchIndex = pitch.length - 1;
  const lastJumpIndex = jump.reduce(
    (max, [fromIndex]) => Math.max(max, fromIndex),
    -1,
  );
  const lastEffectIndex = effects.reduce(
    (max, [rowIndex]) => Math.max(max, rowIndex),
    -1,
  );

  const maxLength = Math.min(
    cells.length,
    Math.max(lastPitchIndex, lastJumpIndex, lastEffectIndex) + 1,
  );

  for (let index = 0; index < maxLength; index++) {
    const offset = pitch[index];
    const jumpTo = jumpMap.get(index);
    const effect = effectMap.get(index);

    cells[index] = {
      note: offset !== undefined ? offsetToStoredPitch(offset) : null,
      jump: jumpTo !== undefined ? jumpTo + 1 : null,
      effectcode: effect?.[0] ?? null,
      effectparam: effect?.[1] ?? null,
    };
  }

  return {
    type: "preset",
    name,
    value: cells,
  };
};

const createSubpatternPresetGroup = (name: string): SubpatternPresetGroup => ({
  type: "group",
  name,
});

const presets: (SubpatternPreset | SubpatternPresetGroup)[] = [
  createSubpatternPresetGroup("Arpeggio"),
  createSubpatternPreset("Major Arp (0 +4 +7)", [0, 4, 7], [[2, 0]]),
  createSubpatternPreset("Minor Arp (0 +3 +7)", [0, 3, 7], [[2, 0]]),
  createSubpatternPreset("Major 7 Arp (0 +4 +7 +11)", [0, 4, 7, 11], [[3, 0]]),
  createSubpatternPreset(
    "Dominant 7 Arp (0 +4 +7 +10)",
    [0, 4, 7, 10],
    [[3, 0]],
  ),
  createSubpatternPreset("Minor 7 Arp (0 +3 +7 +10)", [0, 3, 7, 10], [[3, 0]]),
  createSubpatternPreset("Sus2 Arp (0 +2 +7)", [0, 2, 7], [[2, 0]]),
  createSubpatternPreset("Sus4 Arp (0 +5 +7)", [0, 5, 7], [[2, 0]]),
  createSubpatternPreset("Power Arp (0 +7)", [0, 7], [[1, 0]]),

  createSubpatternPresetGroup("Pluck"),
  createSubpatternPreset("Pluck (+12 0)", [12, 0], [[1, 1]]),
  createSubpatternPreset("Pluck (+12 +7 0)", [12, 7, 0], [[2, 2]]),
  createSubpatternPreset("Pluck (+24 +12 0)", [24, 12, 0], [[2, 2]]),

  createSubpatternPresetGroup("Vibrato"),
  createSubpatternPreset(
    "Vibrato Light",
    [0],
    [[3, 0]],
    [
      [0, 0x4, 0x11],
      [1, 0x4, 0x11],
      [2, 0x4, 0x11],
      [3, 0x4, 0x11],
    ],
  ),
  createSubpatternPreset(
    "Vibrato Medium",
    [0],
    [[3, 0]],
    [
      [0, 0x4, 0x22],
      [1, 0x4, 0x22],
      [2, 0x4, 0x22],
      [3, 0x4, 0x22],
    ],
  ),
  createSubpatternPreset(
    "Vibrato Heavy",
    [0],
    [[3, 0]],
    [
      [0, 0x4, 0x34],
      [1, 0x4, 0x34],
      [2, 0x4, 0x34],
      [3, 0x4, 0x34],
    ],
  ),
  createSubpatternPresetGroup("Noise"),
  createSubpatternPreset("Hi-Hat", [32, 32]),
  createSubpatternPreset("Crash", [24, 24]),
  createSubpatternPreset("Bass", [16, 15]),
  createSubpatternPreset("Explosion", [13, 11, 9, 7, 7, 7]),
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

export const InstrumentEditor = ({
  offsetHeader,
}: {
  offsetHeader?: boolean;
}) => {
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
      if (preset.type === "preset" && preset.value) {
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

  const onExportInstrument = useCallback(async () => {
    if (!resolvedInstrument) {
      return;
    }
    await API.tracker.exportInstrument(resolvedInstrument.instrument);
  }, [resolvedInstrument]);

  const onExportWave = useCallback(async () => {
    if (
      !song ||
      !resolvedInstrument ||
      !isWaveInstrument(resolvedInstrument.instrument)
    ) {
      return;
    }
    const waveIndex = resolvedInstrument.instrument.wave_index;
    const wave = song.waves[waveIndex];
    if (!wave) return;
    await API.tracker.exportWave(
      wave,
      resolvedInstrument.instrument.name || "wave",
    );
  }, [song, resolvedInstrument]);

  const onImportWave = useCallback(async () => {
    if (
      !resolvedInstrument ||
      !isWaveInstrument(resolvedInstrument.instrument)
    ) {
      return;
    }
    const waveData = await API.tracker.importWave();
    if (!waveData) return;
    dispatch(
      trackerDocumentActions.editWaveform({
        index: resolvedInstrument.instrument.wave_index,
        waveForm: waveData,
      }),
    );
  }, [dispatch, resolvedInstrument]);

  const onImportInstrument = useCallback(async () => {
    if (!resolvedInstrument) {
      return;
    }
    const imported = await API.tracker.importInstrument();
    if (!imported) {
      return;
    }
    // Validate that the imported instrument matches the current channel type
    if (ugiInstrumentType(imported) !== resolvedInstrument.instrumentType) {
      // eslint-disable-next-line no-alert
      alert(
        l10n("ERROR_INSTRUMENT_TYPE_MISMATCH", {
          expected: resolvedInstrument.instrumentType,
          got: ugiInstrumentType(imported),
        }),
      );
      return;
    }
    // Apply all fields from the imported instrument (except index)
    if (
      isDutyInstrument(imported) &&
      isDutyInstrument(resolvedInstrument.instrument)
    ) {
      dispatch(
        editInstrument({
          instrumentId: resolvedInstrument.instrument.index,
          changes: {
            name: imported.name,
            length: imported.length,
            duty_cycle: imported.duty_cycle,
            initial_volume: imported.initial_volume,
            volume_sweep_change: imported.volume_sweep_change,
            frequency_sweep_time: imported.frequency_sweep_time,
            frequency_sweep_shift: imported.frequency_sweep_shift,
            subpattern_enabled: imported.subpattern_enabled,
            subpattern: imported.subpattern,
          },
        }),
      );
    } else if (
      isWaveInstrument(imported) &&
      isWaveInstrument(resolvedInstrument.instrument)
    ) {
      dispatch(
        editInstrument({
          instrumentId: resolvedInstrument.instrument.index,
          changes: {
            name: imported.name,
            length: imported.length,
            volume: imported.volume,
            wave_index: imported.wave_index,
            subpattern_enabled: imported.subpattern_enabled,
            subpattern: imported.subpattern,
          },
        }),
      );
    } else if (
      isNoiseInstrument(imported) &&
      isNoiseInstrument(resolvedInstrument.instrument)
    ) {
      dispatch(
        editInstrument({
          instrumentId: resolvedInstrument.instrument.index,
          changes: {
            name: imported.name,
            length: imported.length,
            initial_volume: imported.initial_volume,
            volume_sweep_change: imported.volume_sweep_change,
            bit_count: imported.bit_count,
            subpattern_enabled: imported.subpattern_enabled,
            subpattern: imported.subpattern,
          },
        }),
      );
    }
  }, [dispatch, editInstrument, resolvedInstrument]);

  if (!song || !resolvedInstrument || !resolvedInstrument.instrument) {
    return null;
  }

  return (
    <>
      <FormSection>
        <FormSectionTitle>
          {offsetHeader && <FixedSpacer width={35} />}
          {instrumentTypeLabels[resolvedInstrument.instrumentType]}
          {" / "}
          {l10n("SIDEBAR_INSTRUMENT")}{" "}
          {String(resolvedInstrument.instrument.index + 1).padStart(2, "0")}
          <FlexGrow />
          <DropdownButton variant="transparent" size="small">
            <MenuItem onClick={onImportInstrument}>
              {l10n("FIELD_IMPORT_INSTRUMENT")}
            </MenuItem>
            <MenuItem onClick={onExportInstrument}>
              {l10n("FIELD_EXPORT_INSTRUMENT")}
            </MenuItem>
            {resolvedInstrument.instrumentType === "wave" && <MenuDivider />}
            {resolvedInstrument.instrumentType === "wave" && (
              <MenuItem onClick={onImportWave}>
                {l10n("FIELD_IMPORT_WAVE")}
              </MenuItem>
            )}
            {resolvedInstrument.instrumentType === "wave" && (
              <MenuItem onClick={onExportWave}>
                {l10n("FIELD_EXPORT_WAVE")}
              </MenuItem>
            )}
          </DropdownButton>
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
                      preset.type === "group" ? (
                        <MenuGroup>{preset.name}</MenuGroup>
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
