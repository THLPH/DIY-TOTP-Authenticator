// ==UserScript==
// @name         DIY TOTP Authenticator
// @namespace    https://github.com/THLPH/DIY-TOTP-Authenticator
// @version      1.1.0
// @description  Zero-dependency RFC 6238 TOTP authenticator widget with autofill support
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  function base32Decode(str) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let cleaned = str.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (let i = 0; i < cleaned.length; i++) {
      const idx = alphabet.indexOf(cleaned[i]);
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
    const timeStep = Math.floor(Date.now() / 1000 / 30);
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setUint32(4, timeStep, false);

    const keyBytes = base32Decode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
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

  // --- Autofill Engine ---
  async function attemptAutofill() {
    const secret = GM_getValue("totp_secret", "");
    const enabled = GM_getValue("autofill_enabled", false);
    if (!secret || !enabled) return;

    const selectors = [
      'input[id*="otp" i]',
      'input[name*="otp" i]',
      'input[id*="2fa" i]',
      'input[name*="2fa" i]',
      'input[id*="totp" i]',
      'input[name*="totp" i]',
      'input[autocomplete="one-time-code"]',
      'input#app_totp',
      'input#verification_code'
    ];

    const input = document.querySelector(selectors.join(","));
    if (input && !input.dataset.totpFilled) {
      const code = await generateTOTP(secret);
      input.focus();
      input.value = code;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dataset.totpFilled = "true";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attemptAutofill);
  } else {
    attemptAutofill();
  }

  const observer = new MutationObserver(() => attemptAutofill());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // --- UI Widget ---
  let activeInterval = null;

  function closeWidget() {
    const existing = document.getElementById("diy-totp-host");
    if (existing) existing.remove();
    if (activeInterval) {
      clearInterval(activeInterval);
      activeInterval = null;
    }
    document.removeEventListener("keydown", onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") closeWidget();
  }

  function renderWidget() {
    closeWidget();

    const host = document.createElement("div");
    host.id = "diy-totp-host";
    host.style.all = "initial";
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 2147483646;
      }
      .card {
        position: fixed;
        top: 24px;
        right: 24px;
        width: 240px;
        background: #181825;
        color: #cdd6f4;
        border: 1px solid #313244;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 16px;
        z-index: 2147483647;
        box-sizing: border-box;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .title {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #a6adc8;
      }
      .close-btn {
        background: transparent;
        border: none;
        color: #6c7086;
        font-size: 14px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      .close-btn:hover { color: #f38ba8; }
      .code-display {
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        font-size: 30px;
        font-weight: 700;
        letter-spacing: 4px;
        color: #a6e3a1;
        text-align: center;
        margin: 10px 0 6px 0;
        cursor: pointer;
        user-select: none;
        transition: transform 0.1s ease;
      }
      .code-display:hover { transform: scale(1.03); }
      .code-display:active { transform: scale(0.97); }
      .timer-bar-wrap {
        height: 4px;
        background: #313244;
        border-radius: 2px;
        overflow: hidden;
        margin: 8px 0;
      }
      .timer-bar {
        height: 100%;
        background: #89b4fa;
        width: 100%;
        transition: width 1s linear;
      }
      .subtext {
        font-size: 11px;
        color: #9399b2;
        text-align: center;
        min-height: 14px;
      }
      .toggle-wrap {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 12px 0 6px 0;
        padding-top: 8px;
        border-top: 1px solid #313244;
        font-size: 11px;
        color: #cdd6f4;
      }
      .toggle-wrap input {
        cursor: pointer;
      }
      .input-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      input[type="password"] {
        width: 100%;
        box-sizing: border-box;
        padding: 8px;
        background: #313244;
        border: 1px solid #45475a;
        border-radius: 6px;
        color: #cdd6f4;
        font-size: 12px;
        outline: none;
      }
      input[type="password"]:focus { border-color: #89b4fa; }
      button.primary {
        background: #89b4fa;
        color: #11111b;
        border: none;
        border-radius: 6px;
        padding: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      button.primary:hover { background: #b4befe; }
      .footer {
        margin-top: 10px;
        display: flex;
        justify-content: flex-end;
      }
      .link-btn {
        background: transparent;
        border: none;
        color: #6c7086;
        font-size: 11px;
        cursor: pointer;
        padding: 0;
        text-decoration: underline;
      }
      .link-btn:hover { color: #f38ba8; }
    `;
    shadow.appendChild(style);

    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    backdrop.onclick = closeWidget;
    shadow.appendChild(backdrop);

    const card = document.createElement("div");
    card.className = "card";
    shadow.appendChild(card);

    document.addEventListener("keydown", onKeyDown);

    const secret = GM_getValue("totp_secret", "");

    if (!secret) {
      card.innerHTML = `
        <div class="header">
          <span class="title">TOTP Setup</span>
          <button class="close-btn" id="close">✕</button>
        </div>
        <div class="input-group">
          <input type="password" id="secret-input" placeholder="Paste Base32 secret key" />
          <button class="primary" id="save-btn">Save Secret</button>
        </div>
        <div class="subtext" style="margin-top:8px;">Stored locally in GM storage</div>
      `;

      card.querySelector("#close").onclick = closeWidget;
      card.querySelector("#save-btn").onclick = () => {
        const val = card.querySelector("#secret-input").value.trim().toUpperCase();
        if (val) {
          GM_setValue("totp_secret", val);
          renderWidget();
        }
      };
    } else {
      const isAutofill = GM_getValue("autofill_enabled", false);

      card.innerHTML = `
        <div class="header">
          <span class="title">Authenticator</span>
          <button class="close-btn" id="close">✕</button>
        </div>
        <div class="code-display" id="code" title="Click to copy">------</div>
        <div class="timer-bar-wrap">
          <div class="timer-bar" id="bar"></div>
        </div>
        <div class="subtext" id="status">Click code to copy</div>
        <div class="toggle-wrap">
          <span>Autofill on login pages</span>
          <input type="checkbox" id="toggle-autofill" ${isAutofill ? "checked" : ""} />
        </div>
        <div class="footer">
          <button class="link-btn" id="reset-btn">Reset Key</button>
        </div>
      `;

      card.querySelector("#close").onclick = closeWidget;
      const codeEl = card.querySelector("#code");
      const barEl = card.querySelector("#bar");
      const statusEl = card.querySelector("#status");
      const autofillToggle = card.querySelector("#toggle-autofill");

      autofillToggle.onchange = (e) => {
        GM_setValue("autofill_enabled", e.target.checked);
        if (e.target.checked) attemptAutofill();
      };

      card.querySelector("#reset-btn").onclick = () => {
        GM_deleteValue("totp_secret");
        GM_deleteValue("autofill_enabled");
        renderWidget();
      };

      async function update() {
        try {
          const currentCode = await generateTOTP(secret);
          codeEl.textContent = currentCode;
        } catch {
          codeEl.textContent = "ERROR";
          statusEl.textContent = "Invalid Base32 secret";
          return;
        }

        const elapsed = Math.floor(Date.now() / 1000) % 30;
        const remaining = 30 - elapsed;
        const pct = (remaining / 30) * 100;
        barEl.style.width = `${pct}%`;
      }

      update();
      activeInterval = setInterval(update, 1000);

      codeEl.onclick = async () => {
        try {
          await navigator.clipboard.writeText(codeEl.textContent);
          statusEl.textContent = "Copied to clipboard!";
          setTimeout(() => {
            if (statusEl.textContent === "Copied to clipboard!") {
              statusEl.textContent = "Click code to copy";
            }
          }, 2000);
        } catch {
          statusEl.textContent = "Clipboard permission denied";
        }
      };
    }
  }

  GM_registerMenuCommand("Open Authenticator", renderWidget);
})();