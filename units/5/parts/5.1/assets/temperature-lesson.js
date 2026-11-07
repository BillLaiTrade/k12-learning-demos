(() => {
  const navLinks = [...document.querySelectorAll(".route a[href^='#']")];
  navLinks.filter(link => !link.classList.contains("quiz-nav")).forEach(link => {
    const section = document.querySelector(link.getAttribute("href"));
    const heading = section && document.getElementById(section.getAttribute("aria-labelledby"));
    if (heading) link.querySelector("span").textContent = heading.textContent.trim();
  });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => {
      if (link.getAttribute("href") === `#${entry.target.id}`) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
  }), {rootMargin:"-20% 0px -65% 0px"});
  navLinks.forEach(link => observer.observe(document.querySelector(link.getAttribute("href"))));
})();
