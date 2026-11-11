import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { resizePhoto } from "@hooks/resize-photo";
import {
  FRAME_HEIGHT,
  FRAME_WIDTH,
  MAX_ZOOM,
  PhotoCrop,
  clampOffset,
  cropOf,
  cropToDataUrl,
  offsetOf,
  zoomAroundCentre,
} from "@pages/editor-page/sections/photo-crop";

interface PhotoDialogProps {
  isOpen: boolean;

  /** The photo now in the vault (cropped), its original and how it was cropped, if any */
  photo: string | undefined;
  photoSource: string | undefined;
  photoCrop: PhotoCrop | undefined;
  onClose: () => void;

  /** What to save; all empty when the photo was removed */
  onApply: (result: {
    photo: string;
    photoSource: string;
    photoCrop: PhotoCrop | undefined;
  }) => void;
}

/** Choose, move and zoom the photo inside a fixed 4:5 frame, then Apply */
export function PhotoDialog({
  isOpen,
  photo,
  photoSource,
  photoCrop,
  onClose,
  onApply,
}: PhotoDialogProps): JSX.Element {
  const [source, setSource] = useState("");
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const imageRef = useRef<HTMLImageElement>(null);
  // The saved crop to show once the picture has loaded (only for the picture it belongs to)
  const restore = useRef<PhotoCrop | undefined>(undefined);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null
  );

  // Every time the dialog opens it starts from the current photo
  useEffect(() => {
    if (isOpen) {
      setNatural({ width: 0, height: 0 });
      // An older photo has no original: the cropped one is all there is
      setSource(photoSource || photo || "");
      restore.current = photoSource ? photoCrop : undefined;
      setError("");
    }
  }, [isOpen, photo, photoSource, photoCrop]);

  function loaded(width: number, height: number): void {
    setNatural({ width, height });
    const saved = restore.current;
    restore.current = undefined;
    if (saved) {
      setZoom(saved.zoom);
      setOffset(offsetOf(saved, { width, height }));
      return;
    }
    setZoom(1);
    setOffset(clampOffset({ x: 0, y: 0 }, width, height, 1));
  }

  async function choose(file: File | undefined): Promise<void> {
    if (!file) {
      return;
    }
    try {
      const resized = await resizePhoto(file);
      restore.current = undefined;
      setNatural({ width: 0, height: 0 });
      setSource(resized);
      setError("");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Not an image.");
    }
  }

  function changeZoom(value: number): void {
    setOffset(zoomAroundCentre(offset, natural, zoom, value));
    setZoom(value);
  }

  function move(dx: number, dy: number): void {
    setOffset(
      clampOffset(
        { x: offset.x + dx, y: offset.y + dy },
        natural.width,
        natural.height,
        zoom
      )
    );
  }

  const hasImage = source !== "" && natural.width > 0;

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        Profile picture
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
      >
        <Button
          component="label"
          variant="outlined"
          startIcon={<ImageOutlinedIcon />}
        >
          Change image
          <input
            hidden
            type="file"
            accept="image/*"
            aria-label="Photo file"
            onChange={(event) => {
              void choose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </Button>
        {source !== "" && (
          <Button
            size="small"
            onClick={() => {
              restore.current = undefined;
              setSource("");
              setNatural({ width: 0, height: 0 });
            }}
            sx={{ alignSelf: "center" }}
          >
            Remove image
          </Button>
        )}
        {error && (
          <Typography variant="body2" color="error" role="alert">
            {error}
          </Typography>
        )}
        <Box
          tabIndex={0}
          role="group"
          aria-label="Photo frame. Drag, or use the arrow keys, to move the picture."
          onPointerDown={(event) => {
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              ox: offset.x,
              oy: offset.y,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            if (!start) {
              return;
            }
            setOffset(
              clampOffset(
                {
                  x: start.ox + event.clientX - start.x,
                  y: start.oy + event.clientY - start.y,
                },
                natural.width,
                natural.height,
                zoom
              )
            );
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onKeyDown={(event) => {
            const step = 10;
            const keys: Record<string, [number, number]> = {
              ArrowLeft: [step, 0],
              ArrowRight: [-step, 0],
              ArrowUp: [0, step],
              ArrowDown: [0, -step],
            };
            const delta = keys[event.key];
            if (delta) {
              event.preventDefault();
              move(delta[0], delta[1]);
            }
          }}
          sx={{
            width: FRAME_WIDTH,
            height: FRAME_HEIGHT,
            alignSelf: "center",
            position: "relative",
            overflow: "hidden",
            borderRadius: "4px",
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
            cursor: hasImage ? "grab" : "default",
            touchAction: "none",
            userSelect: "none",
          }}
        >
          {source !== "" && (
            <Box
              component="img"
              src={source}
              ref={imageRef}
              alt="Photo being adjusted"
              draggable={false}
              onLoad={(event) => {
                const image = event.currentTarget;
                // The natural size is only read when a new picture arrives
                if (natural.width === 0) {
                  loaded(image.naturalWidth, image.naturalHeight);
                }
              }}
              sx={{
                position: "absolute",
                left: offset.x,
                top: offset.y,
                width: hasImage
                  ? natural.width *
                    Math.max(
                      FRAME_WIDTH / natural.width,
                      FRAME_HEIGHT / natural.height
                    ) *
                    zoom
                  : "auto",
                maxWidth: "none",
                pointerEvents: "none",
              }}
            />
          )}
        </Box>
        <Box sx={{ px: 1 }}>
          <Slider
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!hasImage}
            aria-label="Zoom"
            onChange={(_event, value) =>
              changeZoom(Array.isArray(value) ? value[0] : value)
            }
          />
          <Typography variant="caption" color="text.secondary">
            Drag the picture to move it, use the slider to zoom.
          </Typography>
        </Box>
        <Button
          variant="contained"
          disabled={source !== "" && !hasImage}
          onClick={() =>
            onApply(
              hasImage
                ? {
                    photo: cropToDataUrl(
                      imageRef.current,
                      offset,
                      natural,
                      zoom
                    ),
                    photoSource: source,
                    photoCrop: cropOf(offset, natural, zoom),
                  }
                : { photo: "", photoSource: "", photoCrop: undefined }
            )
          }
        >
          Apply
        </Button>
      </DialogContent>
    </Dialog>
  );
}
