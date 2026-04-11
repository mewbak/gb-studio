import API from "renderer/lib/api";
import trackerActions from "store/features/tracker/trackerActions";

type PlaybackDispatch = (action: unknown) => unknown;

let unsubscribeMusicPlaybackListener: (() => void) | undefined;

export const initMusicPlaybackListener = (dispatch: PlaybackDispatch) => {
  unsubscribeMusicPlaybackListener?.();

  const listener = (_event: unknown, data: { action: string; update?: [number, number] }) => {
    if (data.action === "update" && data.update) {
      dispatch(trackerActions.setPlaybackPosition(data.update));
    } else if (data.action === "initialized") {
      dispatch(trackerActions.resetPlaybackPosition());
    }
  };

  unsubscribeMusicPlaybackListener =
    API.events.music.response.subscribe(listener);

  return unsubscribeMusicPlaybackListener;
};
