export type AppTheme = "light" | "dark";
export const THEME_COOKIE = "mockmeai-theme";
export const THEME_STORAGE_KEY = "mockmeai:theme";
export const THEME_EVENT = "mockmeai-theme-change";
export function parseTheme(value: unknown): AppTheme | undefined {
  return value === "light" || value === "dark" ? value : undefined;
}
export function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* Storage may be disabled. */
  }
  try {
    document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {
    /* The in-memory theme still works when cookies are blocked. */
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}
/** Runs in the head before body paint. Cookie wins; localStorage recovers blocked/missing cookies. */
export const THEME_BOOTSTRAP = `(()=>{let t=document.documentElement.dataset.theme==='dark'?'dark':'light';try{const s=localStorage.getItem('${THEME_STORAGE_KEY}');if(s==='dark'||s==='light')t=s}catch{}try{const c=document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith('${THEME_COOKIE}='));const v=c?.slice('${THEME_COOKIE}='.length);if(v==='dark'||v==='light')t=v}catch{}document.documentElement.dataset.theme=t;try{localStorage.setItem('${THEME_STORAGE_KEY}',t)}catch{}try{document.cookie='${THEME_COOKIE}='+t+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'')}catch{}})();`;
