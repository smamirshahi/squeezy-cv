# Sync with Google Drive, Dropbox, iCloud or OneDrive

Squeezy CV never talks to those services. It only reads and writes ordinary files in one folder. If that folder is synced by the service's desktop app, you get a backup and a second device, and the app never sees an account, a token or a login.

The files are the same in both modes (`vault.json`, `templates/`, `jobs/`, `applications/`, each with the `meta` block and a `.bak` of the previous version), so a folder written by one mode can be opened by the other.

## Browser mode (#492)

Needs Chrome or Edge on a computer. Safari, Firefox and phones do not have the folder API: there, "Your data" explains it and the backup file stays the way to keep or move data.

1. Open **Your data** and find **Store my data in a folder**.
2. **Choose folder** and pick a folder inside your synced folder, for example `Dropbox/squeezy-cv`.
   - An empty folder gets your current data.
   - A folder that already has Squeezy CV data asks: _use the folder's data_ or _replace it with this browser's data_. They are never merged.
3. From now on the data is read from and saved to that folder; the browser's own copy is left as it was.
4. **Disconnect** goes back to the browser's copy. The files in the folder stay.

Each visit the browser may ask again for permission to the folder; the app then shows **Reconnect your data folder** (a click is needed for the browser to ask). Nothing is read or written until you allow it.

When the files change outside the app (the sync client brings in a change from another device), the app notices when you come back to the tab and offers **Reload**. If you also have unsaved changes it says so: saving replaces the folder's version, and the previous one is kept next to it as `<file>.bak`. Nothing is merged automatically.

Not in the folder: AI keys (they stay in this browser's `localStorage`). "Delete all my data" forgets the folder but does not delete the files in it.

## Server mode

Point `DATA_DIR` at a folder inside the synced folder and start as usual:

```
DATA_DIR=~/Dropbox/squeezy-cv pnpm dev
```

## Privacy

The provider then holds your CV files, unencrypted, unless your disk or folder is encrypted. Choose a folder only if that is acceptable to you. Do not run two copies of the app on the same folder at the same moment: sync clients can create conflict copies when two devices save at once.
