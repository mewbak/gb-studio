import reducer, {
  actions,
  initialState,
} from "../../../../src/store/features/trackerDocument/trackerDocumentState";
import { createPattern, createSong } from "../../../../src/shared/lib/uge/song";

test("Should realign channel 0 to a pattern block when disabling split pattern", () => {
  const song = createSong();
  song.patterns = Array.from({ length: 8 }, () => createPattern());
  song.sequence = [
    {
      splitPattern: true,
      channels: [5, 10, 11, 12],
    },
  ];

  const newState = reducer(
    {
      ...initialState,
      song,
    },
    actions.setSequenceSplitPattern({
      sequenceIndex: 0,
      splitPattern: false,
    }),
  );

  expect(newState.song?.sequence[0]).toEqual({
    splitPattern: false,
    channels: [4, 5, 6, 7],
  });
});
