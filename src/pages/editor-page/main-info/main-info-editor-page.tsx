import { ContactInfoEditorPage } from "@pages/editor-page/main-info/contact-info-editor-page";
import { PersonalInfoEditorPage } from "@pages/editor-page/main-info/personal-info-editor-page";

export function MainInfoEditorPage(): JSX.Element | null {
  return (
    <>
      <PersonalInfoEditorPage />
      <ContactInfoEditorPage />
    </>
  );
}
