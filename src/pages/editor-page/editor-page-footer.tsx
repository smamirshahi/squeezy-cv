import { Box, Button } from "@mui/material";

interface Props {
  onApplyClicked: () => void;
  onDiscardClicked: () => void;
}

export function EditorPageFooter({
  onApplyClicked,
  onDiscardClicked,
}: Props): JSX.Element {
  return (
    <Box
      display="flex"
      justifyContent="flex-end"
      sx={{ mr: "20px", my: "20px" }}
      gap={2}
    >
      <Button variant="contained" onClick={onApplyClicked}>
        Apply
      </Button>
      <Button variant="contained" onClick={onDiscardClicked}>
        Discard
      </Button>
    </Box>
  );
}
