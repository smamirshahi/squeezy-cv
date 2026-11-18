import { useEffect, useRef } from "react";
import { notify } from "@components/notifications/notify";
import {
  folderChangedOutside,
  isBrowserMode,
  storageLocation,
} from "@store/persistence/browser/storage-mode";
import { useHasUnsavedChanges } from "@hooks/use-persistence";

/**
 * Browser mode with a data folder: when the person comes back to the tab, checks whether the
 * files were changed by something else (Drive or Dropbox bringing in a change from another
 * device, or server mode). Nothing is merged. With nothing unsaved the notice offers a reload;
 * with unsaved changes it says both sides changed, and that saving replaces the folder's
 * version (the previous one stays next to it as `.bak`). The same change is reported once.
 */
export function useFolderWatch(): void {
  const hasUnsaved = useHasUnsavedChanges();
  const unsaved = useRef<boolean>(hasUnsaved);
  const reported = useRef<string>("");
  unsaved.current = hasUnsaved;

  useEffect(() => {
    if (!isBrowserMode() || storageLocation().kind !== "folder") {
      return undefined;
    }
    async function check(): Promise<void> {
      let changed: string[];
      try {
        changed = await folderChangedOutside();
      } catch {
        return;
      }
      const signature = changed.join("|");
      if (changed.length === 0 || signature === reported.current) {
        return;
      }
      reported.current = signature;
      const reload = {
        label: "Reload",
        onClick: () => window.location.reload(),
      };
      if (unsaved.current) {
        notify({
          kind: "warning",
          text: "The data folder changed outside the app and you also have unsaved changes. Saving replaces the folder's version (the previous one is kept as .bak). Reload to drop your changes and take the folder's.",
          action: reload,
        });
      } else {
        notify({
          kind: "info",
          text: "The files in your data folder changed outside the app. Reload to see them.",
          action: reload,
        });
      }
    }
    const onFocus = (): void => void check();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
}
