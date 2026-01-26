// Quran Pro — audio player (ayah-by-ayah) + radio
import { qs, toast } from "./ui.js";
import { storage } from "./storage.js";
import { fetchAyahAudio } from "./api.js";

export class AudioPlayer {
  constructor() {
    this.audio = qs("#audio");
    this.wrap = qs("#miniPlayer");
    this.btnPlay = qs("#mpPlay");
    this.btnPrev = qs("#mpPrev");
    this.btnNext = qs("#mpNext");
    this.btnClose = qs("#mpClose");
    this.titleEl = qs("#mpTitle");
    this.subEl = qs("#mpSub");

    this.queue = []; // [{globalAyah, title, sub}]
    this.idx = -1;
    this.isRadio = false;

    this._bind();
  }

  _bind(){
    this.btnPlay.addEventListener("click", () => this.toggle());
    this.btnPrev.addEventListener("click", () => this.prev());
    this.btnNext.addEventListener("click", () => this.next());
    this.btnClose.addEventListener("click", () => this.hide());

    this.audio.addEventListener("ended", () => {
      if (!this.isRadio) this.next(true);
    });
    this.audio.addEventListener("error", () => {
      toast("تعذّر تشغيل الصوت", "جرّب إصدار تلاوة آخر من الإعدادات أو تحقق من الاتصال.", "bad");
    });
  }

  show(){
    this.wrap.setAttribute("aria-hidden", "false");
  }
  hide(){
    this.audio.pause();
    this.audio.src = "";
    this.queue = [];
    this.idx = -1;
    this.isRadio = false;
    this.wrap.setAttribute("aria-hidden", "true");
    this.btnPlay.querySelector(".i").textContent = "▶";
    this.titleEl.textContent = "جاهز للاستماع";
    this.subEl.textContent = "اختر آية للاستماع";
  }

  async playAyah(globalAyah, meta){
    // meta: {title, sub, queue?:[] }
    this.isRadio = false;
    const settings = storage.getSettings();
    const audioEdition = settings.audioEdition || "ar.alafasy";

    // if queue provided, load it; else single
    if (meta?.queue?.length) {
      this.queue = meta.queue;
      this.idx = this.queue.findIndex(x => x.globalAyah === globalAyah);
      if (this.idx < 0) this.idx = 0;
    } else {
      this.queue = [{ globalAyah, title: meta?.title || "آية", sub: meta?.sub || "" }];
      this.idx = 0;
    }

    await this._loadAndPlay(this.queue[this.idx], audioEdition);
  }

  async _loadAndPlay(item, audioEdition){
    try{
      this.show();
      this.titleEl.textContent = item.title || "تلاوة";
      this.subEl.textContent = item.sub || "";
      this.btnPlay.querySelector(".i").textContent = "⏳";

      const data = await fetchAyahAudio(item.globalAyah, audioEdition);
      const src = data?.audio;
      if (!src) throw new Error("No audio URL");

      this.audio.src = src;
      await this.audio.play();
      this.btnPlay.querySelector(".i").textContent = "⏸";
    }catch(e){
      this.btnPlay.querySelector(".i").textContent = "▶";
      toast("فشل تشغيل التلاوة", "قد يكون الرابط غير متاح مؤقتًا. جرّب مرة أخرى.", "bad");
    }
  }

  async toggle(){
    if (this.wrap.getAttribute("aria-hidden") === "true") return;
    if (this.audio.paused) {
      try{ await this.audio.play(); this.btnPlay.querySelector(".i").textContent = "⏸"; }catch{}
    } else {
      this.audio.pause();
      this.btnPlay.querySelector(".i").textContent = "▶";
    }
  }

  async next(fromAuto=false){
    if (this.isRadio) return;
    if (this.queue.length <= 1) return;
    this.idx = (this.idx + 1) % this.queue.length;
    const settings = storage.getSettings();
    await this._loadAndPlay(this.queue[this.idx], settings.audioEdition || "ar.alafasy");
    if (fromAuto && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "playing";
    }
  }

  async prev(){
    if (this.isRadio) return;
    if (this.queue.length <= 1) return;
    this.idx = (this.idx - 1 + this.queue.length) % this.queue.length;
    const settings = storage.getSettings();
    await this._loadAndPlay(this.queue[this.idx], settings.audioEdition || "ar.alafasy");
  }

  async playRadio(url, title="راديو القرآن", sub="بث مباشر"){
    this.isRadio = true;
    this.queue = [];
    this.idx = -1;
    this.show();
    this.titleEl.textContent = title;
    this.subEl.textContent = sub;
    try{
      this.audio.src = url;
      await this.audio.play();
      this.btnPlay.querySelector(".i").textContent = "⏸";
    }catch(e){
      this.btnPlay.querySelector(".i").textContent = "▶";
      toast("تعذّر تشغيل الراديو", "قد يمنع المتصفح التشغيل التلقائي أو الرابط غير صالح.", "warn");
    }
  }
}
