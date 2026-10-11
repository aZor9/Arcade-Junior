// Chargé de façon synchrone dans <head> pour appliquer le thème avant le premier rendu (évite le flash).
(function () {
  try {
    var s = JSON.parse(localStorage.getItem('aj:settings') || '{}');
    if (s.theme === 'light' || s.theme === 'dark') document.documentElement.dataset.theme = s.theme;
  } catch (e) { /* stockage indisponible : thème automatique */ }
})();
