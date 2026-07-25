# Mavion Student Desktop

This is a standalone Windows Electron app, not part of the `/go` website.

## Build an installer

1. Install Node.js 20 or newer.
2. In this folder, run `npm install`.
3. Run `npm run dist`.
4. The Windows installer will be created in `dist/`.

The included sign-in supports the access code `Mavion`. NFC readers that operate as a keyboard can enter that code in the access field. Direct NFC tag reading requires a specific Windows-compatible reader and its SDK/native integration.
# Imprivata reader support

Version 1.7 supports the Imprivata HDW-IMP-80-MINI / rf IDEAS reader identified by USB VID `0C27` and PID `3BFA`.

1. Connect the reader directly by USB.
2. Open **Mavion Go Lock → Settings**.
3. Confirm the reader shows **Connected**.
4. Choose **Enroll card**, tap a badge, enter the welcome name, and save it.
5. Lock the desktop and select **NFC card** to unlock with the enrolled badge.

The reader must be configured for USB keyboard/keystroke output. The rf IDEAS Configuration Utility can switch compatible hardware to that mode. Card identifiers are saved locally under the app's Electron user-data directory; Windows passwords and PINs are never stored.
