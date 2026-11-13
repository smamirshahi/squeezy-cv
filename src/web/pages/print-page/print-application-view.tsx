import { useEffect, useMemo, useRef, useState } from "react";
import { A4_DIMENSION_MM, PAPER_MARGIN_MM } from "@custom-styles/custom-styles";
import { Application } from "@custom-types/application-types";
import { PreviewPage } from "@pages/preview-page/preview-page";
import {
  applicationPdfApiUrl,
  apiFetch,
  createApiClient,
} from "@store/persistence/api-client";
import { loadCvFileIntoStore } from "@store/persistence/persistence-actions";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { activeVariantSelector } from "@store/jobs/jobs-slice";
import { activateVariant } from "@hooks/use-sync-active-job";

type LoadState =
  | { status: "loading" }
  | { status: "cv"; application: Application }
  | { status: "error"; message: string };

const MESSAGE_NO_CV = "This application has no CV attached.";

/**
 * Browser mode's version of the stored PDF of an application (`/print-application/<id>`): the
 * frozen CV drawn exactly as it was sent, which the browser prints to PDF ("Save as PDF"). An
 * application with an uploaded PDF goes straight to that file. Opened inside a frame it has no
 * buttons, so it can be the preview.
 */
export function PrintApplicationView({
  id,
}: {
  id: string;
}): JSX.Element | null {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const contentRef = useRef<HTMLDivElement | null>(null);
  const api = useMemo(() => createApiClient(), []);
  const isFramed = window.self !== window.top;

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const application = await api.loadApplication(id);
        if (!application.submitted) {
          const response = await apiFetch(applicationPdfApiUrl(id));
          if (!response.ok) {
            throw new Error(MESSAGE_NO_CV);
          }
          const url = URL.createObjectURL(await response.blob());
          if (!isCancelled) {
            window.location.replace(url);
          }
          return;
        }
        const file = await api.loadVault();
        loadCvFileIntoStore(dispatch, file, [application.submitted.variant]);
        activateVariant(dispatch, application.submitted.variant);
        await document.fonts?.ready;
        if (!isCancelled) {
          document.title = `${application.company} - ${application.role}`;
          setState({ status: "cv", application });
        }
      } catch (error) {
        if (!isCancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [api, dispatch, id]);

  if (state.status === "error") {
    return <div data-cv-error="">{state.message}</div>;
  }
  if (state.status === "loading") {
    return null;
  }

  const marginMm =
    variant.tuning?.marginMm ?? PAPER_MARGIN_MM[variant.style.paperMargin];
  return (
    <div data-cv-ready="true">
      <style>{`@page { size: ${A4_DIMENSION_MM.width}mm ${A4_DIMENSION_MM.height}mm; margin: ${marginMm}mm; }
html, body { margin: 0; background: #fff; }
@media print { .print-bar { display: none !important; } }`}</style>
      {!isFramed && (
        <div
          className="print-bar"
          style={{ padding: 8, textAlign: "right", fontFamily: "sans-serif" }}
        >
          <button type="button" onClick={() => window.print()}>
            Save as PDF
          </button>
        </div>
      )}
      <PreviewPage
        contentRef={contentRef}
        isPrintView
        frozen={state.application.submitted?.document}
      />
    </div>
  );
}
