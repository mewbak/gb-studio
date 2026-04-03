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

const actions = {
  ...reducerActions,
  initViewFromSaved,
  setViewAndSave,
  setSubpatternEditorModeAndSave,
};

export default actions;
