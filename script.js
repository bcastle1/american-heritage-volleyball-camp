(function () {
  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const form = document.querySelector("[data-interest-form]");
  const status = document.querySelector("[data-form-status]");
  const adminDraftKey = "ahvcAdminDraft";

  const updateHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 16);
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scrollToHash = (hash, shouldPushState) => {
    const target = document.querySelector(hash);
    if (!target) return false;

    const headerOffset = target.id === "home" ? 0 : header.getBoundingClientRect().height + 18;
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset);

    window.scrollTo({
      top,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    if (shouldPushState) {
      window.history.pushState(null, "", hash);
    }

    return true;
  };

  const closeMenu = () => {
    nav.classList.remove("is-open");
    header.classList.remove("menu-active");
    document.body.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
  };

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  menuToggle.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    header.classList.toggle("menu-active", open);
    document.body.classList.toggle("menu-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      closeMenu();
    }
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const hash = link.getAttribute("href");
    if (hash.length <= 1) return;

    if (scrollToHash(hash, true)) {
      event.preventDefault();
      closeMenu();
    }
  });

  window.addEventListener("load", () => {
    if (window.location.hash) {
      window.setTimeout(() => scrollToHash(window.location.hash, false), 80);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      closeMenu();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const athlete = data.get("athlete").trim();
    const email = data.get("email").trim();
    const grade = data.get("grade");
    const experience = data.get("experience");
    const message = data.get("message").trim();

    const subject = encodeURIComponent("American Heritage Volleyball Camp interest");
    const body = encodeURIComponent(
      [
        "American Heritage Volleyball Camp interest",
        "",
        `Athlete: ${athlete}`,
        `Parent/guardian email: ${email}`,
        `Grade: ${grade}`,
        `Experience: ${experience}`,
        "",
        "Questions or goals:",
        message || "None provided",
      ].join("\n")
    );

    const mailto = `mailto:?subject=${subject}&body=${body}`;

    try {
      await navigator.clipboard.writeText(decodeURIComponent(body));
      status.textContent = "Your camp-interest note is copied and an email draft is opening.";
    } catch (error) {
      status.textContent = "An email draft is opening with your camp-interest note.";
    }

    window.location.href = mailto;
  });

  try {
    const draft = JSON.parse(localStorage.getItem(adminDraftKey) || "null");
    if (draft && typeof draft === "object") {
      document.querySelectorAll("[data-admin-field]").forEach((element) => {
        const value = draft[element.dataset.adminField];
        if (typeof value === "string" && value.trim()) {
          element.textContent = value.trim();
        }
      });
    }
  } catch (error) {
    localStorage.removeItem(adminDraftKey);
  }
})();
