import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  QuantizeSnapSetting,
  actions as reducerActions,
  SubpatternEditorMode,
  TrackerViewType,
} from "./trackerState";
import API from "renderer/lib/api";

const initViewFromSaved = createAsyncThunk(
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

    const quantizeSnap = await API.settings.get("trackerQuantizeSnap");
    if (
      quantizeSnap === "none" ||
      quantizeSnap === "halfbeat" ||
      quantizeSnap === "beat"
    ) {
      thunkApi.dispatch(actions.setQuantizeSnap(quantizeSnap));
    }
  },
);

const setViewAndSave = createAsyncThunk<void, TrackerViewType>(
  "tracker/setViewAndSave",
  async (payload, thunkApi) => {
    thunkApi.dispatch(actions.setView(payload));
    await API.settings.set("trackerView", payload);
  },
);

const setSubpatternEditorModeAndSave = createAsyncThunk<
  void,
  SubpatternEditorMode
>("tracker/setSubpatternEditorModeAndSave", async (payload, thunkApi) => {
  thunkApi.dispatch(actions.setSubpatternEditorMode(payload));
  await API.settings.set("subpatternEditorMode", payload);
});

const setMetronomeEnabledAndSave = createAsyncThunk<void, boolean>(
  "tracker/setMetronomeEnabledAndSave",
  async (payload, thunkApi) => {
    thunkApi.dispatch(actions.setMetronomeEnabled(payload));
    await API.settings.set("trackerMetronomeEnabled", payload);
  },
);

const setQuantizeSnapAndSave = createAsyncThunk<void, QuantizeSnapSetting>(
  "tracker/setQuantizeSnapAndSave",
  async (payload, thunkApi) => {
    thunkApi.dispatch(actions.setQuantizeSnap(payload));
    await API.settings.set("trackerQuantizeSnap", payload);
  },
);

const actions = {
  ...reducerActions,
  initViewFromSaved,
  setViewAndSave,
  setSubpatternEditorModeAndSave,
  setMetronomeEnabledAndSave,
  setQuantizeSnapAndSave,
};

export default actions;
