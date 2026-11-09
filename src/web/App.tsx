import { useEffect } from "react";
import { AppThemeProvider } from "@custom-styles/theme";
import { Workspace } from "@pages/workspace/workspace";
import { PrintView } from "@pages/print-page/print-view";
import { NotFound } from "@pages/workspace/not-found";
import { navigate, useRoute } from "@hooks/navigation";
import { isShellRoute, legacyRedirect } from "@shared/routing/routes";

/**
 * Which page to show, from the address (see `shared/routing/routes.ts`): the workspace
 * tools (`/vault`, `/jobs/<id>`, `/templates`, `/tailor`, `/chat/<id>`, `/ai`), the
 * applications list and one application, and the print-only page `/print/<id>`. The old
 * query addresses (`/?applications`, `/?application=<id>`, `/?print=<id>`) and `/` are
 * redirected to the new ones.
 */
export function App(): JSX.Element {
  const route = useRoute();
  const redirect = legacyRedirect(
    window.location.pathname,
    window.location.search
  );
  useEffect(() => {
    if (redirect) {
      navigate(redirect, { replace: true });
    }
  }, [redirect]);

  // The first render after a redirect is skipped: the address is about to change
  if (redirect) {
    return <></>;
  }
  if (route.kind === "print") {
    return <PrintView jobId={route.jobId} />;
  }
  // The print page has no theme: the PDF is always the light default
  return (
    <AppThemeProvider>
      {isShellRoute(route) ? <Workspace route={route} /> : <NotFoundPage />}
    </AppThemeProvider>
  );
}

/** An address that is not one of the app's */
function NotFoundPage(): JSX.Element {
  useEffect(() => {
    document.title = "Not found · CV Builder";
  }, []);
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <NotFound
        what="page"
        backTo={{ href: "/jobs", label: "Back to the editor" }}
      />
    </div>
  );
}
