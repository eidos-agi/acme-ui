// Shared shell-autoplay glue (RETROACTIVE). The shell posts "eidos-play"
// when its countdown veil lifts. If the page defines window.VIGNETTE, that
// runs instead of a plain send: preroll the prior conversation instantly,
// then demonstrate only this version's addition.
if (new URLSearchParams(location.search).has("autoplay")) {
  let played = false;
  const play = () => {
    if (played) return;
    played = true;
    if (window.VIGNETTE) { window.VIGNETTE(); return; }
    const b = document.getElementById("btn") || document.getElementById("send");
    if (b && !b.disabled) b.click();
  };
  window.addEventListener("message", (e) => { if (e.data === "eidos-play") play(); });
  if (top === self) setTimeout(play, 800);
}
