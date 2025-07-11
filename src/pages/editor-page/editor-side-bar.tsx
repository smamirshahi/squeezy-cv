import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
} from "@mui/material";
import {
  appSelector,
  setSelectedSectionInEditorPage,
} from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { EditorPageSection } from "@pages/editor-page/editor-types";

const DRAWER_WIDTH = 200;

interface Props {
  editorPageSections: EditorPageSection;
}

export function EditorSideBar({ editorPageSections }: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const { selectedSectionInEditorPage } = useAppSelector(appSelector);

  return (
    <Box>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          ["& .MuiDrawer-paper"]: {
            position: "relative",
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        <List>
          {Object.values(editorPageSections).map(({ id, label }) => (
            <ListItem key={id} disablePadding>
              <ListItemButton
                onClick={() => dispatch(setSelectedSectionInEditorPage(id))}
                selected={selectedSectionInEditorPage === id}
              >
                <ListItemText primary={label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
    </Box>
  );
}
