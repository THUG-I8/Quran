// Quran Pro — main app
import { fetchSurahs } from "./api.js";
import { storage } from "./storage.js";
import { qs, toast, setTheme, setQuranTypography } from "./ui.js";
import { AudioPlayer } from "./player.js";
import { Tasbeeh } from "./tasbeeh.js";
import {
  homePage, surahsPage, bindSurahsPage,
  surahPage, bindSurahPage,
  bookmarksPage, bindBookmarksPage,
  settingsPage, bindSettingsPage,
  radioPage, bindRadioPage,
  notFoundPage
} from "./routes.js";

const appEl = qs("#app");
const subtitleEl = qs("#subtitle");
const btnMenu = qs("#btnMenu");
const drawer = qs("#drawer");
const drawerOverlay = qs("#drawerOverlay");
const btnBack = qs("#btnBack");
const btnTheme = qs("#btnTheme");
const btnSearch = qs("#btnSearch");
const btnInstall = qs("#btnInstall");

const searchModal = qs("#searchModal");
const searchOverlay = qs("#searchOverlay");
const btnCloseSearch = qs("#btnCloseSearch");
const searchInput = qs("#searchInput");
const searchResults = qs("#searchResults");

let surahs = [];
let deferredPrompt = null;

const player = new AudioPlayer();
const tasbeeh = new Tasbeeh();

function applySettings(){
  const s = storage.getSettings();
  setTheme(s.theme);
  setQuranTypography({fontSize: s.qFontSize, lineHeight: s.qLineHeight});
  // update theme icon
  btnTheme.querySelector(".i").textContent = (s.theme === "light") ? "☀" : "☾";
}
applySettings();

// SW register
if ("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./assets/sw.js").catch(()=>{});
  });
}

// Install prompt
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstall.style.display = "flex";
});
btnInstall.addEventListener("click", async () => {
  if (!deferredPrompt){
    toast("التثبيت غير متاح", "قد يكون المتصفح لا يدعم أو تم التثبيت مسبقًا.", "warn");
    return;
  }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice.catch(()=>{});
  deferredPrompt = null;
});

// Drawer
function openDrawer(){
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
}
function closeDrawer(){
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
}
btnMenu.addEventListener("click", openDrawer);
drawerOverlay.addEventListener("click", closeDrawer);
drawer.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (a) closeDrawer();
});

// Back button: simple heuristic
btnBack.addEventListener("click", () => {
  if (history.length > 1) history.back();
  else location.hash = "#/";
});

// Theme toggle
btnTheme.addEventListener("click", () => {
  const s = storage.getSettings();
  s.theme = (s.theme === "light") ? "dark" : "light";
  storage.setSettings(s);
  applySettings();
});

// Search modal
function openSearch(){
  searchModal.classList.add("open");
  searchModal.setAttribute("aria-hidden", "false");
  searchInput.value = "";
  searchResults.innerHTML = "";
  setTimeout(()=>searchInput.focus(), 50);
}
function closeSearch(){
  searchModal.classList.remove("open");
  searchModal.setAttribute("aria-hidden", "true");
}
btnSearch.addEventListener("click", openSearch);
btnCloseSearch.addEventListener("click", closeSearch);
searchOverlay.addEventListener("click", closeSearch);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeDrawer(); closeSearch(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault(); openSearch();
  }
});

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q){ searchResults.innerHTML = ""; return; }
  const matches = surahs.filter(s =>
    String(s.number) === q ||
    s.name.includes(searchInput.value.trim()) ||
    s.englishName.toLowerCase().includes(q)
  ).slice(0, 12);

  searchResults.innerHTML = matches.map(s => `
    <div class="searchRow" data-n="${s.number}">
      <div>
        <div class="t">${s.number}. ${s.name}</div>
        <div class="s">${s.englishName} — آيات: ${s.numberOfAyahs}</div>
      </div>
      <span class="kbd">↩</span>
    </div>
  `).join("") || `<div class="muted">لا نتائج.</div>`;
});

searchResults.addEventListener("click", (e) => {
  const row = e.target.closest("[data-n]");
  if (!row) return;
  const n = row.getAttribute("data-n");
  closeSearch();
  location.hash = `#/surah/${n}`;
});

async function ensureSurahs(){
  if (surahs.length) return surahs;
  try{
    subtitleEl.textContent = "تحميل البيانات…";
    surahs = await fetchSurahs();
    subtitleEl.textContent = "قراءة • استماع • مفضلة • راديو • سبحة";
    return surahs;
  }catch(e){
    subtitleEl.textContent = "تعذّر تحميل البيانات";
    toast("تعذّر تحميل قائمة السور", "تحقق من الإنترنت ثم أعد المحاولة.", "bad");
    throw e;
  }
}

// Router
function parseRoute(){
  const hash = location.hash || "#/";
  const [path] = hash.replace(/^#/, "").split("?");
  const parts = path.split("/").filter(Boolean);
  return { parts, hash };
}

async function render(){
  const { parts } = parseRoute();
  const s = storage.getSettings();
  applySettings();

  // update back button availability
  btnBack.style.opacity = (location.hash && location.hash !== "#/" && location.hash !== "") ? "1" : ".65";

  // pages
  if (parts.length === 0){
    const surahs = await ensureSurahs();
    const lastRead = storage.getLastRead();
    appEl.innerHTML = homePage({surahs, lastRead});
    return;
  }

  const page = parts[0];

  if (page === "surahs"){
    const surahs = await ensureSurahs();
    appEl.innerHTML = surahsPage({surahs});
    bindSurahsPage({surahs});
    return;
  }

  if (page === "surah" && parts[1]){
    const n = Number(parts[1]);
    if (!Number.isFinite(n) || n < 1 || n > 114){
      appEl.innerHTML = notFoundPage();
      return;
    }
    appEl.innerHTML = `<div class="card"><div class="section">تحميل السورة…</div></div>`;
    try{
      appEl.innerHTML = await surahPage({surahNumber:n});
      bindSurahPage({player});
    }catch(e){
      appEl.innerHTML = `<div class="card"><div class="section">
        <div style="font-weight:1000">تعذّر تحميل السورة</div>
        <div class="muted" style="margin-top:8px">قد يكون الاتصال ضعيفًا أو الإصدار غير متاح.</div>
        <div class="row" style="margin-top:12px">
          <a class="btn" href="#/surah/${n}">إعادة المحاولة</a>
          <a class="btn secondary" href="#/settings">الإعدادات</a>
          <a class="btn secondary" href="#/surahs">قائمة السور</a>
        </div>
      </div></div>`;
    }
    return;
  }

  if (page === "bookmarks"){
    appEl.innerHTML = bookmarksPage();
    bindBookmarksPage();
    return;
  }

  if (page === "settings"){
    appEl.innerHTML = settingsPage();
    bindSettingsPage({applySettings});
    return;
  }

  if (page === "radio"){
    appEl.innerHTML = radioPage({player});
    bindRadioPage({player});
    return;
  }

  if (page === "tasbeeh"){
    appEl.innerHTML = tasbeeh.renderPage();
    tasbeeh.bindPage();
    return;
  }

  appEl.innerHTML = notFoundPage();
}

window.addEventListener("hashchange", () => render());
window.addEventListener("route:refresh", () => render());

// initial
ensureSurahs().finally(() => render());

// helpful hint
setTimeout(() => {
  toast("اختصار", "افتح البحث السريع بـ Ctrl + K", "info");
}, 900);

// Media Session (basic)
if ("mediaSession" in navigator){
  navigator.mediaSession.setActionHandler("play", () => player.toggle());
  navigator.mediaSession.setActionHandler("pause", () => player.toggle());
  navigator.mediaSession.setActionHandler("previoustrack", () => player.prev());
  navigator.mediaSession.setActionHandler("nexttrack", () => player.next());
}
