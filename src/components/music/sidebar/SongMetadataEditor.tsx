import React, { useCallback, useEffect, useState } from "react";
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
import { NumberInput } from "ui/form/NumberInput";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { getBaseName } from "shared/lib/helpers/virtualFilesystem";
import {
  InputGroup,
  InputGroupAppend,
  InputGroupLabel,
} from "ui/form/InputGroup";
import { getBPM } from "shared/lib/uge/display";
import l10n from "shared/lib/lang/l10n";
import { EditableText, EditableTextOverlay } from "ui/form/EditableText";
import { FlexGrow } from "ui/spacing/Spacing";
import projectActions from "store/features/project/projectActions";
import { stripInvalidPathCharacters } from "shared/lib/helpers/stripInvalidFilenameCharacters";

export const SongMetadataEditor = () => {
  const dispatch = useAppDispatch();

  const song = useAppSelector((state) => state.trackerDocument.present.song);
  const selectedSongId = useAppSelector(
    (state) => state.tracker.selectedSongId,
  );

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

  const [localFilename, setLocalFilename] = useState(
    song?.filename.replace(/\.uge$/i, "") ?? "",
  );

  useEffect(() => {
    setLocalFilename(song?.filename.replace(/\.uge$/i, "") ?? "");
  }, [song?.filename]);

  const onRenameFile = useCallback(() => {
    const currentFilename = getBaseName(
      song?.filename.replace(/\.uge$/i, "") ?? "",
    );
    const sanitizedFilename = stripInvalidPathCharacters(localFilename).trim();

    if (
      !selectedSongId ||
      !sanitizedFilename ||
      sanitizedFilename === currentFilename
    ) {
      setLocalFilename(currentFilename);
      return;
    }

    dispatch(
      projectActions.renameMusicAsset({
        musicId: selectedSongId,
        newFilename: sanitizedFilename,
      }),
    );
  }, [dispatch, localFilename, selectedSongId, song?.filename]);

  const onRenameFileOnEnter = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        onRenameFile();
      }
    },
    [onRenameFile],
  );

  if (!song) {
    return null;
  }

  return (
    <>
      <FormHeader>
        <FlexGrow style={{ minWidth: 0 }}>
          <EditableText
            name="name"
            placeholder={getBaseName(song.filename)}
            value={localFilename}
            onChange={(e) => setLocalFilename(e.currentTarget.value)}
            onBlur={onRenameFile}
            onKeyDown={onRenameFileOnEnter}
            autoComplete="off"
          />
          <EditableTextOverlay>
            {getBaseName(song.filename)}
          </EditableTextOverlay>
        </FlexGrow>
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
            <Label htmlFor="ticks_per_row">
              {l10n("FIELD_TEMPO")} ({l10n("FIELD_TICKS_PER_ROW")})
            </Label>
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
                pattern="\d*"
              />
              <InputGroupAppend>
                <InputGroupLabel
                  htmlFor="ticks_per_row"
                  style={{ minWidth: 70, justifyContent: "flex-end" }}
                >
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
