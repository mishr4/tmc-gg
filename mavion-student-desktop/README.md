# Mavion Student Desktop

This is a standalone Windows Electron app, not part of the `/go` website.

## Build an installer

1. Install Node.js 20 or newer.
2. In this folder, run `npm install`.
3. Run `npm run dist`.
4. The Windows installer will be created in `dist/`.

The included sign-in supports the access code `Mavion`. NFC readers that operate as a keyboard can enter that code in the access field. Direct NFC tag reading requires a specific Windows-compatible reader and its SDK/native integration.
