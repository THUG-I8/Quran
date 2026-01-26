// Quran Pro — routes / pages
import { escapeHtml, formatDate, toast, clamp, smoothScrollTop } from "./ui.js";
import { storage } from "./storage.js";
import { fetchSurahs, fetchSurahEditions } from "./api.js";

function cardWrap(inner){ return `<div class="card"><div class="section">${inner}</div></div>`; }

export function homePage({surahs, lastRead}) {
  const last = lastRead ? `
    <div class="item" onclick="location.hash='#/surah/${lastRead.surah}?a=${lastRead.ayahInSurah}'">
      <div class="item__title">تابع القراءة</div>
      <div class="item__sub">آخر موضع: سورة ${lastRead.surah} — آية ${lastRead.ayahInSurah}</div>
      <div class="item__meta">
        <span class="badge"><strong>فتح</strong> ↩</span>
        <span class="badge">يتم الحفظ تلقائيًا</span>
      </div>
    </div>
  ` : `
    <div class="muted">لا يوجد موضع محفوظ بعد. افتح أي سورة وسيتم حفظ آخر قراءة تلقائيًا.</div>
  `;

  return `
    ${cardWrap(`
      <div class="hstack" style="justify-content:space-between; flex-wrap:wrap; gap:10px">
        <div>
          <div style="font-weight:1000; font-size:20px">مرحبًا 👋</div>
          <div class="muted">موقع قرآن احترافي: قراءة، استماع آية بآية، مفضلة، راديو، سبحة، وإعدادات متقدمة.</div>
        </div>
        <div class="hstack">
          <a class="btn" href="#/surahs">ابدأ التصفح</a>
          <a class="btn secondary" href="#/radio">راديو القرآن</a>
        </div>
      </div>
      <hr class="sep"/>
      ${last}
    `)}

    ${cardWrap(`
      <div class="row">
        <div class="item" onclick="location.hash='#/surahs'">
          <div class="item__title">🗂️ قائمة السور</div>
          <div class="item__sub">تصفح السور — بحث سريع — معلومات النزول وعدد الآيات.</div>
        </div>
        <div class="item" onclick="location.hash='#/bookmarks'">
          <div class="item__title">⭐ المفضلة</div>
          <div class="item__sub">احفظ آياتك المفضلة وارجع لها بسرعة.</div>
        </div>
        <div class="item" onclick="location.hash='#/settings'">
          <div class="item__title">⚙️ الإعدادات</div>
          <div class="item__sub">خط المصحف — حجم الخط — التفسير/الترجمة — قارئ التلاوة — وغيرها.</div>
        </div>
      </div>
    `)}

    ${cardWrap(`
      <div class="hstack" style="justify-content:space-between; flex-wrap:wrap">
        <div>
          <div style="font-weight:1000">💡 نصيحة تشغيل</div>
          <div class="hint">للتشغيل المحلي بدون مشاكل، شغّل الموقع كسيرفر محلي (ليس file://). التعليمات في README.</div>
        </div>
        <span class="badge"><strong>عدد السور:</strong> ${surahs?.length || 114}</span>
      </div>
    `)}
  `;
}

export function surahsPage({surahs}) {
  const list = surahs.map(s => `
    <div class="item" onclick="location.hash='#/surah/${s.number}'" role="button" tabindex="0">
      <div class="item__title">${s.number}. ${escapeHtml(s.name)} <span class="muted">(${escapeHtml(s.englishName)})</span></div>
      <div class="item__sub">عدد الآيات: ${s.numberOfAyahs} — ${escapeHtml(s.revelationType)}</div>
      <div class="item__meta">
        <span class="badge">افتح ↩</span>
        <span class="badge"><strong>رقم:</strong> ${s.number}</span>
      </div>
    </div>
  `).join("");

  return `
    ${cardWrap(`
      <div class="qtools">
        <div>
          <div class="qtitle">🗂️ السور</div>
          <div class="qmeta">ابحث بالاسم أو الرقم (البحث هنا سريع داخل القائمة).</div>
        </div>
        <div class="field qsearch">
          <input id="surahFilter" placeholder="مثال: الكهف أو 18" />
        </div>
      </div>
      <div class="grid" id="surahGrid">${list}</div>
    `)}
  `;
}

export function bindSurahsPage({surahs}) {
  const input = document.getElementById("surahFilter");
  const grid = document.getElementById("surahGrid");
  if (!input || !grid) return;

  const render = (items) => {
    grid.innerHTML = items.map(s => `
      <div class="item" onclick="location.hash='#/surah/${s.number}'" role="button" tabindex="0">
        <div class="item__title">${s.number}. ${escapeHtml(s.name)} <span class="muted">(${escapeHtml(s.englishName)})</span></div>
        <div class="item__sub">عدد الآيات: ${s.numberOfAyahs} — ${escapeHtml(s.revelationType)}</div>
        <div class="item__meta">
          <span class="badge">افتح ↩</span>
          <span class="badge"><strong>رقم:</strong> ${s.number}</span>
        </div>
      </div>
    `).join("");
  };

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { render(surahs); return; }
    const items = surahs.filter(s =>
      String(s.number) === q ||
      s.name.includes(input.value.trim()) ||
      s.englishName.toLowerCase().includes(q)
    );
    render(items);
  });
}

function mkQueue(surahNumber, arabicAyahs){
  // queue for player: globalAyah from API = ayah.number (global)
  return arabicAyahs.map(a => ({
    globalAyah: a.number,
    title: `سورة ${surahNumber} — آية ${a.numberInSurah}`,
    sub: a.text.slice(0, 36).replace(/\s+/g," ") + (a.text.length>36 ? "…" : "")
  }));
}

export async function surahPage({surahNumber}) {
  const settings = storage.getSettings();
  const editions = ["quran-uthmani"];

  if (settings.showTranslation) editions.push(settings.translationEdition || "en.asad");
  if (settings.showTafsir) editions.push(settings.tafsirEdition || "ar.muyassar");

  const data = await fetchSurahEditions(surahNumber, editions);
  // data is array of editions for the same surah
  const arabic = data.find(d => d.edition?.identifier === "quran-uthmani") || data[0];
  const translation = settings.showTranslation ? data.find(d => d.edition?.identifier === settings.translationEdition) : null;
  const tafsir = settings.showTafsir ? data.find(d => d.edition?.identifier === settings.tafsirEdition) : null;

  const surahName = arabic?.englishName ? `${arabic.name}` : `سورة رقم ${surahNumber}`;
  const meta = `${escapeHtml(arabic?.englishName || "")} — ${arabic?.revelationType || ""} — عدد الآيات: ${arabic?.numberOfAyahs || ""}`;

  const last = storage.getLastRead();
  const jumpAyah = Number(new URLSearchParams(location.hash.split("?")[1] || "").get("a") || 0);

  const queue = mkQueue(surahNumber, arabic.ayahs);

  const ayahCards = arabic.ayahs.map((a, idx) => {
    const t = translation?.ayahs?.[idx]?.text;
    const f = tafsir?.ayahs?.[idx]?.text;
    const extra = (t || f) ? `
      <div class="ayah__extra">
        ${t ? `<div><strong>الترجمة:</strong> ${escapeHtml(t)}</div>` : ""}
        ${f ? `<div style="margin-top:8px"><strong>التفسير:</strong> ${escapeHtml(f)}</div>` : ""}
      </div>` : "";

    const isBookmarked = storage.getBookmarks().some(b => b.globalAyah === a.number);
    const bmLabel = isBookmarked ? "★ محفوظة" : "☆ حفظ";

    return `
      <article class="ayah" id="a${a.numberInSurah}">
        <div class="ayah__top">
          <div class="ayah__num">
            <span class="badge"><strong>آية</strong> ${a.numberInSurah}</span>
            <span class="badge"><strong>جُزء</strong> ${a.juz}</span>
            <span class="badge"><strong>حزب</strong> ${a.hizbQuarter}</span>
          </div>
          <div class="ayah__actions">
            <button class="pill" data-act="play" data-global="${a.number}" data-idx="${idx}">▶ استماع</button>
            <button class="pill" data-act="copy" data-text="${escapeHtml(a.text)}">⧉ نسخ</button>
            <button class="pill" data-act="bookmark" data-global="${a.number}" data-in="${a.numberInSurah}">${bmLabel}</button>
            <button class="pill" data-act="share" data-in="${a.numberInSurah}">↗ مشاركة</button>
          </div>
        </div>
        <div class="ayah__text">${escapeHtml(a.text)}</div>
        ${extra}
      </article>
    `;
  }).join("");

  const tools = `
    <div class="qtools">
      <div>
        <div class="qtitle">📖 ${escapeHtml(surahName)}</div>
        <div class="qmeta">${meta}</div>
      </div>
      <div class="row" style="flex:1; justify-content:flex-end">
        <div class="field qsearch">
          <label>بحث داخل الآيات (ضمن هذه السورة)</label>
          <input id="ayahFilter" placeholder="اكتب كلمة للبحث داخل السورة..." />
        </div>
      </div>
    </div>
    <div class="row" style="margin-top:8px">
      <button class="btn" id="btnPlayAll">تشغيل آية بآية</button>
      <button class="btn secondary" id="btnGoTop">أعلى الصفحة</button>
      <button class="btn secondary" id="btnGoLast">آخر موضع</button>
      <a class="btn secondary" href="#/surahs">رجوع للسور</a>
    </div>
  `;

  const optionsNote = `
    <div class="hint" style="margin-top:10px">
      • يمكنك تشغيل التلاوة آية بآية (من زر “تشغيل آية بآية”).<br/>
      • لتفعيل التفسير/الترجمة أو تغيير القارئ: اذهب إلى الإعدادات.
    </div>
  `;

  // store page-level data on window for binding (queue + arabic)
  window.__SURAH_PAGE__ = { queue, surahNumber, jumpAyah, last };

  return `
    <div class="card"><div class="qwrap">
      ${tools}
      ${optionsNote}
      <hr class="sep"/>
      <div id="ayahList">${ayahCards}</div>
    </div></div>
  `;
}

export function bindSurahPage({player}) {
  const state = window.__SURAH_PAGE__;
  if (!state) return;

  // Jump to specific ayah if provided
  if (state.jumpAyah){
    setTimeout(() => {
      const el = document.getElementById("a" + state.jumpAyah);
      el?.scrollIntoView({behavior:"smooth", block:"start"});
    }, 50);
  }

  const ayahFilter = document.getElementById("ayahFilter");
  const list = document.getElementById("ayahList");
  if (ayahFilter && list){
    ayahFilter.addEventListener("input", () => {
      const q = ayahFilter.value.trim();
      const cards = Array.from(list.querySelectorAll(".ayah"));
      if (!q){ cards.forEach(c => c.style.display = ""); return; }
      cards.forEach(c => {
        const txt = c.innerText || "";
        c.style.display = txt.includes(q) ? "" : "none";
      });
    });
  }

  document.getElementById("btnGoTop")?.addEventListener("click", smoothScrollTop);
  document.getElementById("btnGoLast")?.addEventListener("click", () => {
    const last = storage.getLastRead();
    if (!last || last.surah !== state.surahNumber){ toast("لا يوجد موضع داخل هذه السورة"); return; }
    const el = document.getElementById("a" + last.ayahInSurah);
    el?.scrollIntoView({behavior:"smooth", block:"center"});
  });

  // Play all
  document.getElementById("btnPlayAll")?.addEventListener("click", async () => {
    await player.playAyah(state.queue[0].globalAyah, { queue: state.queue, title: state.queue[0].title, sub: state.queue[0].sub });
  });

  // Delegate ayah actions
  document.addEventListener("click", async (e) => {
    const btn = e.target?.closest?.("[data-act]");
    if (!btn) return;

    const act = btn.getAttribute("data-act");
    if (act === "play") {
      const globalAyah = Number(btn.getAttribute("data-global"));
      const idx = Number(btn.getAttribute("data-idx"));
      const item = state.queue[idx] || state.queue[0];
      await player.playAyah(globalAyah, { queue: state.queue, title: item.title, sub: item.sub });
      return;
    }

    if (act === "copy") {
      const text = btn.getAttribute("data-text") || "";
      try{
        await navigator.clipboard.writeText(text);
        toast("تم النسخ", "تم نسخ نص الآية إلى الحافظة.", "good");
      }catch{
        toast("تعذر النسخ", "المتصفح منع النسخ. جرّب يدويًا.", "warn");
      }
      return;
    }

    if (act === "bookmark") {
      const globalAyah = Number(btn.getAttribute("data-global"));
      const ayahInSurah = Number(btn.getAttribute("data-in"));
      const list = storage.getBookmarks();
      const exists = list.some(b => b.globalAyah === globalAyah);
      const next = exists ? list.filter(b => b.globalAyah !== globalAyah) : [{ surah: state.surahNumber, ayahInSurah, globalAyah, createdAt: Date.now() }, ...list];
      storage.setBookmarks(next);
      btn.textContent = exists ? "☆ حفظ" : "★ محفوظة";
      toast(exists ? "تم الإزالة من المفضلة" : "تمت الإضافة للمفضلة", `سورة ${state.surahNumber} — آية ${ayahInSurah}`, "good");
      return;
    }

    if (act === "share") {
      const ayahInSurah = Number(btn.getAttribute("data-in"));
      const url = `${location.origin}${location.pathname}#/surah/${state.surahNumber}?a=${ayahInSurah}`;
      try{
        await navigator.share({ title: "آية من القرآن", text: `سورة ${state.surahNumber} — آية ${ayahInSurah}`, url });
      }catch{
        await navigator.clipboard.writeText(url);
        toast("تم نسخ الرابط", "شارك الرابط الآن.", "good");
      }
      return;
    }
  }, { passive:true });

  // Save last read on scroll (throttled)
  let t = null;
  window.addEventListener("scroll", () => {
    if (t) return;
    t = setTimeout(() => {
      t = null;
      const ayahs = Array.from(document.querySelectorAll(".ayah"));
      // find first visible
      const top = window.scrollY + 120;
      let current = null;
      for (const a of ayahs){
        const r = a.getBoundingClientRect();
        const y = r.top + window.scrollY;
        if (y >= top) { current = a; break; }
      }
      if (!current) current = ayahs[ayahs.length-1];
      const id = current?.id?.replace("a","");
      const ayahInSurah = Number(id || 1);
      // global ayah not stored here (we can parse from play button), so store surah + ayah
      const playBtn = current?.querySelector?.('[data-act="play"]');
      const globalAyah = Number(playBtn?.getAttribute("data-global") || 0);
      if (ayahInSurah){
        storage.setLastRead({ surah: state.surahNumber, ayahInSurah, globalAyah });
      }
    }, 250);
  }, { passive:true });
}

export function bookmarksPage() {
  const bms = storage.getBookmarks();
  const last = storage.getLastRead();
  const list = bms.length ? bms.map(b => `
    <div class="item">
      <div class="item__title">سورة ${b.surah} — آية ${b.ayahInSurah}</div>
      <div class="item__sub">أُضيفت: ${escapeHtml(formatDate(b.createdAt))}</div>
      <div class="item__meta">
        <a class="btn small" href="#/surah/${b.surah}?a=${b.ayahInSurah}">فتح</a>
        <button class="btn small secondary" data-remove="${b.globalAyah}">إزالة</button>
      </div>
    </div>
  `).join("") : `<div class="muted">لا توجد آيات محفوظة بعد.</div>`;

  const head = `
    <div class="hstack" style="justify-content:space-between; flex-wrap:wrap; gap:10px">
      <div>
        <div style="font-weight:1000; font-size:18px">⭐ المفضلة</div>
        <div class="muted">آيات محفوظة على جهازك فقط.</div>
      </div>
      ${last ? `<a class="btn secondary" href="#/surah/${last.surah}?a=${last.ayahInSurah}">تابع القراءة</a>` : ""}
    </div>
  `;

  return cardWrap(`${head}<hr class="sep"/><div class="grid" id="bmGrid">${list}</div>
  <hr class="sep"/>
  <div class="row">
    <button class="btn danger" id="bmClear">مسح الكل</button>
    <a class="btn secondary" href="#/surahs">تصفح السور</a>
  </div>`);
}

export function bindBookmarksPage(){
  const grid = document.getElementById("bmGrid");
  grid?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    const global = Number(btn.getAttribute("data-remove"));
    storage.setBookmarks(storage.getBookmarks().filter(b => b.globalAyah !== global));
    toast("تمت الإزالة", "تمت إزالة الآية من المفضلة.", "good");
    window.dispatchEvent(new Event("route:refresh"));
  });

  document.getElementById("bmClear")?.addEventListener("click", () => {
    storage.setBookmarks([]);
    toast("تم المسح", "تم مسح المفضلة.", "warn");
    window.dispatchEvent(new Event("route:refresh"));
  });
}

export function settingsPage() {
  const s = storage.getSettings();
  const theme = s.theme || "dark";
  return `
    ${cardWrap(`
      <div class="hstack" style="justify-content:space-between; flex-wrap:wrap; gap:10px">
        <div>
          <div style="font-weight:1000; font-size:18px">⚙️ الإعدادات</div>
          <div class="muted">خصص تجربة القراءة والاستماع.</div>
        </div>
        <span class="badge"><strong>الحفظ:</strong> تلقائي على جهازك</span>
      </div>

      <hr class="sep"/>

      <div class="row">
        <div class="field">
          <label>المظهر</label>
          <select id="setTheme">
            <option value="dark" ${theme==="dark"?"selected":""}>ليلي</option>
            <option value="light" ${theme==="light"?"selected":""}>نهاري</option>
          </select>
          <div class="hint">يمكن التبديل أيضًا من زر ☾ أعلى الصفحة.</div>
        </div>

        <div class="field">
          <label>حجم خط المصحف</label>
          <input id="setFz" type="number" min="16" max="40" value="${s.qFontSize || 20}" />
          <div class="hint">النطاق المقترح: 18–30.</div>
        </div>

        <div class="field">
          <label>ارتفاع السطر</label>
          <input id="setLh" type="number" step="0.1" min="1.4" max="3.2" value="${s.qLineHeight || 2.1}" />
          <div class="hint">لراحة القراءة على الموبايل جرّب 2.0–2.4.</div>
        </div>
      </div>

      <hr class="sep"/>

      <div class="row">
        <div class="field">
          <label>إظهار ترجمة</label>
          <select id="setShowTr">
            <option value="no" ${!s.showTranslation?"selected":""}>لا</option>
            <option value="yes" ${s.showTranslation?"selected":""}>نعم</option>
          </select>
          <div class="hint">الترجمة تظهر تحت الآية.</div>
        </div>

        <div class="field">
          <label>إصدار الترجمة</label>
          <select id="setTrEdition">
            <option value="en.asad" ${s.translationEdition==="en.asad"?"selected":""}>English — Asad</option>
            <option value="en.sahih" ${s.translationEdition==="en.sahih"?"selected":""}>English — Sahih Intl</option>
            <option value="fr.hamidullah" ${s.translationEdition==="fr.hamidullah"?"selected":""}>French — Hamidullah</option>
            <option value="tr.diyanet" ${s.translationEdition==="tr.diyanet"?"selected":""}>Turkish — Diyanet</option>
          </select>
          <div class="hint">يمكن إضافة إصدارات أخرى من API لاحقًا.</div>
        </div>

        <div class="field">
          <label>إظهار تفسير عربي</label>
          <select id="setShowTf">
            <option value="no" ${!s.showTafsir?"selected":""}>لا</option>
            <option value="yes" ${s.showTafsir?"selected":""}>نعم</option>
          </select>
          <div class="hint">التفسير يظهر تحت الآية (قد يكون طويلًا).</div>
        </div>

        <div class="field">
          <label>إصدار التفسير</label>
          <select id="setTfEdition">
            <option value="ar.muyassar" ${s.tafsirEdition==="ar.muyassar"?"selected":""}>العربي — الميسر</option>
            <option value="ar.jalalayn" ${s.tafsirEdition==="ar.jalalayn"?"selected":""}>العربي — الجلالين</option>
          </select>
          <div class="hint">قد تختلف الإتاحة حسب الـ API.</div>
        </div>
      </div>

      <hr class="sep"/>

      <div class="row">
        <div class="field">
          <label>قارئ التلاوة (آية بآية)</label>
          <select id="setAudioEdition">
            <option value="ar.alafasy" ${s.audioEdition==="ar.alafasy"?"selected":""}>المعصراوي؟ (Alafasy)</option>
            <option value="ar.abdurrahmaansudais" ${s.audioEdition==="ar.abdurrahmaansudais"?"selected":""}>السديس</option>
            <option value="ar.husary" ${s.audioEdition==="ar.husary"?"selected":""}>الحصري</option>
          </select>
          <div class="hint">إذا لم يعمل قارئ، جرّب قارئًا آخر.</div>
        </div>

        <div class="field">
          <label>رابط راديو القرآن (بث مباشر)</label>
          <input id="setRadioUrl" placeholder="الصق رابط بث مباشر mp3/aac" value="${escapeHtml(s.radioUrl || "")}" />
          <div class="hint">الرابط يختلف حسب المحطة — أفضل طريقة: جرّبه في VLC أولاً.</div>
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <button class="btn good" id="saveSettings">حفظ</button>
        <button class="btn secondary" id="resetSettings">إعادة ضبط</button>
        <a class="btn secondary" href="#/">رجوع</a>
      </div>
    `)}
  `;
}

export function bindSettingsPage({applySettings}){
  const s = storage.getSettings();

  const get = (id) => document.getElementById(id);

  get("saveSettings")?.addEventListener("click", () => {
    const next = {
      ...s,
      theme: get("setTheme").value,
      qFontSize: clamp(Number(get("setFz").value), 16, 40),
      qLineHeight: clamp(Number(get("setLh").value), 1.4, 3.2),
      showTranslation: get("setShowTr").value === "yes",
      translationEdition: get("setTrEdition").value,
      showTafsir: get("setShowTf").value === "yes",
      tafsirEdition: get("setTfEdition").value,
      audioEdition: get("setAudioEdition").value,
      radioUrl: (get("setRadioUrl").value || "").trim()
    };
    storage.setSettings(next);
    applySettings();
    toast("تم الحفظ", "تم تطبيق الإعدادات.", "good");
  });

  get("resetSettings")?.addEventListener("click", () => {
    storage.setSettings(storage.getSettings()); // no-op if already default; kept for future
    localStorage.removeItem("quran_pro_v1::settings");
    applySettings();
    toast("تمت الإعادة", "تمت إعادة ضبط الإعدادات للوضع الافتراضي.", "warn");
    window.dispatchEvent(new Event("route:refresh"));
  });
}

export function radioPage({player}){
  const s = storage.getSettings();
  const favs = s.radioFavorites || [];
  const favHtml = favs.length ? favs.map((f, i) => `
    <div class="item">
      <div class="item__title">📻 ${escapeHtml(f.name || "محطة")}</div>
      <div class="item__sub">${escapeHtml(f.url)}</div>
      <div class="item__meta">
        <button class="btn small" data-play="${i}">تشغيل</button>
        <button class="btn small secondary" data-use="${i}">تعيين كرابط افتراضي</button>
        <button class="btn small danger" data-del="${i}">حذف</button>
      </div>
    </div>
  `).join("") : `<div class="muted">لا توجد محطات محفوظة بعد.</div>`;

  return `
    ${cardWrap(`
      <div class="hstack" style="justify-content:space-between; flex-wrap:wrap; gap:10px">
        <div>
          <div style="font-weight:1000; font-size:18px">📻 راديو القرآن 24 ساعة</div>
          <div class="muted">الصق رابط بث مباشر (mp3/aac) لمحطة قرآن موثوقة.</div>
        </div>
        <button class="btn secondary" id="radioStop">إيقاف</button>
      </div>

      <hr class="sep"/>

      <div class="field">
        <label>الرابط الحالي</label>
        <input id="radioUrl" placeholder="الصق رابط stream URL" value="${escapeHtml(s.radioUrl || "")}" />
        <div class="hint">لو المتصفح منع التشغيل التلقائي، اضغط تشغيل يدويًا.</div>
      </div>

      <div class="row" style="margin-top:10px">
        <button class="btn" id="radioPlay">تشغيل</button>
        <button class="btn secondary" id="radioSaveDefault">حفظ كرابط افتراضي</button>
      </div>

      <hr class="sep"/>
      <div style="font-weight:1000; margin-bottom:8px">المفضلة</div>

      <div class="row" style="margin-bottom:10px">
        <input id="favName" placeholder="اسم المحطة (اختياري)" />
        <button class="btn secondary" id="favAdd">إضافة للمفضلة</button>
      </div>

      <div class="grid" id="favGrid">${favHtml}</div>

      <hr class="sep"/>
      <div class="hint">
        نصيحة: جرّب الرابط في تطبيق VLC أولاً. بعض المحطات تغيّر روابطها أحيانًا.
      </div>
    `)}
  `;
}

export function bindRadioPage({player}){
  const input = document.getElementById("radioUrl");
  const name = document.getElementById("favName");
  const grid = document.getElementById("favGrid");

  document.getElementById("radioPlay")?.addEventListener("click", async () => {
    const url = (input.value || "").trim();
    if (!url) { toast("ضع رابط بث أولاً"); return; }
    await player.playRadio(url, "راديو القرآن", "بث مباشر 24 ساعة");
  });

  document.getElementById("radioStop")?.addEventListener("click", () => player.hide());

  document.getElementById("radioSaveDefault")?.addEventListener("click", () => {
    const s = storage.getSettings();
    s.radioUrl = (input.value || "").trim();
    storage.setSettings(s);
    toast("تم الحفظ", "تم حفظ الرابط كرابط افتراضي.", "good");
  });

  document.getElementById("favAdd")?.addEventListener("click", () => {
    const url = (input.value || "").trim();
    if (!url) { toast("ضع رابط بث أولاً"); return; }
    const s = storage.getSettings();
    const favs = s.radioFavorites || [];
    favs.unshift({ name: (name.value || "").trim() || "محطة قرآن", url });
    s.radioFavorites = favs.slice(0, 20);
    storage.setSettings(s);
    toast("تمت الإضافة", "تم حفظ المحطة في المفضلة.", "good");
    window.dispatchEvent(new Event("route:refresh"));
  });

  grid?.addEventListener("click", async (e) => {
    const p = e.target.closest("[data-play],[data-use],[data-del]");
    if (!p) return;
    const s = storage.getSettings();
    const favs = s.radioFavorites || [];
    const idx = Number(p.getAttribute("data-play") ?? p.getAttribute("data-use") ?? p.getAttribute("data-del"));
    const item = favs[idx];
    if (!item) return;

    if (p.hasAttribute("data-play")){
      await player.playRadio(item.url, item.name || "محطة قرآن", "بث مباشر");
      return;
    }
    if (p.hasAttribute("data-use")){
      s.radioUrl = item.url;
      storage.setSettings(s);
      toast("تم التعيين", "تم تعيينه كرابط افتراضي.", "good");
      window.dispatchEvent(new Event("route:refresh"));
      return;
    }
    if (p.hasAttribute("data-del")){
      s.radioFavorites = favs.filter((_,i)=>i!==idx);
      storage.setSettings(s);
      toast("تم الحذف", "تم حذف المحطة.", "warn");
      window.dispatchEvent(new Event("route:refresh"));
      return;
    }
  });
}

export function notFoundPage(){
  return cardWrap(`
    <div style="font-weight:1000; font-size:18px">الصفحة غير موجودة</div>
    <div class="muted" style="margin-top:8px">ارجع للرئيسية.</div>
    <div style="margin-top:12px">
      <a class="btn" href="#/">الرئيسية</a>
    </div>
  `);
}
