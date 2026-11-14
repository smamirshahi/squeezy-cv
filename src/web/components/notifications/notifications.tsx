import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, IconButton, keyframes } from "@components/ui";
import {
  CheckCircleOutlined as CheckCircleOutlinedIcon,
  CloseOutlined as CloseOutlinedIcon,
  ErrorOutlineOutlined as ErrorOutlineOutlinedIcon,
  InfoOutlined as InfoOutlinedIcon,
  UndoOutlined as UndoOutlinedIcon,
  WarningAmberOutlined as WarningAmberOutlinedIcon,
} from "@components/ui/icons";
import { AiIcon } from "@components/ai-button";
import {
  NOTIFICATION_DURATION_MS,
  NotificationItem,
  NotificationKind,
  dismissNewestNotification,
  dismissNotification,
  useNotifications,
} from "@components/notifications/notify";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { cssVar } from "@custom-styles/theme";
import { navigate } from "@hooks/navigation";

const KIND_STYLE: Record<
  NotificationKind,
  { colour: string; Icon: typeof InfoOutlinedIcon }
> = {
  success: { colour: cssVar("ok"), Icon: CheckCircleOutlinedIcon },
  info: { colour: WORKSPACE_COLORS.accentText, Icon: InfoOutlinedIcon },
  warning: { colour: cssVar("wr"), Icon: WarningAmberOutlinedIcon },
  error: { colour: cssVar("er"), Icon: ErrorOutlineOutlinedIcon },
  undo: { colour: WORKSPACE_COLORS.muted, Icon: UndoOutlinedIcon },
};

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;
const shrink = keyframes`
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
`;

/** Where the toasts go: the canvas when there is one, else the page area, never the rail */
function findAnchor(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>("[data-toast-area='canvas']") ??
    document.querySelector<HTMLElement>("[data-toast-area='page']")
  );
}

interface Place {
  left: number;
  width: number;
  bottom: number;
}

/**
 * Bottom centre of the page area, 24 px up. The area is measured, so it follows a resized or
 * opened side panel; on a phone it is the area above the tab bar, so nothing covers the toasts.
 */
function usePlace(isActive: boolean): Place {
  const [place, setPlace] = useState<Place>({
    left: 0,
    width: window.innerWidth,
    bottom: 24,
  });
  useEffect(() => {
    if (!isActive) {
      return;
    }
    let observed: HTMLElement | null = null;
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => update());
    function update(): void {
      const anchor = findAnchor();
      if (anchor !== observed) {
        if (observed) {
          observer?.unobserve(observed);
        }
        observed = anchor;
        if (anchor) {
          observer?.observe(anchor);
        }
      }
      const rect = anchor?.getBoundingClientRect();
      setPlace({
        left: rect?.left ?? 0,
        width: rect?.width ?? window.innerWidth,
        bottom: window.innerHeight - (rect?.bottom ?? window.innerHeight) + 24,
      });
    }
    update();
    window.addEventListener("resize", update);
    // The area changes with the page, the open panels and the zoom
    const interval = window.setInterval(update, 500);
    return () => {
      window.removeEventListener("resize", update);
      window.clearInterval(interval);
      observer?.disconnect();
    };
  }, [isActive]);
  return place;
}

/** Counts down 6 s; hover or focus pauses it. Errors never count down. */
function useAutoDismiss(item: NotificationItem): {
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  isTimed: boolean;
} {
  const isTimed = item.kind !== "error";
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const remaining = useRef<number>(NOTIFICATION_DURATION_MS);
  const startedAt = useRef<number>(Date.now());
  const { id } = item;
  useEffect(() => {
    if (!isTimed || isPaused) {
      return;
    }
    startedAt.current = Date.now();
    const timer = window.setTimeout(
      () => dismissNotification(id),
      remaining.current
    );
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(
        0,
        remaining.current - (Date.now() - startedAt.current)
      );
    };
  }, [id, isTimed, isPaused]);
  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);
  return { isPaused, pause, resume, isTimed };
}

function Toast({ item }: { item: NotificationItem }): JSX.Element {
  const { isPaused, pause, resume, isTimed } = useAutoDismiss(item);
  const { colour, Icon } = KIND_STYLE[item.kind];
  const iconColour = item.isAi ? WORKSPACE_COLORS.ai : colour;
  const { action } = item;
  const label = item.kind === "error" ? "Error" : "Notification";
  return (
    <Box
      role={item.kind === "error" ? "alert" : "status"}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      sx={{
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "flex-start",
        gap: 1.25,
        width: "100%",
        maxWidth: 440,
        py: 1.25,
        pl: 1.5,
        pr: 0.75,
        bgcolor: item.isAi ? WORKSPACE_COLORS.aiSoft : WORKSPACE_COLORS.panel,
        color: WORKSPACE_COLORS.text,
        border: `1px solid ${
          item.isAi ? WORKSPACE_COLORS.aiBorder : WORKSPACE_COLORS.borderStrong
        }`,
        borderRadius: "8px",
        boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
        fontSize: 14,
        pointerEvents: "auto",
        animation: `${slideIn} 160ms ease-out`,
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    >
      <Box sx={{ color: iconColour, display: "flex", pt: "2px" }}>
        {item.isAi ? (
          <AiIcon fontSize="medium" />
        ) : (
          <Icon aria-hidden="true" fontSize="small" />
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, py: 0.25, lineHeight: 1.4 }}>
        <Box component="span" sx={{ position: "absolute", left: -9999 }}>
          {label}:{" "}
        </Box>
        {item.text}
      </Box>
      {action && (
        <Button
          size="small"
          href={action.href}
          onClick={(event) => {
            if (action.href) {
              event.preventDefault();
              navigate(action.href);
            }
            action.onClick?.();
            dismissNotification(item.id);
          }}
          sx={{
            flex: "none",
            color: WORKSPACE_COLORS.accentText,
            fontWeight: 700,
            textDecoration: "underline",
            minWidth: 0,
          }}
        >
          {action.label}
        </Button>
      )}
      <IconButton
        size="small"
        aria-label="Close notification"
        onClick={() => dismissNotification(item.id)}
        sx={{ flex: "none", color: WORKSPACE_COLORS.muted }}
      >
        <CloseOutlinedIcon fontSize="small" />
      </IconButton>
      {isTimed && (
        <Box
          aria-hidden="true"
          data-testid="toast-time-left"
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 3,
            bgcolor: iconColour,
            transformOrigin: "left",
            animation: `${shrink} ${NOTIFICATION_DURATION_MS}ms linear forwards`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        />
      )}
    </Box>
  );
}

/**
 * The one place notifications are shown (mount it once). Newest is at the bottom, at most 3,
 * Esc closes the newest.
 */
export function Notifications(): JSX.Element | null {
  const items = useNotifications();
  const place = usePlace(items.length > 0);
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape" && !event.defaultPrevented) {
        dismissNewestNotification();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (items.length === 0) {
    return null;
  }
  return (
    <Box
      sx={{
        position: "fixed",
        left: place.left,
        width: place.width,
        bottom: place.bottom,
        zIndex: (theme) => theme.zIndex.snackbar,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        px: 2,
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      {items.map((item) => (
        <Toast key={item.id} item={item} />
      ))}
    </Box>
  );
}
