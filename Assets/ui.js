// Quran Pro — small UI helpers

export function qs(sel, root=document){ return root.querySelector(sel); }
export function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

export function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

export function formatDate(ts){
  try{
    const d = new Date(ts);
    return d.toLocaleString("ar-EG", { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  }catch{ return ""; }
}

export function toast(title, body="", kind="info"){
  const wrap = qs("#toasts");
  const el = document.createElement("div");
  el.className = "toast";
  const icon = kind==="good" ? "✅" : kind==="bad" ? "⛔" : kind==="warn" ? "⚠️" : "ℹ️";
  el.innerHTML = `
    <div class="t">${icon} ${escapeHtml(title)}</div>
    ${body ? `<div class="s">${escapeHtml(body)}</div>` : ""}
  `;
  wrap.appendChild(el);
  setTimeout(() => el.style.opacity = "0", 3600);
  setTimeout(() => el.remove(), 4200);
}

export function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function setTheme(theme){
  document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
}

export function setQuranTypography({fontSize, lineHeight}){
  const r = document.documentElement;
  r.style.setProperty("--fz", `${fontSize}px`);
  r.style.setProperty("--lh", `${lineHeight}`);
}

export function smoothScrollTop(){
  window.scrollTo({top:0, behavior:"smooth"});
}
