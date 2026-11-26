import { useEffect, useMemo, useRef, useState } from "react";
import { A4_DIMENSION_MM, PAPER_MARGIN_MM } from "@custom-styles/custom-styles";
import { PreviewPage } from "@pages/preview-page/preview-page";
import { createApiClient } from "@store/persistence/api-client";
import { loadCvFileIntoStore } from "@store/persistence/persistence-actions";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { activeVariantSelector } from "@store/jobs/jobs-slice";
import { activateVariant } from "@hooks/use-sync-active-job";

type LoadState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

interface Props {
  /** The id of the saved job to show (a job id is also the id of its variant) */
  jobId: string;
}

/**
 * The print-only route (`/print/<jobId>`): just the CV, loaded from the server, with
 * no editor around it. The PDF renderer opens this page and waits for `data-cv-ready`
 * (or `data-cv-error`). The page's own margin is set here so every printed page has it.
 */
export function PrintView({ jobId }: Props): JSX.Element | null {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const contentRef = useRef<HTMLDivElement | null>(null);
  const api = useMemo(() => createApiClient(), []);

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const [file, saved] = await Promise.all([
          api.loadVault(),
          api.loadResolvedJob(jobId),
        ]);
        loadCvFileIntoStore(dispatch, file, [saved]);
        activateVariant(dispatch, saved);
        // Wait for the fonts, so the text is laid out the way it will be printed
        await document.fonts?.ready;
        if (!isCancelled) {
          // The name the browser suggests for "Save as PDF"
          const name = new URLSearchParams(window.location.search).get("name");
          if (name) {
            document.title = name;
          }
          setState({ status: "ready" });
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
  }, [api, dispatch, jobId]);

  if (state.status === "error") {
    return <div data-cv-error="">{state.message}</div>;
  }
  if (state.status === "loading") {
    return null;
  }

  const isFramed = window.self !== window.top;
  const marginMm =
    variant.tuning?.marginMm ?? PAPER_MARGIN_MM[variant.style.paperMargin];
  return (
    <div data-cv-ready="true" className="print-sheet">
      <style>{`@page { size: ${A4_DIMENSION_MM.width}mm ${A4_DIMENSION_MM.height}mm; margin: ${marginMm}mm; }
html, body { margin: 0; background: #fff; }
${isFramed ? `@media screen { .print-sheet { padding: ${marginMm}mm; box-sizing: border-box; } }` : ""}`}</style>
      <PreviewPage contentRef={contentRef} isPrintView />
    </div>
  );
}
