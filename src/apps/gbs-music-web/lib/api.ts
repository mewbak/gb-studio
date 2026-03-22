import { clearL10NData, setL10NData } from "shared/lib/lang/l10n";
import type {
  MusicDataPacket,
  MusicDataReceivePacket,
} from "shared/lib/music/types";
import type { Song } from "shared/lib/uge/types";
import type { MusicAsset } from "shared/lib/resources/types";
import { webMusicEnvironment } from "./adapters";
import {
  deleteStoredSetting,
  defaultLocaleData,
  getStoredLocaleId,
  getStoredSetting,
  getStoredThemeId,
  getThemeById,
  loadLocaleData,
  setStoredSetting,
} from "./preferences";
import type { MusicSession } from "components/music/helpers/musicSession";
import { MusicEditorStore } from "gbs-music-web/store/configureStore";
import { TRACKER_REDO, TRACKER_UNDO } from "consts";

type MusicResponseListener = (
  _event: unknown,
  data: MusicDataReceivePacket,
) => void;
type MenuListener = (_event: unknown) => void;

const clipboardBufferStore = new Map<string, Uint8Array>();
const musicResponseListeners = new Set<MusicResponseListener>();
const menuSelectAllListeners = new Set<MenuListener>();
const themeListeners = new Set<
  (theme: ReturnType<typeof getThemeById>) => void
>();
let clipboardTextStore = "";
let currentThemeId = getStoredThemeId();
let currentLocaleId = getStoredLocaleId();
let musicSessionPromise: Promise<MusicSession> | null = null;

const ensureMusicSession = async () => {
  if (!musicSessionPromise) {
    musicSessionPromise = import("components/music/helpers/musicSession").then(
      (module) => {
        const session = module.default();
        session.subscribe((data) => {
          emitMusicData(data);
        });
        return session;
      },
    );
  }
  return musicSessionPromise;
};

const applyLocale = async (localeId: string) => {
  currentLocaleId = localeId;
  const localeData = await loadLocaleData(localeId);
  if (currentLocaleId !== localeId) {
    return;
  }
  clearL10NData();
  setL10NData(localeData);
};

const applyTheme = (themeId: string) => {
  currentThemeId = themeId;
  const theme = getThemeById(themeId);
  themeListeners.forEach((listener) => listener(theme));
};

const emitMusicData = (data: MusicDataReceivePacket) => {
  musicResponseListeners.forEach((listener) => listener(undefined, data));
};

const emitMenuSelectAll = () => {
  menuSelectAllListeners.forEach((listener) => listener(undefined));
};

const isEditableTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return (
    !!element &&
    (element.nodeName === "INPUT" ||
      element.nodeName === "TEXTAREA" ||
      element.isContentEditable)
  );
};

const dispatchClipboardEvent = (type: "copy" | "cut" | "paste") => {
  const target =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : document.body;

  target.dispatchEvent(
    new Event(type, {
      bubbles: true,
      cancelable: true,
    }),
  );
};

const readClipboardText = async () => {
  try {
    const text = await navigator.clipboard?.readText?.();
    if (typeof text === "string" && text.length > 0) {
      clipboardTextStore = text;
      return text;
    }
  } catch {
    // Fall back to the in-memory clipboard when browser permissions block reads.
  }
  return clipboardTextStore;
};

const writeClipboardText = async (value: string) => {
  clipboardTextStore = value;
  try {
    await navigator.clipboard?.writeText?.(value);
  } catch {
    // Keep the in-memory clipboard so copy/paste still works inside the web app.
  }
};

const flushClipboardTextToSystem = async () => {
  try {
    await navigator.clipboard?.writeText?.(clipboardTextStore);
  } catch {
    // Some browsers only allow clipboard writes in specific contexts.
  }
};

const loadSongFromFilename = async (filename: string): Promise<Song | null> => {
  const { loadUGESong } = await import("shared/lib/uge/ugeHelper");
  const document = await webMusicEnvironment.loadDocument({
    id: filename,
    name: filename.split("/").pop() || filename,
    filename,
    format: "uge",
  });
  const buffer = Buffer.from(document.data);
  const song = loadUGESong(buffer);
  if (song) {
    song.filename = filename;
  }
  return song;
};

const saveSongToFilename = async (song: Song) => {
  const { saveUGESong } = await import("shared/lib/uge/ugeHelper");
  const data = saveUGESong(song);
  await webMusicEnvironment.saveDocument({
    meta: {
      id: song.filename,
      name: song.filename.split("/").pop() || song.filename,
      filename: song.filename,
      format: "uge",
    },
    data: new Uint8Array(data),
    modified: false,
  });
};

export const installWebRendererApi = (store: MusicEditorStore) => {
  setL10NData(defaultLocaleData);
  void applyLocale(currentLocaleId);

  window.addEventListener("keydown", (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) {
      return;
    }

    if (isEditableTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === "a") {
      event.preventDefault();
      emitMenuSelectAll();
      return;
    }

    if (key === "c" || key === "x") {
      event.preventDefault();
      const command = key === "c" ? "copy" : "cut";
      if (!document.execCommand(command)) {
        dispatchClipboardEvent(command);
        void flushClipboardTextToSystem();
      }
      return;
    }

    if (key === "v") {
      event.preventDefault();
      dispatchClipboardEvent("paste");
      return;
    }

    if (key === "z") {
      if (event.shiftKey) {
        if (store.getState().trackerDocument.future.length > 0) {
          store.dispatch({ type: TRACKER_REDO });
        }
      } else {
        if (store.getState().trackerDocument.past.length > 0) {
          store.dispatch({ type: TRACKER_UNDO });
        }
      }
    }
  });

  const API = {
    platform: "web",
    env: "web",
    l10n: {
      getL10NStrings: () => loadLocaleData(currentLocaleId),
    },
    theme: {
      getTheme: () => Promise.resolve(getThemeById(currentThemeId)),
      onChange: (
        callback: (theme: ReturnType<typeof getThemeById>) => void,
      ) => {
        themeListeners.add(callback);
        return () => themeListeners.delete(callback);
      },
    },
    settings: {
      get: (key: string) => Promise.resolve(getStoredSetting(key)),
      getString: (key: string, fallback: string) =>
        Promise.resolve((getStoredSetting(key) as string) ?? fallback),
      getNumber: (key: string, fallback: number) =>
        Promise.resolve((getStoredSetting(key) as number) ?? fallback),
      set: (key: string, value: unknown) => {
        setStoredSetting(key, value);
        return Promise.resolve();
      },
      delete: (key: string) => {
        deleteStoredSetting(key);
        return Promise.resolve();
      },
      app: {
        setUIScale: () => Promise.resolve(),
        getUIScale: () => Promise.resolve(0),
        setTrackerKeyBindings: () => Promise.resolve(),
        getTrackerKeyBindings: () => Promise.resolve(0),
      },
    },
    dialog: {
      confirmUnsavedChangesTrackerDialog: () => Promise.resolve(2),
      showError: () => Promise.resolve(),
    },
    clipboard: {
      readText: readClipboardText,
      readBuffer: async (format: string) =>
        Buffer.from(clipboardBufferStore.get(format) ?? new Uint8Array()),
      writeText: writeClipboardText,
      writeBuffer: async (format: string, buffer: Uint8Array) => {
        clipboardBufferStore.set(format, Uint8Array.from(buffer));
      },
    },
    tracker: {
      addNewUGEFile: async (path: string) => {
        const { createSong } = await import("shared/lib/uge/song");
        const song = createSong();
        song.filename = path;
        await saveSongToFilename(song);
        return {
          _v: 0,
          inode: path,
          _resourceType: "music",
          id: path,
          name:
            path
              .split("/")
              .pop()
              ?.replace(/\.[^.]+$/, "") || path,
          symbol: `song_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
          filename: path,
          settings: {},
          type: "uge",
        } as MusicAsset;
      },
      loadUGEFile: loadSongFromFilename,
      saveUGEFile: saveSongToFilename,
      convertModToUge: async (_asset: MusicAsset) => {
        throw new Error(
          "MOD conversion is not yet available in the web editor",
        );
      },
    },
    music: {
      openMusic: () => {
        void ensureMusicSession().then((session) => {
          session.open();
        });
      },
      closeMusic: () => {
        void ensureMusicSession().then((session) => {
          // @TODO Should this be added?
          console.warn("CANT CLOSE MUSIC SESSION", session);
        });
      },
      sendToMusicWindow: (data: MusicDataPacket) => {
        void ensureMusicSession().then((session) => {
          session.send(data);
        });
      },
      playUGE: async () => undefined,
      playMOD: async () => undefined,
    },
    events: {
      music: {
        response: {
          subscribe: (listener: MusicResponseListener) => {
            musicResponseListeners.add(listener);
            return () => musicResponseListeners.delete(listener);
          },
        },
      },
      menu: {
        selectAll: {
          subscribe: (listener: MenuListener) => {
            menuSelectAllListeners.add(listener);
            return () => menuSelectAllListeners.delete(listener);
          },
        },
        pasteInPlace: {
          subscribe: () => () => undefined,
        },
      },
    },
  };

  (window as typeof window & { API?: typeof API }).API = API;

  return {
    getThemeId: () => currentThemeId,
    setThemeId: (themeId: string) => {
      setStoredSetting("themeId", themeId);
      applyTheme(themeId);
    },
    getLocaleId: () => currentLocaleId,
    setLocaleId: (localeId: string) => {
      setStoredSetting("locale", localeId);
      void applyLocale(localeId);
    },
  };
};
