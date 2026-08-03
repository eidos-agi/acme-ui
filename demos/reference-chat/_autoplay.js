// Shared shell-autoplay glue (RETROACTIVE). The shell posts "eidos-play"
// when its countdown veil lifts; standalone pages with ?autoplay=1 play
// after a short delay. Works with any version: finds #btn or #send.
if (new URLSearchParams(location.search).has("autoplay")) {
  let played = false;
  const play = () => {
    if (played) return;
    played = true;
    const b = document.getElementById("btn") || document.getElementById("send");
    if (b && !b.disabled) b.click();
  };
  window.addEventListener("message", (e) => { if (e.data === "eidos-play") play(); });
  if (top === self) setTimeout(play, 800);
}
