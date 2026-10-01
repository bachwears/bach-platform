// Inline, render-blocking on purpose: it must set .dark before first paint
// so there is no light flash. An explicit choice stored under localStorage
// "theme" ("light" | "dark") always wins. Without one, "system" follows the
// device theme live (POS / MGMT) and "light" stays light (storefront).
const code = (fallback: "system" | "light") =>
  `(function(){try{var m=matchMedia("(prefers-color-scheme: dark)");var c=document.documentElement.classList;var apply=function(){var t=null;try{t=localStorage.getItem("theme")}catch(e){}c.toggle("dark",t==="dark"||(${fallback === "system" ? "t!==\"light\"&&m.matches" : "false"}))};apply();m.addEventListener("change",apply)}catch(e){}})()`;

export function ThemeScript({ fallback = "system" }: { fallback?: "system" | "light" }) {
  return <script dangerouslySetInnerHTML={{ __html: code(fallback) }} />;
}
