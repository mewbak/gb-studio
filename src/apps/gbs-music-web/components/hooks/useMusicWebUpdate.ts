import { useCallback, useEffect, useRef, useState } from "react";

const UPDATE_PENDING_STORAGE_KEY = "gbsMusicWeb:updatePending";

const isLocalhost = () =>
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.hostname === "[::1]";

const supportsServiceWorker = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  !isLocalhost();

const getStoredUpdatePending = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(UPDATE_PENDING_STORAGE_KEY) === "true";
};

const setStoredUpdatePending = (value: boolean) => {
  if (typeof window === "undefined") {
    return;
  }

  if (value) {
    window.localStorage.setItem(UPDATE_PENDING_STORAGE_KEY, "true");
  } else {
    window.localStorage.removeItem(UPDATE_PENDING_STORAGE_KEY);
  }
};

export const useMusicWebUpdate = () => {
  const [waitingRegistration, setWaitingRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const shouldReloadOnControllerChangeRef = useRef(false);
  const shouldAutoApplyOnLoadRef = useRef(getStoredUpdatePending());

  useEffect(() => {
    if (!supportsServiceWorker()) {
      return;
    }

    let isMounted = true;
    const shouldAutoApplyOnLoad = shouldAutoApplyOnLoadRef.current;

    const activateWaitingWorker = async (
      registration: ServiceWorkerRegistration,
    ) => {
      shouldReloadOnControllerChangeRef.current = true;
      setStoredUpdatePending(false);
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });

      window.setTimeout(() => {
        if (shouldReloadOnControllerChangeRef.current) {
          window.location.reload();
        }
      }, 1500);
    };

    const setWaitingWorker = (registration: ServiceWorkerRegistration) => {
      if (!isMounted) {
        return;
      }

      if (registration.waiting) {
        setStoredUpdatePending(true);
        setWaitingRegistration(registration);
        return;
      }

      setStoredUpdatePending(false);
      setWaitingRegistration(null);
    };

    const trackInstallingWorker = (registration: ServiceWorkerRegistration) => {
      const installingWorker = registration.installing;
      if (!installingWorker) {
        return;
      }

      installingWorker.addEventListener("statechange", () => {
        if (
          installingWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          if (shouldAutoApplyOnLoad && registration.waiting) {
            void activateWaitingWorker(registration);
            return;
          }

          setWaitingWorker(registration);
        }
      });
    };

    const attachRegistrationListeners = (
      registration: ServiceWorkerRegistration,
    ) => {
      if (registrationRef.current === registration) {
        return;
      }

      registrationRef.current = registration;
      registration.addEventListener("updatefound", () => {
        trackInstallingWorker(registration);
      });
      trackInstallingWorker(registration);
    };

    const updateRegistration = async () => {
      const registration = await navigator.serviceWorker.register(
        "./service-worker.js",
        { updateViaCache: "none" },
      );

      attachRegistrationListeners(registration);
      if (shouldAutoApplyOnLoad && registration.waiting) {
        void activateWaitingWorker(registration);
        return registration;
      }

      setWaitingWorker(registration);
      return registration;
    };

    const checkForUpdate = async () => {
      const registration = await updateRegistration();
      await registration.update();
      setWaitingWorker(registration);
    };

    const onControllerChange = () => {
      setStoredUpdatePending(false);
      if (!shouldReloadOnControllerChangeRef.current) {
        return;
      }
      window.location.reload();
    };

    const onPageShow = () => {
      void checkForUpdate().catch((error) => {
        console.error(error);
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdate().catch((error) => {
          console.error(error);
        });
      }
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);

    void checkForUpdate().catch((error) => {
      console.error(error);
    });

    return () => {
      isMounted = false;
      registrationRef.current = null;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const reloadApp = useCallback(async () => {
    if (!supportsServiceWorker()) {
      window.location.reload();
      return;
    }

    shouldReloadOnControllerChangeRef.current = true;
    setStoredUpdatePending(false);
    const registration =
      waitingRegistration ?? (await navigator.serviceWorker.getRegistration());

    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      window.setTimeout(() => {
        if (shouldReloadOnControllerChangeRef.current) {
          window.location.reload();
        }
      }, 1500);
      return;
    }

    window.location.reload();
  }, [waitingRegistration]);

  return {
    updateAvailable: waitingRegistration !== null,
    reloadApp,
  };
};
