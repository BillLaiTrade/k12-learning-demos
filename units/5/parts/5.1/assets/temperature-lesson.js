(() => {
  const navLinks = [...document.querySelectorAll(".route a[href^='#']")];
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => {
      if (link.getAttribute("href") === `#${entry.target.id}`) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
  }), {rootMargin:"-20% 0px -65% 0px"});
  navLinks.forEach(link => observer.observe(document.querySelector(link.getAttribute("href"))));
})();
