import { useEffect, useMemo, useRef, useState } from "react";
import { A4_DIMENSION_MM, PAPER_MARGIN_MM } from "@custom-styles/custom-styles";
import { PreviewPage } from "@pages/preview-page/preview-page";
import { createApiClient } from "@store/persistence/api-client";
import { loadCvFileIntoStore } from "@store/persistence/persistence-actions";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { activeVariantSelector } from "@store/variants/variants-slice";
import { activateVariant } from "@hooks/use-sync-active-variant";

type LoadState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

interface Props {
  /** The id of the saved job to show (a job id is also the id of its variant) */
  variantId: string;
}

/**
 * The print-only route (`/?print=<variantId>`): just the CV, loaded from the server, with
 * no editor around it. The PDF renderer opens this page and waits for `data-cv-ready`
 * (or `data-cv-error`). The page's own margin is set here so every printed page has it.
 */
export function PrintView({ variantId }: Props): JSX.Element | null {
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
          api.loadResolvedJob(variantId),
        ]);
        loadCvFileIntoStore(dispatch, file, [saved]);
        activateVariant(dispatch, saved);
        // Wait for the fonts, so the text is laid out the way it will be printed
        await document.fonts?.ready;
        if (!isCancelled) {
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
  }, [api, dispatch, variantId]);

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
html, body { margin: 0; background: #fff; }`}</style>
      <PreviewPage contentRef={contentRef} isPrintView />
    </div>
  );
}
