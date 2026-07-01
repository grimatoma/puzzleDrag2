/* Shared behaviour for the proposal pages. Progressive-enhancement only —
 * every page reads fine with JS disabled. */
(function () {
  // Scroll-spy: highlight the in-page rail anchor for the section in view.
  var rail = document.querySelector("nav.rail");
  if (!rail) return;
  var anchors = [].slice.call(rail.querySelectorAll('a[href^="#"]'));
  if (!anchors.length) return;
  var map = {};
  anchors.forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    var el = document.getElementById(id);
    if (el) map[id] = a;
  });
  var ids = Object.keys(map);
  if (!ids.length || !("IntersectionObserver" in window)) return;
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        anchors.forEach(function (a) { a.classList.remove("active"); });
        var a = map[e.target.id];
        if (a) a.classList.add("active");
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );
  ids.forEach(function (id) { io.observe(document.getElementById(id)); });
})();
