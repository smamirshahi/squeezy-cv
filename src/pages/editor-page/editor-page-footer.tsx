import { Box, Button } from "@mui/material";
import {
  setShouldApplyChanges,
  setShouldDiscardChanges,
} from "@store/app/app-slice";
import { useAppDispatch } from "@store/store-helper";

export function EditorPageFooter(): JSX.Element {
  const dispatch = useAppDispatch();

  return (
    <Box
      display="flex"
      justifyContent="flex-end"
      sx={{ mr: "20px", my: "20px" }}
      gap={2}
    >
      <Button
        variant="contained"
        onClick={() => dispatch(setShouldApplyChanges(true))}
      >
        Apply
      </Button>
      <Button
        variant="contained"
        onClick={() => dispatch(setShouldDiscardChanges(true))}
      >
        Discard
      </Button>
    </Box>
  );
}
