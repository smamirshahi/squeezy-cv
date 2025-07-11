import { EditorPageButtons } from "@components/editor-page-buttons";
import { AppBar, Toolbar, Typography } from "@mui/material";
import { metaDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function AppBarEditorPage({ contentRef }: Props): JSX.Element {
  const metaData = useAppSelector(metaDataSelector);
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          App version: {metaData.version}
        </Typography>
        <EditorPageButtons printReference={contentRef} />
      </Toolbar>
    </AppBar>
  );
}
