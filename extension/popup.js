function base32Decode(str) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = str.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
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
  const timeStep = Math.floor(Math.floor(Date.now() / 1000) / 30);
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

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, buffer);
  const hash = new Uint8Array(signature);
  const offset = hash[hash.length - 1] & 0x0f;

  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  return (binary % 1000000).toString().padStart(6, "0");
}

function getStoredSecret() {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["totp_secret"], (res) => resolve(res.totp_secret || ""));
    } else {
      resolve(localStorage.getItem("totp_secret") || "");
    }
  });
}

function setStoredSecret(secret) {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ totp_secret: secret }, resolve);
    } else {
      localStorage.setItem("totp_secret", secret);
      resolve();
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const viewActive = document.getElementById("view-active");
  const viewSetup = document.getElementById("view-setup");
  const codeEl = document.getElementById("code");
  const timerEl = document.getElementById("timer");
  const inputSecret = document.getElementById("input-secret");
  const btnSave = document.getElementById("btn-save");
  const btnReset = document.getElementById("btn-reset");

  let activeSecret = await getStoredSecret();
  let intervalId = null;

  function render() {
    if (intervalId) clearInterval(intervalId);

    if (!activeSecret) {
      viewActive.classList.add("hidden");
      viewSetup.classList.remove("hidden");
      inputSecret.value = "";
      inputSecret.focus();
    } else {
      viewSetup.classList.add("hidden");
      viewActive.classList.remove("hidden");

      async function update() {
        codeEl.textContent = await generateTOTP(activeSecret);
        const sec = 30 - (Math.floor(Date.now() / 1000) % 30);
        timerEl.textContent = `Expires in: ${sec}s`;
      }

      update();
      intervalId = setInterval(update, 1000);
    }
  }

  btnSave.addEventListener("click", async () => {
    const val = inputSecret.value.trim();
    if (val) {
      activeSecret = val;
      await setStoredSecret(val);
      render();
    }
  });

  btnReset.addEventListener("click", async () => {
    activeSecret = "";
    await setStoredSecret("");
    render();
  });

  codeEl.addEventListener("click", async () => {
    const code = codeEl.textContent;
    if (code && code !== "------") {
      await navigator.clipboard.writeText(code);
      timerEl.textContent = "Copied to clipboard!";
      setTimeout(() => {
        const sec = 30 - (Math.floor(Date.now() / 1000) % 30);
        timerEl.textContent = `Expires in: ${sec}s`;
      }, 1200);
    }
  });

  render();
});
