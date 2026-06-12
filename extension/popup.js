// Core RFC 6238 implementation using Web Crypto API

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
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / 30);

  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(4, timeStep, false);

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

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

const setupDiv = document.getElementById("setup");
const displayDiv = document.getElementById("display");
const codeEl = document.getElementById("code");
const timerEl = document.getElementById("timer");

async function refresh(secret) {
  codeEl.textContent = await generateTOTP(secret);
  const secondsLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
  timerEl.textContent = `Expires in: ${secondsLeft}s`;
}

const secret = localStorage.getItem("totp_secret");
if (!secret) {
  setupDiv.style.display = "block";
  document.getElementById("save-btn").onclick = () => {
    const val = document.getElementById("secret-input").value.trim();
    if (val) {
      localStorage.setItem("totp_secret", val);
      location.reload();
    }
  };
} else {
  displayDiv.style.display = "block";
  refresh(secret);
  setInterval(() => refresh(secret), 1000);
  codeEl.onclick = () => {
    navigator.clipboard.writeText(codeEl.textContent);
    timerEl.textContent = "Copied!";
  };
}
