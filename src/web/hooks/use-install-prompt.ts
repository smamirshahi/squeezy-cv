import { useCallback, useEffect, useState } from "react";

/** The browser's install offer (Chrome, Edge, Android); Safari does not send it */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallState {
  /** The browser offers to install the app: `install()` asks */
  canInstall: boolean;

  /** Running as an installed app already */
  isInstalled: boolean;

  /** iPhone or iPad: there is no install button; the user adds the page to the Home Screen */
  isIos: boolean;
  install: () => Promise<void>;
}

/** True when the page runs as an installed app (display-mode standalone, or iOS' own flag) */
function detectInstalled(): boolean {
  const isIosStandalone = (navigator as { standalone?: boolean }).standalone;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    isIosStandalone === true
  );
}

function detectIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Install the app (a PWA): the browser's offer, whether it already is installed, and the iOS case */
export function useInstallPrompt(): InstallState {
  const [offer, setOffer] = useState<InstallEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(detectInstalled);

  useEffect(() => {
    function onOffer(event: Event): void {
      event.preventDefault();
      setOffer(event as InstallEvent);
    }
    function onInstalled(): void {
      setOffer(null);
      setIsInstalled(true);
    }
    window.addEventListener("beforeinstallprompt", onOffer);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onOffer);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!offer) {
      return;
    }
    await offer.prompt();
    const choice = await offer.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    setOffer(null);
  }, [offer]);

  return {
    canInstall: offer !== null,
    isInstalled,
    isIos: detectIos(),
    install,
  };
}
