# Browser Authenticator (TOTP)

A lightweight, client-side 2FA (Two-Factor Authentication) tool built as a browser userscript. This project replaces the need for proprietary mobile authenticator apps by generating RFC 6238-compliant one-time passwords directly within the browser environment.

## 🚀 Overview
GitHub and other platforms are increasingly requiring 2FA. While mobile apps like Authy or Google Authenticator are standard, they often lock seeds into proprietary ecosystems. This project provides a **sovereign alternative**: a script that runs locally in your browser via Tampermonkey to generate codes securely.

## ✨ Features
* **Protocol Compliant:** Uses the `otpauth` library to handle SHA-1 hashing and time-step synchronization (RFC 6238).
* **Zero-Server Architecture:** All secrets are stored and processed locally in the browser; no data ever leaves your machine.
* **Seamless Integration:** Designed to run as a userscript, allowing for future automation of the 2FA input field on login pages.
* **Lightweight:** Minimal dependencies and zero overhead compared to desktop or mobile applications.

## 🛠️ Technical Stack
* **Language:** JavaScript (ES6+)
* **Engine:** Tampermonkey / Greasemonkey
* **Logic:** [OTPAuth](https://github.com/hectorm/otpauth) for TOTP generation.
* **Storage:** Browser `localStorage` for persistent secret management.

## 📦 Installation
1.  Install the [Tampermonkey](https://www.tampermonkey.net/) extension for your browser.
2.  Create a new script in the Tampermonkey dashboard.
3.  Copy the source code from `authenticator.user.js` in this repo and paste it into the editor.
4.  Configure your secret key (base32) within the script.

## 🔒 Security Note
This tool is intended for users who maintain full control over their local machine's security. Ensure your browser profile is synced securely or your device is encrypted, as the 2FA secret is stored in the browser's local storage.
When you link this on your resume, recruiters love to see a **"Why I built this"** section. It shows you aren't just following a tutorial, but solving a personal workflow problem.
