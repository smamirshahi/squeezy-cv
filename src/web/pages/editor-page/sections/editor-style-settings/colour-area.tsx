import {
  KeyboardEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Box, Slider } from "@mui/material";
import { hexToHsv, hsvToHex, Hsv } from "@shared/style/color-convert";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

const AREA_HEIGHT_PX = 120;
const HUE_MAX = 360;
const KEY_STEP = 0.02;
const HUE_RAIL =
  "linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)";

interface Props {
  /** The colour now, as `#rrggbb` */
  color: string;
  /** What the picker is for, e.g. "Text" */
  label: string;
  onChange: (hex: string) => void;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** While dragging, the page behind is redrawn at most this often (it is the slow part) */
const LIVE_INTERVAL_MS = 120;

/** A colour picker: a square for saturation and brightness and a bar for the hue */
export function ColourArea({ color, label, onChange }: Props): JSX.Element {
  // The hue is kept here because grey and black have none, and dragging would lose it
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(color));
  const hsvRef = useRef<Hsv>(hsv);
  /** The last colour handed to the page; the same colour coming back is not news */
  const sent = useRef<string>(color);
  const isDragging = useRef<boolean>(false);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const area = useRef<HTMLDivElement | null>(null);

  // A colour that came from elsewhere (palette, typing) replaces ours; never while dragging,
  // because the page still shows an older colour then
  if (!isDragging.current && color !== sent.current) {
    sent.current = color;
    const next = hexToHsv(color);
    hsvRef.current =
      next.s === 0 || next.v === 0 ? { ...next, h: hsvRef.current.h } : next;
    setHsv(hsvRef.current);
  }

  function send(hex: string): void {
    sent.current = hex;
    onChange(hex);
  }

  /** Sends the newest colour that is waiting, now */
  function flush(): void {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current !== null) {
      const hex = pending.current;
      pending.current = null;
      send(hex);
    }
  }

  // Do not lose the last colour when the popover closes in the middle of a drag
  useEffect(() => flush, []);

  /** `isLive`: part of a drag, so the page is told at most every LIVE_INTERVAL_MS */
  function emit(next: Hsv, isLive: boolean): void {
    hsvRef.current = next;
    setHsv(next);
    const hex = hsvToHex(next);
    if (!isLive) {
      pending.current = hex;
      flush();
      return;
    }
    pending.current = hex;
    if (timer.current === null) {
      timer.current = setTimeout(() => {
        timer.current = null;
        flush();
      }, LIVE_INTERVAL_MS);
    }
  }

  function endDrag(): void {
    isDragging.current = false;
    flush();
  }

  function pick(event: PointerEvent<HTMLDivElement>): void {
    const box = area.current?.getBoundingClientRect();
    if (box === undefined || box.width === 0 || box.height === 0) {
      return;
    }
    emit(
      {
        h: hsvRef.current.h,
        s: clamp((event.clientX - box.left) / box.width),
        v: clamp(1 - (event.clientY - box.top) / box.height),
      },
      true
    );
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>): void {
    const moves: Record<string, Partial<Hsv>> = {
      ArrowLeft: { s: clamp(hsv.s - KEY_STEP) },
      ArrowRight: { s: clamp(hsv.s + KEY_STEP) },
      ArrowUp: { v: clamp(hsv.v + KEY_STEP) },
      ArrowDown: { v: clamp(hsv.v - KEY_STEP) },
    };
    const move = moves[event.key];
    if (move !== undefined) {
      event.preventDefault();
      emit({ ...hsv, ...move }, false);
    }
  }

  return (
    <Box>
      <Box
        ref={area}
        role="group"
        tabIndex={0}
        aria-label={`${label} shade: arrow keys change saturation and brightness`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          isDragging.current = true;
          pick(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            pick(event);
          }
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKey}
        sx={{
          position: "relative",
          height: AREA_HEIGHT_PX,
          borderRadius: 0.5,
          cursor: "crosshair",
          touchAction: "none",
          border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            width: 12,
            height: 12,
            ml: "-6px",
            mt: "-6px",
            borderRadius: "50%",
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,.5)",
            pointerEvents: "none",
          }}
        />
      </Box>
      <Slider
        aria-label={`${label} hue`}
        min={0}
        max={HUE_MAX}
        value={Math.round(hsv.h)}
        onChange={(_event, value) => {
          isDragging.current = true;
          emit({ ...hsvRef.current, h: value }, true);
        }}
        onChangeCommitted={endDrag}
        sx={{
          mt: 1,
          mb: 0,
          py: 0.75,
          "& .MuiSlider-rail": { opacity: 1, background: HUE_RAIL, height: 10 },
          "& .MuiSlider-track": { display: "none" },
          "& .MuiSlider-thumb": {
            width: 14,
            height: 14,
            bgcolor: "#fff",
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,.5)",
          },
        }}
      />
    </Box>
  );
}
