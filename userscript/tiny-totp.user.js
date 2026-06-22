// ==UserScript==
// @name         tiny-totp
// @namespace    https://github.com/yourusername/tiny-totp
// @version      1.0.0
// @description  Zero-dependency TOTP generator widget for browser
// @match        https://github.com/sessions/two-factor*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  function base32Decode(str) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let cleaned = str.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
    let bits = 0, value = 0;
    const bytes = [];
    for (let char of cleaned) {
      const idx = alphabet.indexOf(char);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return new Uint8Array(bytes);
  }

  async function generateTOTP(secret) {
    const timeStep = Math.floor(Math.floor(Date.now() / 1000) / 30);
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setUint32(4, timeStep, false);

    const keyBytes = base32Decode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
    );

    const hmac = await crypto.subtle.sign("HMAC", cryptoKey, buffer);
    const hash = new Uint8Array(hmac);
    const offset = hash[hash.length - 1] & 0x0f;

    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    return (binary % 1000000).toString().padStart(6, "0");
  }

  let secret = GM_getValue("totp_secret", "");
  if (!secret) {
    secret = prompt("Enter your 2FA Base32 Secret Key:");
    if (secret) GM_setValue("totp_secret", secret.trim());
  }

  if (secret) {
    const btn = document.createElement("button");
    btn.innerText = "Copy 2FA";
    btn.style = "position:fixed;bottom:20px;right:20px;z-index:9999;padding:8px 14px;background:#2ea44f;color:#fff;border:none;border-radius:6px;cursor:pointer;";
    btn.onclick = async () => {
      const code = await generateTOTP(secret);
      await navigator.clipboard.writeText(code);
      btn.innerText = `Copied ${code}`;
      setTimeout(() => (btn.innerText = "Copy 2FA"), 2500);
    };
    document.body.appendChild(btn);
  }
})();
