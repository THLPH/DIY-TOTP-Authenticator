# DIY TOTP Authenticator 🔑

![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-blue?style=flat-square)
![Dependencies](https://img.shields.io/badge/Dependencies-0-success?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-orange?style=flat-square)
![RFC 6238](https://img.shields.io/badge/RFC-6238-lightgrey?style=flat-square)

Zero-dependency 2FA code generator running on the browser's Web Crypto API (`crypto.subtle`). Generates standard 6-digit rolling codes locally without external libraries, analytics, or third-party servers.

---

## What's in here

* `extension/` — Popup extension for Chromium-based browsers (Manifest V3).
* `userscript/` — Standalone Tampermonkey script if you prefer not loading unpacked extensions.

Both use the same setup: save your Base32 secret once, watch the 30-second timer count down, and click the code to copy it.

---

## Installation

### Browser Extension

Works on Chrome, Brave, and Edge:

1. Go to your browser's extension page:
   * **Chrome:** `chrome://extensions`
   * **Brave:** `brave://extensions`
   * **Edge:** `edge://extensions`
2. Turn on **Developer mode** (toggle in top right on Chrome/Brave, or left sidebar on Edge).
3. Click **Load unpacked** and select the `extension/` folder.
4. Open the popup, enter your Base32 secret, and click **Save**.

### Userscript

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Create a new script, paste the code from `userscript/tiny-totp.user.js`, and save.
3. Click the Tampermonkey icon on any page and click **Open Authenticator** to pop up the widget.

---

## How it works

Standard RFC 6238 and RFC 4226 implementation:

1. **Counter:** Takes `Math.floor(Date.now() / 1000 / 30)` to get the 30-second time step as an 8-byte big-endian integer.
2. **Decode:** Converts the Base32 secret key into a `Uint8Array`.
3. **Sign:** Computes an HMAC-SHA1 digest using `crypto.subtle.sign`.
4. **Truncate:** Reads the dynamic offset from the last byte, pulls 4 bytes, drops the sign bit, and applies modulo 1,000,000 to return a padded 6-digit code.

---

## Security

* Keys stay strictly in local storage (`localStorage` in the extension, `GM_setValue` in the userscript).
* Zero network calls. No telemetry, no external scripts.
* The entire crypto logic is under 50 lines of plain JavaScript.

---

## License

MIT