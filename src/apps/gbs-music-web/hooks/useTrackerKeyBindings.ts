import { useEffect, useState } from "react";
import API from "renderer/lib/api";

export const useTrackerKeyBindings = () => {
  const [trackerKeyBindings, setTrackerKeyBindings] = useState(0);

  useEffect(() => {
    let isActive = true;

    const syncTrackerKeyBindings = () => {
      void API.settings.app.getTrackerKeyBindings().then((value) => {
        if (isActive) {
          setTrackerKeyBindings(value);
        }
      });
    };

    syncTrackerKeyBindings();

    const unsubscribe = API.events.settings.trackerKeyBindingsChanged.subscribe(
      () => {
        syncTrackerKeyBindings();
      },
    );

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return trackerKeyBindings;
};
