import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FlatList } from "ui/lists/FlatList";
import editorActions from "store/features/editor/editorActions";
import { EntityListItem } from "ui/lists/EntityListItem";
import l10n from "shared/lib/lang/l10n";
import { InstrumentType } from "store/features/editor/editorState";
import {
  DutyInstrument,
  NoiseInstrument,
  WaveInstrument,
} from "shared/lib/uge/types";
import { Button } from "ui/buttons/Button";
import { ArrowLeftRightIcon } from "ui/icons/Icons";
import { SplitPaneHeader } from "ui/splitpane/SplitPaneHeader";
import trackerActions from "store/features/tracker/trackerActions";
import API from "renderer/lib/api";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { MenuItem } from "ui/menu/Menu";
import { assertUnreachable } from "shared/lib/helpers/assert";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { SplitPaneChildProps } from "ui/splitpane/SplitPaneVerticalContainer";
import { SplitPane } from "ui/splitpane/SplitPane";

const COLLAPSED_SIZE = 30;

interface NavigatorItem {
  id: string;
  name: string;
}

interface InstrumentNavigatorItem {
  id: string;
  name: string;
  instrumentId: string;
  type: InstrumentType;
  isGroup: boolean;
  labelColor?: string;
}

const instrumentToNavigatorItem =
  (type: InstrumentType) =>
  (
    instrument: DutyInstrument | NoiseInstrument | WaveInstrument,
    instrumentIndex: number,
    defaultName: string,
  ): InstrumentNavigatorItem => {
    const name = instrument.name
      ? instrument.name
      : `${defaultName} ${instrumentIndex + 1}`;

    return {
      id: `${type}_${instrument.index}`,
      name,
      type,
      instrumentId: `${instrument.index}`,
      isGroup: false,
      labelColor: `instrument-${instrument.index}`,
    };
  };

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const sortByIndex = (a: NavigatorItem, b: NavigatorItem) => {
  return collator.compare(a.id, b.id);
};

const emptyDutyInstruments: DutyInstrument[] = [];
const emptyWaveInstruments: WaveInstrument[] = [];
const emptyNoiseInstruments: NoiseInstrument[] = [];

export const NavigatorInstrumentsPane = ({
  height,
  onToggle,
}: SplitPaneChildProps) => {
  const dispatch = useAppDispatch();

  const dutyInstruments = useAppSelector(
    (state) =>
      state.trackerDocument.present.song?.duty_instruments ??
      emptyDutyInstruments,
  );

  const waveInstruments = useAppSelector(
    (state) =>
      state.trackerDocument.present.song?.wave_instruments ??
      emptyWaveInstruments,
  );

  const noiseInstruments = useAppSelector(
    (state) =>
      state.trackerDocument.present.song?.noise_instruments ??
      emptyNoiseInstruments,
  );

  const selectedInstrument = useAppSelector(
    (state) => state.editor.selectedInstrument,
  );
  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );
  const view = useAppSelector((state) => state.tracker.view);

  const [openInstrumentGroupIds, setOpenInstrumentGroupIds] = useState<
    InstrumentType[]
  >(["duty"]);

  const toggleInstrumentOpen = (id: InstrumentType) => () => {
    if (isOpen(id)) {
      closeInstrumentGroup(id);
    } else {
      openInstrumentGroup(id);
    }
  };

  const [syncInstruments, setSyncInstruments] = useState(true);
  useEffect(() => {
    (async function set() {
      const syncedInstrumentSetting =
        (await API.settings.get("trackerSidebarSyncInstruments")) ?? true;
      setSyncInstruments(syncedInstrumentSetting as boolean);
    })();
  }, []);
  const handleSyncInstruments = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.stopPropagation();

      setSyncInstruments(!syncInstruments);
      API.settings.set("trackerSidebarSyncInstruments", !syncInstruments);
    },
    [syncInstruments],
  );

  const lastSelectedChannel = useRef(selectedChannel);
  useEffect(() => {
    if (
      view === "roll" &&
      syncInstruments &&
      selectedChannel !== lastSelectedChannel.current
    ) {
      lastSelectedChannel.current = selectedChannel;
      if (selectedChannel === 0 || selectedChannel === 1) {
        setOpenInstrumentGroupIds(["duty"]);
      }
      if (selectedChannel === 2) {
        setOpenInstrumentGroupIds(["wave"]);
      }
      if (selectedChannel === 3) {
        setOpenInstrumentGroupIds(["noise"]);
      }
    }
  }, [selectedChannel, syncInstruments, view]);

  const openInstrumentGroup = (id: InstrumentType) => {
    setOpenInstrumentGroupIds((value) =>
      ([] as InstrumentType[]).concat(value, id),
    );
  };

  const closeInstrumentGroup = (id: InstrumentType) => {
    setOpenInstrumentGroupIds((value) => value.filter((s) => s !== id));
  };

  const isOpen = useCallback(
    (id: InstrumentType) => {
      return openInstrumentGroupIds.includes(id);
    },
    [openInstrumentGroupIds],
  );

  const instrumentItems = useMemo(() => {
    const items: InstrumentNavigatorItem[] = [];
    return items.concat(
      [
        {
          name: "Duty",
          id: "duty_group",
          instrumentId: "group",
          type: "duty",
          isGroup: true,
        },
      ],
      isOpen("duty")
        ? (dutyInstruments || [])
            .map((duty, i) =>
              instrumentToNavigatorItem("duty")(duty, i, "Duty"),
            )
            .sort(sortByIndex)
        : [],
      [
        {
          name: "Wave",
          id: "wave_group",
          instrumentId: "group",
          type: "wave",
          isGroup: true,
        },
      ],
      isOpen("wave")
        ? (waveInstruments || [])
            .map((wave, i) =>
              instrumentToNavigatorItem("wave")(wave, i, "Wave"),
            )
            .sort(sortByIndex)
        : [],
      [
        {
          name: "Noise",
          id: "noise_group",
          instrumentId: "group",
          type: "noise",
          isGroup: true,
        },
      ],
      isOpen("noise")
        ? (noiseInstruments || [])
            .map((noise, i) =>
              instrumentToNavigatorItem("noise")(noise, i, "Noise"),
            )
            .sort(sortByIndex)
        : [],
    );
  }, [dutyInstruments, waveInstruments, noiseInstruments, isOpen]);

  const setSelectedInstrument = useCallback(
    (id: string, item: InstrumentNavigatorItem) => {
      dispatch(
        editorActions.setSelectedInstrument({
          id: item.instrumentId,
          type: item.type,
        }),
      );

      if (!item.isGroup && syncInstruments) {
        let newSelectedChannel = 0;
        switch (item.type) {
          case "duty":
            newSelectedChannel = selectedChannel === 1 ? 1 : 0;
            break;
          case "wave":
            newSelectedChannel = 2;
            break;
          case "noise":
            newSelectedChannel = 3;
            break;
        }
        dispatch(trackerActions.setSelectedChannel(newSelectedChannel));
        const newDefaultInstrument = parseInt(item.instrumentId);
        dispatch(
          trackerActions.setDefaultInstruments([
            newDefaultInstrument,
            newDefaultInstrument,
            newDefaultInstrument,
            newDefaultInstrument,
          ]),
        );
      }
    },
    [dispatch, selectedChannel, syncInstruments],
  );

  const [renameId, setRenameId] = useState("");

  const onRenameInstrumentComplete = useCallback(
    (name: string, item: InstrumentNavigatorItem) => {
      if (renameId) {
        const action =
          item.type === "duty"
            ? trackerDocumentActions.editDutyInstrument
            : item.type === "wave"
              ? trackerDocumentActions.editWaveInstrument
              : item.type === "noise"
                ? trackerDocumentActions.editNoiseInstrument
                : assertUnreachable(item.type);

        const instrumentId = parseInt(item.instrumentId);

        dispatch(
          action({
            instrumentId,
            changes: {
              name,
            },
          }),
        );
      }
      setRenameId("");
    },
    [dispatch, renameId],
  );

  const onRenameCancel = useCallback(() => {
    setRenameId("");
  }, []);

  const renderInstrumentContextMenu = useCallback(
    (item: InstrumentNavigatorItem) => {
      return [
        <MenuItem key="rename" onClick={() => setRenameId(item.id)}>
          {l10n("FIELD_RENAME")}
        </MenuItem>,
      ];
    },
    [],
  );

  const renderInstrumentLabel = useCallback((item: InstrumentNavigatorItem) => {
    return `${(parseInt(item.instrumentId) + 1).toString().padStart(2, "0")}: ${
      item.name
    }`;
  }, []);

  return (
    <SplitPane style={{ height }}>
      <SplitPaneHeader
        onToggle={onToggle}
        collapsed={Math.floor(height ?? 0) <= COLLAPSED_SIZE}
        buttons={
          <Button
            variant={syncInstruments ? "primary" : "transparent"}
            size="small"
            title={l10n("TOOL_SYNC_INSTRUMENT_NAVIGATOR")}
            onClick={handleSyncInstruments}
            style={{ minWidth: 26 }}
          >
            <ArrowLeftRightIcon />
          </Button>
        }
      >
        {l10n("FIELD_INSTRUMENTS")}
      </SplitPaneHeader>
      <FlatList
        selectedId={`${selectedInstrument.type}_${selectedInstrument.id}`}
        items={instrumentItems}
        setSelectedId={setSelectedInstrument}
        height={(height ?? 0) - 30}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === "Enter") {
            setRenameId(`${selectedInstrument.type}_${selectedInstrument.id}`);
          } else if (e.key === "ArrowRight") {
            openInstrumentGroup(selectedInstrument.type);
          } else if (e.key === "ArrowLeft") {
            closeInstrumentGroup(selectedInstrument.type);
          }
        }}
      >
        {({ item }) =>
          item.isGroup ? (
            <EntityListItem
              item={item}
              type="song"
              collapsable={true}
              collapsed={!isOpen(item.type)}
              onToggleCollapse={toggleInstrumentOpen(item.type)}
            />
          ) : (
            <EntityListItem
              item={item}
              type={item.type}
              nestLevel={1}
              rename={renameId === item.id}
              onRename={onRenameInstrumentComplete}
              onRenameCancel={onRenameCancel}
              renderContextMenu={renderInstrumentContextMenu}
              renderLabel={renderInstrumentLabel}
            />
          )
        }
      </FlatList>
    </SplitPane>
  );
};
