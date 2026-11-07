import { useEffect, useRef } from "react";
import { Route } from "@shared/routing/routes";
import { navigate } from "@hooks/navigation";
import { activateVariant } from "@hooks/use-sync-active-job";
import { setSelectedBlock, setTool } from "@store/app/app-slice";
import { variantsSelector } from "@store/jobs/jobs-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/**
 * Keeps the store in step with the address. The address is the source of truth: the rail,
 * the tree and the job switcher change it, and this puts the tool, the vault section and
 * the active job in the store to match. The one thing that goes the other way is the
 * active job, because many places switch it (switcher, new job, tailoring): when it
 * changes while the address did not, the address follows. Whichever of the two changed
 * since the last run wins, so the two never fight.
 */
export function useRouteSync(route: Route): void {
  const dispatch = useAppDispatch();
  const variants = useAppSelector(variantsSelector);
  const activeJobId = useAppSelector((s) => s.jobs.activeJobId);
  const isLoading = useAppSelector((s) => s.persistence.status === "loading");
  const last = useRef<{ route?: string; active?: string } | null>(null);

  // Tool and vault section
  const toolKind = route.kind;
  useEffect(() => {
    if (
      toolKind === "vault" ||
      toolKind === "jobs" ||
      toolKind === "templates" ||
      toolKind === "tailor" ||
      toolKind === "chat" ||
      toolKind === "ai"
    ) {
      dispatch(setTool(toolKind));
      // What was selected on the page belongs to the page the user left
      dispatch(setSelectedBlock(null));
    }
  }, [toolKind, dispatch]);
  // The active job
  const isJobRoute = route.kind === "jobs" || route.kind === "chat";
  const routeJobId = isJobRoute ? route.jobId : undefined;
  const jobsView = route.kind === "jobs" ? route.view : "page";
  useEffect(() => {
    if (!isJobRoute || isLoading) {
      last.current = null;
      return;
    }
    const before = last.current;
    last.current = { route: routeJobId, active: activeJobId };
    const toRoute = (jobId: string): Route =>
      route.kind === "chat"
        ? { kind: "chat", jobId }
        : { kind: "jobs", jobId, view: jobsView };
    if (routeJobId === undefined) {
      navigate(toRoute(activeJobId), { replace: true });
      return;
    }
    if (routeJobId === activeJobId) {
      return;
    }
    const isRouteNew = before === null || before.route !== routeJobId;
    const isActiveNew = before !== null && before.active !== activeJobId;
    if (isRouteNew || !isActiveNew) {
      // The address leads: open that job (an unknown id is shown as not found)
      const variant = variants.find((v) => v.id === routeJobId);
      if (variant) {
        activateVariant(dispatch, variant);
      }
    } else {
      navigate(toRoute(activeJobId));
    }
    // `route` only matters through its kind and job id
  }, [
    isJobRoute,
    routeJobId,
    jobsView,
    route.kind,
    activeJobId,
    variants,
    isLoading,
    dispatch,
  ]);
}
