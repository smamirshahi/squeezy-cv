import { useState } from "react";
import {
  Box,
  InputAdornment,
  Link,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

export interface RequirementGroup {
  title: string;
  list: string[];
}

/** The three groups of an advert analysis, in the order they are always shown */
export function groupsOfRequirements(requirements: {
  mustHave: string[];
  niceToHave: string[];
  keywords: string[];
}): RequirementGroup[] {
  return [
    { title: "Must have", list: requirements.mustHave },
    { title: "Nice to have", list: requirements.niceToHave },
    { title: "Keywords", list: requirements.keywords },
  ];
}

interface Props {
  groups: RequirementGroup[];
  /** With `onToggle` the rows are tickable; without it the table only shows */
  selected?: string[];
  onToggle?: (text: string) => void;
  /** Ticks (true) or unticks (false) several points at once: the "All · None" of a column */
  onSetMany?: (texts: string[], isOn: boolean) => void;
}

/**
 * One table for what the job asks for: a column per group, one row per point, a filter on top.
 * The same table is used to read it (the advert dialog, the analysis results) and to pick from it
 * (what to lean on). Only the picker passes `onToggle`, which adds the tick boxes, "n of m" counts,
 * "All · None" per column and the "Ticked only" switch.
 */
export function RequirementsTable({
  groups,
  selected = [],
  onToggle,
  onSetMany,
}: Props): JSX.Element {
  const [filter, setFilter] = useState<string>("");
  const [isTickedOnly, setIsTickedOnly] = useState<boolean>(false);
  const isPicker = onToggle !== undefined;
  const needle = filter.trim().toLowerCase();

  function visible(list: string[]): string[] {
    return list.filter(
      (text) =>
        (needle === "" || text.toLowerCase().includes(needle)) &&
        (!isTickedOnly || selected.includes(text))
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <TextField
          size="small"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter points…"
          slotProps={{
            htmlInput: { "aria-label": "Filter points" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: 360, maxWidth: "60%" }}
        />
        {isPicker && <Box sx={{ flex: 1 }} />}
        {isPicker && (
          <ToggleButtonGroup
            exclusive
            size="small"
            aria-label="Which points to show"
            value={isTickedOnly ? "ticked" : "all"}
            onChange={(_event, value: string | null) => {
              if (value) {
                setIsTickedOnly(value === "ticked");
              }
            }}
          >
            <ToggleButton value="all" sx={{ px: 1.5, fontSize: 12 }}>
              All
            </ToggleButton>
            <ToggleButton value="ticked" sx={{ px: 1.5, fontSize: 12 }}>
              Ticked only
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "1.25fr 1fr 1.15fr",
          },
          alignItems: "start",
          border: `1px solid ${WORKSPACE_COLORS.border}`,
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: WORKSPACE_COLORS.panel,
        }}
      >
        {groups.map(({ title, list }, column) => {
          const shown = visible(list);
          const pickedCount = list.filter((text) =>
            selected.includes(text)
          ).length;
          // The keywords are short: two to a line
          const isKeywords = title === "Keywords";
          return (
            <Box
              key={title}
              sx={{
                minWidth: 0,
                borderLeft:
                  column > 0
                    ? { md: `1px solid ${WORKSPACE_COLORS.border}` }
                    : 0,
                borderTop:
                  column > 0
                    ? { xs: `1px solid ${WORKSPACE_COLORS.border}`, md: 0 }
                    : 0,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  bgcolor: WORKSPACE_COLORS.panelAlt,
                }}
              >
                <Typography
                  component="h3"
                  sx={{ m: 0, fontSize: 12.5, fontWeight: 700 }}
                >
                  {title}{" "}
                  <Box
                    component="span"
                    sx={{
                      fontWeight: 600,
                      color: isPicker
                        ? WORKSPACE_COLORS.aiText
                        : WORKSPACE_COLORS.muted,
                    }}
                  >
                    {isPicker
                      ? `${pickedCount} of ${list.length}`
                      : shown.length === list.length
                        ? `(${list.length})`
                        : `${shown.length} of ${list.length}`}
                  </Box>
                </Typography>
                {isPicker && onSetMany && (
                  <Typography
                    sx={{ fontSize: 12, color: WORKSPACE_COLORS.aiText }}
                  >
                    <Link
                      component="button"
                      type="button"
                      underline="always"
                      color="inherit"
                      sx={{ fontSize: 12, verticalAlign: "baseline" }}
                      onClick={() => onSetMany(shown, true)}
                    >
                      All
                    </Link>
                    {" · "}
                    <Link
                      component="button"
                      type="button"
                      underline="always"
                      color="inherit"
                      sx={{ fontSize: 12, verticalAlign: "baseline" }}
                      onClick={() => onSetMany(list, false)}
                    >
                      None
                    </Link>
                  </Typography>
                )}
              </Box>
              {list.length === 0 || shown.length === 0 ? (
                <Typography
                  sx={{
                    px: 1.5,
                    py: 1,
                    fontSize: 12.5,
                    color: WORKSPACE_COLORS.muted,
                  }}
                >
                  {list.length === 0 ? "None found." : "No match."}
                </Typography>
              ) : (
                <Box
                  component="ul"
                  sx={{
                    m: 0,
                    p: 0,
                    listStyle: "none",
                    display: "grid",
                    gridTemplateColumns: isKeywords ? "1fr 1fr" : "1fr",
                  }}
                >
                  {shown.map((text) => (
                    <li key={text}>
                      <PointRow
                        text={text}
                        isOn={selected.includes(text)}
                        onToggle={onToggle}
                      />
                    </li>
                  ))}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function PointRow({
  text,
  isOn,
  onToggle,
}: {
  text: string;
  isOn: boolean;
  onToggle?: (text: string) => void;
}): JSX.Element {
  const rowSx = {
    display: "flex",
    alignItems: "flex-start",
    gap: 1.25,
    width: "100%",
    px: 1.5,
    py: 0.9,
    fontSize: 13,
    lineHeight: 1.4,
    textAlign: "left",
    borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
    overflowWrap: "anywhere",
  } as const;
  if (!onToggle) {
    return <Box sx={rowSx}>{text}</Box>;
  }
  return (
    <Box
      component="button"
      type="button"
      aria-pressed={isOn}
      onClick={() => onToggle(text)}
      sx={{
        ...rowSx,
        font: "inherit",
        fontSize: 13,
        lineHeight: 1.4,
        color: isOn ? WORKSPACE_COLORS.aiText : WORKSPACE_COLORS.text,
        fontWeight: isOn ? 600 : 400,
        bgcolor: isOn ? WORKSPACE_COLORS.aiSoft : "transparent",
        border: 0,
        borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
        cursor: "pointer",
        "&:hover": {
          bgcolor: isOn ? WORKSPACE_COLORS.aiSoft : WORKSPACE_COLORS.hover,
        },
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          flex: "none",
          mt: "1px",
          width: 16,
          height: 16,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 0.5,
          border: `1.5px solid ${
            isOn ? WORKSPACE_COLORS.ai : WORKSPACE_COLORS.borderStrong
          }`,
          bgcolor: isOn ? WORKSPACE_COLORS.ai : WORKSPACE_COLORS.panel,
          color: WORKSPACE_COLORS.aiContrast,
        }}
      >
        {isOn && <CheckOutlinedIcon sx={{ fontSize: 12 }} />}
      </Box>
      {text}
    </Box>
  );
}
