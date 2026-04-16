import { useEffect } from "react";
import { useAppSelector } from "store/hooks";
import { musicMidiController } from "./musicMidiController";

export const useMusicMidiState = () => {
  return useAppSelector((state) => state.tracker.midiInput);
};

export const useMusicMidiNoteSubscription = (
  listener: (note: number) => void,
) => {
  useEffect(() => {
    void musicMidiController.initialize();
    return musicMidiController.subscribeToNotes(listener);
  }, [listener]);
};
