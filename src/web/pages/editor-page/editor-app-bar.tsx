import { EditorPageButtons } from "@components/editor-page-buttons";
import { SaveStatus } from "@pages/editor-page/save-status";
import { AppBar, Button, Toolbar, Typography } from "@mui/material";
import { metaDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";

export function EditorAppBar(): JSX.Element {
  const metaData = useAppSelector(metaDataSelector);

  return (
    <AppBar
      position="sticky"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          App version: {metaData.version}
        </Typography>
        <Button color="inherit" href="/?applications" sx={{ mr: 1 }}>
          Applications
        </Button>
        <SaveStatus />
        <EditorPageButtons />
      </Toolbar>
    </AppBar>
  );
}
