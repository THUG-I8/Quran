// Quran Pro — API layer (AlQuran.cloud)
// Docs: https://alquran.cloud/api
const API_BASE = "https://api.alquran.cloud/v1";

async function apiGet(path) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${txt || url}`);
  }
  const json = await res.json();
  if (!json || json.status !== "OK") {
    throw new Error(`API not OK: ${JSON.stringify(json)}`);
  }
  return json.data;
}

// Surahs list
export async function fetchSurahs() {
  return apiGet("/surah");
}

// Get surah in specific edition (arabic / translation / tafsir)
export async function fetchSurahEdition(surahNumber, edition) {
  return apiGet(`/surah/${surahNumber}/${encodeURIComponent(edition)}`);
}

// Fetch multiple editions for surah in one call
export async function fetchSurahEditions(surahNumber, editions) {
  const list = editions.map(encodeURIComponent).join(",");
  return apiGet(`/surah/${surahNumber}/editions/${list}`);
}

// Get ayah audio URL (edition includes audio URL)
export async function fetchAyahAudio(globalAyahNumber, audioEdition="ar.alafasy") {
  // globalAyahNumber = Quran-wide ayah index (1..6236)
  return apiGet(`/ayah/${globalAyahNumber}/${encodeURIComponent(audioEdition)}`);
}

// Get meta info (includes sajda, juz, hizbQuarter, etc.)
export async function fetchAyahMeta(globalAyahNumber) {
  return apiGet(`/ayah/${globalAyahNumber}`);
}

// Quran text for one ayah (for fallback)
export async function fetchAyahText(globalAyahNumber, edition="quran-uthmani") {
  return apiGet(`/ayah/${globalAyahNumber}/${encodeURIComponent(edition)}`);
}
