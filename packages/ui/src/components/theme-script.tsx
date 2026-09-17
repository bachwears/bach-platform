// Inline, render-blocking on purpose: it must set .dark before first paint
// so there is no light flash. Follows the device theme live unless the user
// stored an explicit choice under localStorage "theme" ("light" | "dark").
const code = `(function(){try{var m=matchMedia("(prefers-color-scheme: dark)");var c=document.documentElement.classList;var apply=function(){var t=null;try{t=localStorage.getItem("theme")}catch(e){}c.toggle("dark",t==="dark"||(t!=="light"&&m.matches))};apply();m.addEventListener("change",apply)}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
