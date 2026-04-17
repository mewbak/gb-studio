import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  actions as reducerActions,
  SubpatternEditorMode,
  TrackerViewType,
} from "./trackerState";
import API from "renderer/lib/api";

export const initViewFromSaved = createAsyncThunk(
  "tracker/initView",
  async (_, thunkApi) => {
    const view = await API.settings.getString("trackerView", "roll");
    if (view === "tracker" || view === "roll") {
      thunkApi.dispatch(actions.setView(view));
    }

    const subpatternEditorMode = await API.settings.getString(
      "subpatternEditorMode",
      "script",
    );
    if (
      subpatternEditorMode === "script" ||
      subpatternEditorMode === "tracker"
    ) {
      thunkApi.dispatch(actions.setSubpatternEditorMode(subpatternEditorMode));
    }

    const metronomeEnabled = await API.settings.get("trackerMetronomeEnabled");
    if (typeof metronomeEnabled === "boolean") {
      thunkApi.dispatch(actions.setMetronomeEnabled(metronomeEnabled));
    }
  },
);

export const setViewAndSave = createAsyncThunk<void, TrackerViewType>(
  "tracker/setViewAndSave",
  async (payload, thunkApi) => {
    thunkApi.dispatch(actions.setView(payload));
    await API.settings.set("trackerView", payload);
  },
);

export const setSubpatternEditorModeAndSave = createAsyncThunk<
  void,
  SubpatternEditorMode
>("tracker/setSubpatternEditorModeAndSave", async (payload, thunkApi) => {
  thunkApi.dispatch(actions.setSubpatternEditorMode(payload));
  await API.settings.set("subpatternEditorMode", payload);
});

export const setMetronomeEnabledAndSave = createAsyncThunk<void, boolean>(
  "tracker/setMetronomeEnabledAndSave",
  async (payload, thunkApi) => {
    thunkApi.dispatch(actions.setMetronomeEnabled(payload));
    await API.settings.set("trackerMetronomeEnabled", payload);
  },
);

const actions = {
  ...reducerActions,
  initViewFromSaved,
  setViewAndSave,
  setSubpatternEditorModeAndSave,
  setMetronomeEnabledAndSave,
};

export default actions;
