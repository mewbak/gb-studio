import React, { useCallback } from "react";
import { DropdownButton } from "ui/buttons/DropdownButton";
import {
  FormColumn,
  FormColumns,
  FormHeader,
  FormRow,
} from "ui/form/layout/FormLayout";
import { SidebarColumn, SidebarColumns } from "ui/sidebars/Sidebar";
import { Label } from "ui/form/Label";
import { Input } from "ui/form/Input";
import { Song } from "shared/lib/uge/types";
import { castEventToInt } from "renderer/lib/helpers/castEventValue";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { MenuItem } from "ui/menu/Menu";
import { NumberInput } from "ui/form/NumberInput";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { SidebarHeader } from "ui/form/SidebarHeader";
import { getBaseName } from "shared/lib/helpers/virtualFilesystem";
import {
  InputGroup,
  InputGroupAppend,
  InputGroupLabel,
} from "ui/form/InputGroup";
import { getBPM } from "components/music/helpers";
import l10n from "shared/lib/lang/l10n";

export const SongMetadataEditor = () => {
  const dispatch = useAppDispatch();

  const sequenceId = useAppSelector((state) => state.editor.selectedSequence);
  const song = useAppSelector((state) => state.trackerDocument.present.song);

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

  const onRemovePattern = useCallback(() => {
    dispatch(
      trackerDocumentActions.removeSequence({
        sequenceIndex: sequenceId,
      }),
    );
  }, [dispatch, sequenceId]);

  if (!song) {
    return null;
  }

  return (
    <>
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
          <FormColumns>
            <FormColumn>
              <Label htmlFor="name">{l10n("FIELD_NAME")}</Label>
              <Input
                id="name"
                name="name"
                placeholder={l10n("FIELD_SONG")}
                value={song?.name}
                onChange={onChangeName}
              />
            </FormColumn>
            <FormColumn>
              <Label htmlFor="artist">{l10n("FIELD_ARTIST")}</Label>

              <Input
                id="artist"
                name="artist"
                placeholder={l10n("FIELD_ARTIST")}
                value={song?.artist}
                onChange={onChangeArtist}
              />
            </FormColumn>
          </FormColumns>
        </SidebarColumn>
        <SidebarColumn>
          <FormRow>
            <Label htmlFor="ticks_per_row">{l10n("FIELD_TEMPO")}</Label>
          </FormRow>
          <FormRow>
            <InputGroup>
              <NumberInput
                id="ticks_per_row"
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
                <InputGroupLabel htmlFor="ticks_per_row">
                  ~{Math.round(getBPM(song.ticks_per_row))} BPM
                </InputGroupLabel>
              </InputGroupAppend>
            </InputGroup>
          </FormRow>
        </SidebarColumn>
      </SidebarColumns>
    </>
  );
};
