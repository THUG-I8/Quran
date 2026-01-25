// Quran Pro — storage helpers (LocalStorage)
const NS = "quran_pro_v1::";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  localStorage.setItem(NS + key, JSON.stringify(value));
}

export const storage = {
  getSettings() {
    return read("settings", {
      theme: "dark",
      qFontSize: 20,
      qLineHeight: 2.1,
      showTranslation: false,
      translationEdition: "en.asad",
      showTafsir: false,
      tafsirEdition: "ar.muyassar",
      audioEdition: "ar.alafasy",
      radioUrl: "",
      radioFavorites: []
    });
  },
  setSettings(next) {
    write("settings", next);
  },

  getBookmarks() {
    // bookmarks: [{surah, ayahInSurah, globalAyah, createdAt}]
    return read("bookmarks", []);
  },
  setBookmarks(list) {
    write("bookmarks", list);
  },

  getLastRead() {
    // {surah, ayahInSurah, globalAyah}
    return read("lastRead", null);
  },
  setLastRead(obj) {
    write("lastRead", obj);
  },

  getTasbeeh() {
    // {count, dhikr, goal, history:[{count, dhikr, date}]}
    return read("tasbeeh", { count: 0, dhikr: "سبحان الله", goal: 33, history: [] });
  },
  setTasbeeh(obj) {
    write("tasbeeh", obj);
  }
};
