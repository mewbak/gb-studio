import { useCallback, useEffect, useRef, useState } from "react";

const isLocalhost = () =>
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.hostname === "[::1]";

const supportsServiceWorker = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  !isLocalhost();

export const useMusicWebUpdate = () => {
  const [waitingRegistration, setWaitingRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const shouldReloadOnControllerChangeRef = useRef(false);

  useEffect(() => {
    if (!supportsServiceWorker()) {
      return;
    }

    let isMounted = true;

    const setWaitingWorker = (registration: ServiceWorkerRegistration) => {
      if (!isMounted) {
        return;
      }
      setWaitingRegistration(registration.waiting ? registration : null);
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
      setWaitingWorker(registration);
      return registration;
    };

    const checkForUpdate = async () => {
      const registration = await updateRegistration();
      await registration.update();
      setWaitingWorker(registration);
    };

    const onControllerChange = () => {
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
