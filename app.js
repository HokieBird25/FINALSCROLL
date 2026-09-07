const $ = (id) => document.getElementById(id);

const state = {
  all: [],
  view: [],
  index: 0,
  reelsOnly: false,
  query: "",
};

function fixMojibake(str) {
  if (!str || typeof str !== "string") return "";
  try {
    const bytes = Uint8Array.from({ length: str.length }, (_, i) => str.charCodeAt(i) & 255);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (!decoded || decoded.includes("\uFFFD")) return str;
    // Prefer decoded if it recovered CJK / emoji / curly quotes
    if (decoded !== str && /[^\x00-\x7F]/.test(decoded)) return decoded;
    return str;
  } catch {
    return str;
  }
}

function fieldMap(dict) {
  const out = {};
  if (!Array.isArray(dict)) return out;
  for (const item of dict) {
    if (item && item.label) out[item.label] = item.value ?? item.href ?? "";
  }
  return out;
}

function parseItem(raw) {
  const fields = raw.label_values || raw || [];
  let url = "";
  let caption = "";
  let title = "";
  let username = "";
  let name = "";
  const hashtags = [];

  const list = Array.isArray(fields) ? fields : [];
  for (const f of list) {
    if (f.label === "URL") url = f.value || f.href || url;
    if (f.label === "Caption" && f.value && !caption) caption = f.value;
    if (f.label === "Title" && f.value) title = f.value;
    if (f.title === "Hashtags" && Array.isArray(f.dict)) {
      for (const wrap of f.dict) {
        const tag = fieldMap(wrap.dict).Name;
        if (tag) hashtags.push(tag);
      }
    }
    if (f.title === "Owner" && Array.isArray(f.dict) && f.dict[0]) {
      const owner = fieldMap(f.dict[0].dict);
      username = owner.Username || username;
      name = owner.Name || name;
    }
  }

  // older / alternate export shapes
  if (!url) {
    url =
      raw.href ||
      raw.url ||
      raw.string_list_data?.[0]?.href ||
      raw.media?.[0]?.uri ||
      "";
  }

  url = String(url).trim();
  const shortcode = (url.match(/instagram\.com\/(?:reel|p|tv)\/([^/?#]+)/i) || [])[1] || "";
  const kind = /\/reel\//i.test(url) ? "reel" : /\/tv\//i.test(url) ? "tv" : shortcode ? "post" : "link";

  return {
    url,
    shortcode,
    kind,
    caption: fixMojibake(caption || title || ""),
    username: username || "unknown",
    name: fixMojibake(name || ""),
    hashtags,
    timestamp: raw.timestamp || raw.taken_at || 0,
    fbid: raw.fbid || "",
  };
}

function unwrap(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const keys = [
    "saved_saved_media",
    "saved_posts",
    "saved_media",
    "saved",
    "media",
    "items",
  ];
  for (const k of keys) {
    if (Array.isArray(data[k])) return data[k];
  }
  for (const v of Object.values(data)) {
    if (Array.isArray(v) && v.length && typeof v[0] === "object") return v;
  }
  return [];
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function applyFilters() {
  const q = state.query.trim().toLowerCase();
  state.view = state.all.filter((item) => {
    if (!item.url) return false;
    if (state.reelsOnly && item.kind !== "reel") return false;
    if (!q) return true;
    return (
      item.username.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.caption.toLowerCase().includes(q) ||
      item.hashtags.some((t) => t.toLowerCase().includes(q))
    );
  });
  if (state.index >= state.view.length) state.index = 0;
}

function formatWhen(ts) {
  if (!ts) return "";
  const ms = ts > 1e12 ? ts : ts * 1000;
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "";
  }
}

function render() {
  const item = state.view[state.index];
  $("pos").textContent = state.view.length
    ? `${state.index + 1} / ${state.view.length}`
    : "0 / 0";

  if (!item) {
    $("embed").innerHTML = `<div class="fallback">No matching items.</div>`;
    $("user").textContent = "";
    $("caption").textContent = "";
    $("tags").innerHTML = "";
    $("when").textContent = "";
    return;
  }

  $("kind").textContent = item.kind;
  $("user").textContent = item.username ? `@${item.username}` : "Unknown account";
  $("user").href = item.username ? `https://www.instagram.com/${item.username}/` : item.url;
  $("when").textContent = formatWhen(item.timestamp);
  $("caption").textContent = item.caption || "(no caption in export)";
  $("tags").innerHTML = item.hashtags
    .slice(0, 12)
    .map((t) => `<span class="tag">#${escapeHtml(t)}</span>`)
    .join("");
  $("open").href = item.url;

  const path = item.kind === "post" ? "p" : item.kind === "tv" ? "tv" : "reel";
  const embedUrl = item.shortcode
    ? `https://www.instagram.com/${path}/${encodeURIComponent(item.shortcode)}/embed/`
    : "";

  if (embedUrl) {
    $("embed").innerHTML = `<iframe
      title="Instagram embed"
      src="${embedUrl}"
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
      allowfullscreen
      loading="eager"
    ></iframe>`;
  } else {
    $("embed").innerHTML = `<div class="fallback">
      <p>No embeddable Instagram URL in this row.</p>
      <a class="primary" href="${item.url}" target="_blank" rel="noopener noreferrer">Open link</a>
    </div>`;
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function go(delta) {
  if (!state.view.length) return;
  state.index = (state.index + delta + state.view.length) % state.view.length;
  render();
}

function loadList(rawItems) {
  state.all = rawItems.map(parseItem).filter((x) => x.url);
  state.index = 0;
  applyFilters();
  state.view = shuffle(state.view);
  $("start").hidden = true;
  $("player").hidden = false;
  render();
}

$("file").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  $("error").hidden = true;
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const items = unwrap(data);
    if (!items.length) throw new Error("That JSON did not look like a saved-posts list.");
    loadList(items);
  } catch (err) {
    $("error").hidden = false;
    $("error").textContent = err.message || "Could not read that file.";
  }
});

$("next").addEventListener("click", () => go(1));
$("prev").addEventListener("click", () => go(-1));
$("shuffle").addEventListener("click", () => {
  state.view = shuffle(state.view);
  state.index = 0;
  render();
});
$("filterReels").addEventListener("click", () => {
  state.reelsOnly = !state.reelsOnly;
  $("filterReels").textContent = state.reelsOnly ? "Show all" : "Reels only";
  applyFilters();
  state.view = shuffle(state.view);
  state.index = 0;
  render();
});
$("search").addEventListener("input", (e) => {
  state.query = e.target.value;
  const current = state.view[state.index];
  applyFilters();
  if (current) {
    const i = state.view.findIndex((x) => x.fbid === current.fbid && x.url === current.url);
    state.index = i >= 0 ? i : 0;
  }
  render();
});
$("back").addEventListener("click", () => {
  $("player").hidden = true;
  $("start").hidden = false;
  $("file").value = "";
});
$("copy").addEventListener("click", async () => {
  const item = state.view[state.index];
  if (!item) return;
  try {
    await navigator.clipboard.writeText(item.url);
    $("copy").textContent = "Copied";
    setTimeout(() => ($("copy").textContent = "Copy link"), 1000);
  } catch {
    $("copy").textContent = "Copy failed";
  }
});

window.addEventListener("keydown", (e) => {
  if ($("player").hidden) return;
  if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
  if (e.key === "ArrowDown" || e.key === "j" || e.key === " ") {
    e.preventDefault();
    go(1);
  }
  if (e.key === "ArrowUp" || e.key === "k") {
    e.preventDefault();
    go(-1);
  }
  if (e.key === "r") {
    state.view = shuffle(state.view);
    state.index = 0;
    render();
  }
});

let touchY = null;
window.addEventListener("touchstart", (e) => {
  if ($("player").hidden) return;
  touchY = e.changedTouches[0].clientY;
});
window.addEventListener("touchend", (e) => {
  if (touchY == null) return;
  const dy = e.changedTouches[0].clientY - touchY;
  touchY = null;
  if (Math.abs(dy) < 50) return;
  go(dy < 0 ? 1 : -1);
});
