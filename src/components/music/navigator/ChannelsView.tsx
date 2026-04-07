import React, {
  CSSProperties,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import l10n from "shared/lib/lang/l10n";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { channels } from "shared/lib/music/constants";
import { FixedSizeList as List } from "react-window";
import styled, { ThemeContext } from "styled-components";
import { getEventNodeName } from "renderer/lib/helpers/dom";
import throttle from "lodash/throttle";
import API from "renderer/lib/api";
import { Button } from "ui/buttons/Button";
import {
  EyeOpenIcon,
  EyeClosedIcon,
  ChannelMuteIcon,
  ChannelSoloIcon,
  Duty1Icon,
  Duty2Icon,
  Wave3Icon,
  Noise4Icon,
} from "ui/icons/Icons";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { FixedSpacer } from "ui/spacing/Spacing";
import { toValidChannelId } from "shared/lib/uge/editor/helpers";

interface ChannelNavigatorItem {
  id: string;
  index: 0 | 1 | 2 | 3;
  name: string;
  shortName: string;
  type: string;
}

interface ChannelNavigatorListData {
  items: ChannelNavigatorItem[];
  selectedId: string;
  setSelectedId: (id: string, item: ChannelNavigatorItem) => void;
}

interface ChannelNavigatorRowProps {
  index: number;
  style: CSSProperties;
  data: ChannelNavigatorListData;
}

const Wrapper = styled.div`
  padding: 0;
  width: 100%;
  box-sizing: border-box;
`;

const StyledVisiblityIcon = styled.div`
  padding-top: 1px;
  svg {
    width: 14px;
    height: 14px;
    max-width: 14px;
    max-height: 14px;
  }
`;

const StyledChannelIcon = styled.div<{ channel: number }>`
  svg {
    fill: ${(props) => props.theme.colors.text};
    width: 20px;
    height: 20px;
    margin-right: 10px;
  }
`;

const Row = ({ index, style, data }: ChannelNavigatorRowProps) => {
  const item = data.items[index];

  const channelStatus = useAppSelector((state) => state.tracker.channelStatus);

  const soloChannel = useMemo(() => {
    const firstUnmuted = channelStatus.findIndex((x) => !x);
    const lastUnmuted = channelStatus.findLastIndex((x) => !x);
    if (firstUnmuted !== -1 && firstUnmuted === lastUnmuted) {
      return firstUnmuted;
    }
    return -1;
  }, [channelStatus]);

  const muted = channelStatus[item.index] && soloChannel === -1;
  const solo = soloChannel === item.index;

  const dispatch = useAppDispatch();

  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );
  const visibleChannels = useAppSelector(
    (state) => state.tracker.visibleChannels,
  );

  const toggleVisibleChannel = useCallback(
    (channel: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const newVisibleChannels = [...visibleChannels];
      const index = visibleChannels.indexOf(channel);
      if (index > -1) {
        newVisibleChannels.splice(index, 1);
      } else {
        newVisibleChannels.push(channel);
      }
      dispatch(trackerActions.setVisibleChannels(newVisibleChannels));
    },
    [dispatch, visibleChannels],
  );

  const setMute = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      API.music.sendToMusicWindow({
        action: "set-mute",
        channel: index,
        muted: !muted,
      });
    },
    [muted, index],
  );

  const setSolo = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch(trackerActions.setSelectedChannel(toValidChannelId(index)));
      API.music.sendToMusicWindow({
        action: "set-solo",
        channel: index,
        enabled: !solo,
      });
    },
    [dispatch, index, solo],
  );

  const themeContext = useContext(ThemeContext);

  if (!item) {
    return <div style={style} />;
  }

  return (
    <div
      style={style}
      data-id={item.id}
      tabIndex={0}
      onClick={() => data.setSelectedId(item.id, item)}
    >
      <div
        style={{
          display: "flex",
          padding: 5,
          paddingLeft: 10,
          height: 40,
          alignItems: "center",
          boxSizing: "border-box",
          fontSize: 11,
          borderBottom: `1px solid ${themeContext?.colors.sidebar.border}`,
          background:
            selectedChannel === item.index
              ? themeContext?.colors.list.selectedBackground
              : "transparent",
        }}
      >
        <StyledChannelIcon channel={item.index}>
          {item.index === 0 && <Duty1Icon />}
          {item.index === 1 && <Duty2Icon />}
          {item.index === 2 && <Wave3Icon />}
          {item.index === 3 && <Noise4Icon />}
        </StyledChannelIcon>

        <div
          data-selected={data.selectedId === item.id}
          style={{ flexGrow: 1 }}
        >
          {item.name}
        </div>

        <Button
          variant="normal"
          size="small"
          onClick={toggleVisibleChannel(index)}
        >
          <StyledVisiblityIcon>
            {visibleChannels.indexOf(index) > -1 ? (
              <EyeOpenIcon />
            ) : (
              <EyeClosedIcon />
            )}
          </StyledVisiblityIcon>
        </Button>
        <FixedSpacer width={5} />
        <ButtonGroup>
          <Button
            size="small"
            onClick={setSolo}
            variant={solo ? "primary" : "normal"}
            title={l10n("FIELD_SOLO_CHANNEL")}
          >
            <ChannelSoloIcon />
          </Button>
          <Button
            size="small"
            onClick={setMute}
            variant={muted ? "primary" : "normal"}
            title={l10n("FIELD_MUTE_CHANNEL")}
          >
            <ChannelMuteIcon />
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
};

export const ChannelsView = () => {
  const dispatch = useAppDispatch();

  const ref = useRef<HTMLDivElement>(null);
  const [hasFocus, setHasFocus] = useState(false);
  const list = useRef<List>(null);

  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );

  const selectedIndex = channels.findIndex(
    (item) => item.index === selectedChannel,
  );

  const setSelectedId = useCallback(
    (_id: string, item: ChannelNavigatorItem) => {
      dispatch(trackerActions.setSelectedChannel(item.index));
    },
    [dispatch],
  );

  const handleKeys = (e: KeyboardEvent) => {
    if (!hasFocus || getEventNodeName(e) === "INPUT") {
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      throttledNext.current(channels, String(selectedChannel ?? ""));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      throttledPrev.current(channels, String(selectedChannel ?? ""));
    } else if (e.key === "Home") {
      const nextItem = channels[0];
      setSelectedId?.(nextItem.id, nextItem);
      setFocus(nextItem.id);
    } else if (e.key === "End") {
      const nextItem = channels[channels.length - 1];
      setSelectedId?.(nextItem.id, nextItem);
      setFocus(nextItem.id);
    } else {
      handleSearch(e.key);
    }
  };

  const throttledNext = useRef(
    throttle((channels: ChannelNavigatorItem[], selectedId: string) => {
      const currentIndex = channels.findIndex((item) => item.id === selectedId);
      const nextIndex = currentIndex + 1;
      const nextItem = channels[nextIndex];
      if (nextItem) {
        setSelectedId?.(nextItem.id, nextItem);
        setFocus(nextItem.id);
      }
    }, 150),
  );

  const throttledPrev = useRef(
    throttle((channels: ChannelNavigatorItem[], selectedId: string) => {
      const currentIndex = channels.findIndex((item) => item.id === selectedId);
      const nextIndex = currentIndex - 1;
      const nextItem = channels[nextIndex];
      if (nextItem) {
        setSelectedId?.(nextItem.id, nextItem);
        setFocus(nextItem.id);
      }
    }, 150),
  );

  const handleSearch = (key: string) => {
    const search = key.toLowerCase();
    const index = selectedIndex + 1;
    let next = channels.slice(index).find((node) => {
      const name = String(node.name).toLowerCase();
      return name.startsWith(search);
    });
    if (!next) {
      next = channels.slice(0, index).find((node) => {
        const name = String(node.name).toLowerCase();
        return name.startsWith(search);
      });
    }
    if (next) {
      setSelectedId?.(next.id, next);
      setFocus(next.id);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (ref.current && hasFocus && !ref.current.contains(e.target as Node)) {
      setHasFocus(false);
    }
  };

  const setFocus = (id: string) => {
    if (ref.current) {
      const el = ref.current.querySelector('[data-id="' + id + '"]');
      if (el) {
        (el as HTMLDivElement).focus();
      }
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeys);
    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeys);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  });

  useEffect(() => {
    /**
     * enables scrolling on key down arrow
     */
    if (selectedIndex >= 0 && list.current !== null) {
      list.current.scrollToItem(selectedIndex);
    }
  }, [selectedIndex]);

  return (
    <Wrapper
      ref={ref}
      role="listbox"
      onFocus={() => setHasFocus(true)}
      onBlur={() => setHasFocus(false)}
    >
      <List
        ref={list}
        width="100%"
        height={4 * 40}
        itemCount={channels.length}
        itemSize={40}
        itemData={{
          items: channels,
          selectedId: String(selectedChannel ?? ""),
          setSelectedId,
        }}
      >
        {Row}
      </List>
    </Wrapper>
  );
};
