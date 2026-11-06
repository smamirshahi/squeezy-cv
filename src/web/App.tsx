import { AppThemeProvider } from "@custom-styles/theme";
import { Workspace } from "@pages/workspace/workspace";
import { ApplicationsPage } from "@pages/applications-page/applications-page";
import { ApplicationView } from "@pages/applications-page/application-view";
import { PrintView } from "@pages/print-page/print-view";

/**
 * Which page to show, from the address: `?print=<variantId>` is the print-only page,
 * `?applications` the list of applications, `?application=<id>` one of them, anything
 * else the editor.
 */
export function App(): JSX.Element {
  const params = new URLSearchParams(window.location.search);
  const printVariantId = params.get("print");
  const applicationId = params.get("application");
  if (printVariantId) {
    return <PrintView variantId={printVariantId} />;
  }
  // The print page has no theme: the PDF is always the light default
  return (
    <AppThemeProvider>
      {params.has("applications") ? (
        <ApplicationsPage />
      ) : applicationId ? (
        <ApplicationView applicationId={applicationId} />
      ) : (
        <Workspace />
      )}
    </AppThemeProvider>
  );
}
