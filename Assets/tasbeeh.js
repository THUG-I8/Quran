// Quran Pro — Tasbeeh logic + floating FAB
import { qs, toast, escapeHtml } from "./ui.js";
import { storage } from "./storage.js";

export class Tasbeeh {
  constructor() {
    this.fab = qs("#fabTasbeeh");
    this.fabCount = qs("#fabCount");
    this.state = storage.getTasbeeh();
    this._syncFab();
    this._bind();
  }

  _bind(){
    this.fab.addEventListener("click", () => this.inc());
    this.fab.addEventListener("contextmenu", (e) => { e.preventDefault(); window.location.hash = "#/tasbeeh"; });
    // Keyboard: long-press not available, so use right click or go to page.
  }

  _syncFab(){
    this.fabCount.textContent = this.state.count;
  }

  inc(){
    this.state.count += 1;
    storage.setTasbeeh(this.state);
    this._syncFab();
    if (navigator.vibrate) navigator.vibrate(15);

    if (this.state.goal && this.state.count % this.state.goal === 0){
      toast("🎉 وصلت للهدف", `تم إكمال ${this.state.goal} من: ${this.state.dhikr}`, "good");
      if (navigator.vibrate) navigator.vibrate([25, 30, 25]);
    }
  }

  reset(){
    const prev = this.state.count;
    if (prev > 0){
      this.state.history.unshift({ count: prev, dhikr: this.state.dhikr, date: Date.now() });
      this.state.history = this.state.history.slice(0, 25);
    }
    this.state.count = 0;
    storage.setTasbeeh(this.state);
    this._syncFab();
  }

  setDhikr(text){
    this.state.dhikr = text || "سبحان الله";
    storage.setTasbeeh(this.state);
  }

  setGoal(goal){
    const g = Number(goal);
    this.state.goal = Number.isFinite(g) && g > 0 ? g : 0;
    storage.setTasbeeh(this.state);
  }

  getState(){
    return storage.getTasbeeh();
  }

  renderPage(){
    const s = storage.getTasbeeh();
    const rows = s.history.length ? s.history.map(h => {
      const d = new Date(h.date).toLocaleString("ar-EG", {year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"});
      return `<div class="item">
        <div class="item__title">${escapeHtml(h.dhikr)} — <span class="badge"><strong>${h.count}</strong></span></div>
        <div class="item__sub">${escapeHtml(d)}</div>
      </div>`;
    }).join("") : `<div class="muted">لا يوجد سجل بعد.</div>`;

    return `
      <div class="card"><div class="section">
        <div class="hstack" style="justify-content:space-between; flex-wrap:wrap; gap:10px">
          <div>
            <div style="font-weight:1000; font-size:18px">📿 السبحة الإلكترونية</div>
            <div class="muted">اضغط زر السبحة العائم للعدّ سريعًا.</div>
          </div>
          <div class="badge"><strong>العدد الحالي:</strong> ${s.count}</div>
        </div>

        <hr class="sep"/>

        <div class="row">
          <div class="field">
            <label>الذكر</label>
            <input id="dhikrInput" value="${escapeHtml(s.dhikr)}" />
            <div class="hint">مثال: سبحان الله • الحمد لله • الله أكبر • لا إله إلا الله</div>
          </div>
          <div class="field">
            <label>الهدف (تنبيه كل كم مرة؟)</label>
            <input id="goalInput" type="number" min="0" value="${s.goal || 0}" />
            <div class="hint">مثال: 33 أو 100. ضع 0 لإلغاء التنبيه.</div>
          </div>
        </div>

        <div class="row" style="margin-top:10px">
          <button class="btn good" id="btnTasbeehPlus">+1</button>
          <button class="btn secondary" id="btnTasbeehReset">تصفير + حفظ في السجل</button>
          <button class="btn danger" id="btnTasbeehClear">مسح السجل</button>
        </div>

        <hr class="sep"/>
        <div style="font-weight:1000; margin-bottom:8px">السجل</div>
        <div class="grid">${rows}</div>
      </div></div>
    `;
  }

  bindPage(){
    const dh = qs("#dhikrInput");
    const goal = qs("#goalInput");
    const plus = qs("#btnTasbeehPlus");
    const reset = qs("#btnTasbeehReset");
    const clear = qs("#btnTasbeehClear");

    dh?.addEventListener("input", () => this.setDhikr(dh.value.trim()));
    goal?.addEventListener("input", () => this.setGoal(goal.value));
    plus?.addEventListener("click", () => this.inc());
    reset?.addEventListener("click", () => { this.reset(); toast("تم التصفير", "تم حفظ العدد السابق في السجل.", "good"); window.dispatchEvent(new Event("route:refresh")); });
    clear?.addEventListener("click", () => {
      const s = storage.getTasbeeh();
      s.history = [];
      storage.setTasbeeh(s);
      toast("تم المسح", "تم مسح سجل السبحة.", "warn");
      window.dispatchEvent(new Event("route:refresh"));
    });
  }
}
