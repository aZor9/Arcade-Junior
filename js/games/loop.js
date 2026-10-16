// Boucle d'animation des jeux d'arcade. Elle s'appuie sur requestAnimationFrame et ajoute un filet de sécurité :
// si le navigateur cesse de fournir des images alors que la page est visible (économie d'énergie, affichage
// particulier), une minuterie prend le relais. Quand la page est cachée, rien n'avance : la partie est en pause.
// L'heure transmise vient toujours de performance.now() : mélanger l'horodatage des images et celui de la minuterie
// pouvait donner un pas de temps négatif (la balle de l'Hélice traversait alors les étages).
export function startLoop(frame) {
  let stopped = false;
  let raf = 0;
  let timer = 0;
  let lastRaf = performance.now();
  const onRaf = () => {
    if (stopped) return;
    lastRaf = performance.now();
    frame(lastRaf);
    raf = requestAnimationFrame(onRaf);
  };
  const watchdog = () => {
    if (stopped) return;
    if (!document.hidden && performance.now() - lastRaf > 250) frame(performance.now());
    timer = setTimeout(watchdog, 16);
  };
  raf = requestAnimationFrame(onRaf);
  timer = setTimeout(watchdog, 16);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
  };
}
