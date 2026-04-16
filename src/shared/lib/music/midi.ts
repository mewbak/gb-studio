export interface MusicMidiInputDevice {
  id: string;
  name: string;
}

export interface MusicMidiState {
  supported: boolean;
  enabled: boolean;
  recordingEnabled: boolean;
  inputs: MusicMidiInputDevice[];
  selectedInputId: string | null;
}

export const defaultMusicMidiState: MusicMidiState = {
  supported: false,
  enabled: false,
  recordingEnabled: true,
  inputs: [],
  selectedInputId: null,
};
