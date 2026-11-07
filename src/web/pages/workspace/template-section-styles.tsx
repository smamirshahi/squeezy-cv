import { useMemo, useState } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Job, CURRENT_JOB_VERSION } from "@custom-types/job-types";
import { SECTION_STYLE_RANGES } from "@custom-types/variant-types";
import { A4_DIMENSION_MM, PAPER_MARGIN_MM } from "@custom-styles/custom-styles";
import { RenderedColumns } from "@pages/preview-page/rendered-columns";
import { TemplateScopeNote } from "@pages/workspace/template-scope";
import { ZoomFrame } from "@pages/workspace/canvas-zoom";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { render } from "@shared/variant/render";
import { resolveVariant } from "@shared/variant/template-job";
import { isValidHex } from "@shared/style/typography-utils";
import { appSelector } from "@store/app/app-slice";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import {
  activeJobSelector,
  activeTemplateSelector,
  setSectionStyle,
} from "@store/jobs/jobs-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { sectionsSelector, vaultSelector } from "@store/vault/vault-slice";

/** Scale of the sample page next to the controls */
const SAMPLE_ZOOM = 0.55;
/** The sample is cut after this many pages */
const SAMPLE_PAGES = 2;

/** A job that shows everything: the sample ignores what the active job hides */
function sampleJob(templateId: string): Job {
  return {
    id: "sample",
    version: CURRENT_JOB_VERSION,
    name: "Sample",
    templateId,
    createdAt: "2000-01-01",
    tone: "neutral",
    selection: {},
  };
}

/**
 * Style per section of the active job's template, with a sample CV built from the vault
 * (everything shown, cut after two pages) so the look can be judged.
 */
export function TemplateSectionStyles(): JSX.Element {
  const dispatch = useAppDispatch();
  const template = useAppSelector(activeTemplateSelector);
  const activeJob = useAppSelector(activeJobSelector);
  const sections = useAppSelector(sectionsSelector);
  const style = useAppSelector(styleSelector);
  const { columnWidth, structure } = useAppSelector(appSelector);
  const vault = useAppSelector(vaultSelector);
  const [pickedId, setPickedId] = useState<string>("");
  const sectionId = sections.some((s) => s.id === pickedId)
    ? pickedId
    : (sections[0]?.id ?? "");
  const current = template.sectionStyles?.[sectionId] ?? {};
  const [colorText, setColorText] = useState<string | null>(null);
  const colorShown = colorText ?? current.headingColor ?? "";

  const rendered = useMemo(
    () =>
      render(vault, {
        ...resolveVariant(template, sampleJob(template.id)),
        layout: structure,
        style,
      }),
    [vault, template, structure, style]
  );

  function change(
    patch: Parameters<typeof setSectionStyle>[0]["change"]
  ): void {
    dispatch(setSectionStyle({ id: activeJob.id, sectionId, change: patch }));
  }

  function numberField(
    key: "headingSize" | "spaceAbove",
    label: string,
    unit: string
  ): JSX.Element {
    const range = SECTION_STYLE_RANGES[key];
    return (
      <TextField
        size="small"
        type="number"
        label={`${label} (${unit})`}
        placeholder="Global"
        value={current[key] ?? ""}
        slotProps={{ htmlInput: { min: range.min, max: range.max } }}
        onChange={(event) =>
          change({
            [key]:
              event.target.value === "" ? null : Number(event.target.value),
          })
        }
        sx={{ width: 160 }}
      />
    );
  }

  const hasStyle = Object.keys(current).length > 0;
  const isColorInvalid = colorShown !== "" && !isValidHex(colorShown);
  const marginMm = PAPER_MARGIN_MM[style.paperMargin];

  return (
    <Box
      component="section"
      aria-label="Section styles"
      sx={{
        display: "flex",
        gap: 3,
        flexWrap: "wrap",
        alignItems: "flex-start",
        mb: 3,
      }}
    >
      <Box sx={{ flex: "1 1 280px", minWidth: 260, display: "grid", gap: 1.5 }}>
        <Typography component="h2" sx={{ fontSize: 15, fontWeight: 700 }}>
          Style per section
        </Typography>
        <TemplateScopeNote />
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          Pick a section and give its heading its own look. Empty fields follow
          the global style. The sample shows your vault with everything shown.
        </Typography>
        <TextField
          select
          size="small"
          label="Section"
          value={sectionId}
          onChange={(event) => {
            setPickedId(event.target.value);
            setColorText(null);
          }}
        >
          {sections.map((section) => (
            <MenuItem key={section.id} value={section.id}>
              {section.title}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          {numberField("headingSize", "Heading size", "pt")}
          {numberField("spaceAbove", "Space above", "px")}
        </Box>
        <TextField
          size="small"
          label="Heading colour"
          placeholder="Global, e.g. #1a3c6e"
          value={colorShown}
          error={isColorInvalid}
          helperText={isColorInvalid ? "Use a colour like #1a3c6e" : undefined}
          onChange={(event) => {
            setColorText(event.target.value);
            if (event.target.value === "" || isValidHex(event.target.value)) {
              change({ headingColor: event.target.value || null });
            }
          }}
          onBlur={() => setColorText(null)}
          sx={{ width: 240 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={current.showDivider !== false}
              onChange={(event) =>
                change({ showDivider: event.target.checked ? null : false })
              }
            />
          }
          label="Line under the heading"
        />
        <Box>
          <Button
            size="small"
            disabled={!hasStyle}
            onClick={() => {
              setColorText(null);
              change({
                headingSize: null,
                headingColor: null,
                spaceAbove: null,
                showDivider: null,
              });
            }}
          >
            Use the global style for this section
          </Button>
        </Box>
      </Box>
      <Box
        aria-label="Sample CV"
        role="img"
        sx={{
          flex: "0 0 auto",
          border: `1px solid ${WORKSPACE_COLORS.border}`,
          overflow: "hidden",
          width: `calc(${A4_DIMENSION_MM.width}mm * ${SAMPLE_ZOOM})`,
          height: `calc(${A4_DIMENSION_MM.height * SAMPLE_PAGES}mm * ${SAMPLE_ZOOM})`,
        }}
      >
        <ZoomFrame zoom={SAMPLE_ZOOM}>
          <Box
            data-testid="sample-cv"
            sx={{
              width: `${A4_DIMENSION_MM.width}mm`,
              height: `${A4_DIMENSION_MM.height * SAMPLE_PAGES}mm`,
              overflow: "hidden",
              boxSizing: "border-box",
              p: `${marginMm}mm`,
              fontSize: "12pt",
              fontFamily: "Calibri, sans-serif",
              color: "#000",
              bgcolor: "#fff",
              "& a": { color: "inherit", textDecoration: "none" },
            }}
          >
            <RenderedColumns rendered={rendered} columnWidth={columnWidth} />
          </Box>
        </ZoomFrame>
      </Box>
    </Box>
  );
}
