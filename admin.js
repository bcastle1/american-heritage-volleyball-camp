(function () {
  const code = "Patriot";
  const storageKey = "ahvcAdminDraft";
  const authKey = "ahvcAdminUnlocked";

  const defaults = {
    dates: "TBD",
    location: "American Fork, Utah",
    athletes: "Middle school & high school",
    registrationStatus: "Interest List",
    heroSubhead: "American Fork, Utah volleyball training for middle school and high school boys and girls.",
    announcement: "Train hard. Lead well. Honor always.",
    coachSummary:
      "Together, Brad and Erik Castle bring college-level playing backgrounds, semi-professional USVBA experience, and current American Heritage varsity and JV coaching leadership. Their shared approach is technical, competitive, and values-driven: strong fundamentals, smart reads, disciplined reps, and team-first leadership.",
    notes: "",
  };

  const lock = document.querySelector("[data-admin-lock]");
  const dashboard = document.querySelector("[data-admin-dashboard]");
  const authForm = document.querySelector("[data-auth-form]");
  const adminForm = document.querySelector("[data-admin-form]");
  const authStatus = document.querySelector("[data-auth-status]");
  const adminStatus = document.querySelector("[data-admin-status]");

  const getDraft = () => {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || "{}") };
    } catch (error) {
      localStorage.removeItem(storageKey);
      return { ...defaults };
    }
  };

  const updatePreviews = (values) => {
    document.querySelectorAll("[data-preview]").forEach((element) => {
      const value = values[element.dataset.preview];
      if (value) element.textContent = value;
    });
  };

  const setFormValues = (values) => {
    Object.entries(values).forEach(([key, value]) => {
      const field = adminForm.elements[key];
      if (field) field.value = value;
    });
    updatePreviews(values);
  };

  const getFormValues = () => {
    const values = { ...defaults };
    Object.keys(defaults).forEach((key) => {
      const field = adminForm.elements[key];
      if (field) values[key] = field.value.trim();
    });
    return values;
  };

  const unlock = () => {
    lock.classList.add("is-hidden");
    dashboard.classList.remove("is-hidden");
    sessionStorage.setItem(authKey, "true");
    setFormValues(getDraft());
  };

  authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const submitted = authForm.elements.code.value.trim();
    if (submitted === code) {
      authStatus.textContent = "";
      unlock();
      return;
    }
    authStatus.textContent = "That code did not match.";
  });

  adminForm.addEventListener("input", () => {
    updatePreviews(getFormValues());
  });

  adminForm.addEventListener("submit", (event) => {
    event.preventDefault();
    localStorage.setItem(storageKey, JSON.stringify(getFormValues(), null, 2));
    adminStatus.textContent = "Draft saved. Open Preview Site in this browser to see local draft changes.";
  });

  document.querySelector("[data-copy-summary]").addEventListener("click", async () => {
    const values = getFormValues();
    const summary = [
      "American Heritage Volleyball Camp admin update",
      "",
      `Dates: ${values.dates}`,
      `Location: ${values.location}`,
      `Athletes: ${values.athletes}`,
      `Registration status: ${values.registrationStatus}`,
      "",
      `Hero subheading: ${values.heroSubhead}`,
      `Announcement: ${values.announcement}`,
      "",
      `Coach summary: ${values.coachSummary}`,
      "",
      `Notes: ${values.notes || "None"}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      adminStatus.textContent = "Update summary copied.";
    } catch (error) {
      adminStatus.textContent = summary;
    }
  });

  document.querySelector("[data-reset-draft]").addEventListener("click", () => {
    localStorage.removeItem(storageKey);
    setFormValues(defaults);
    adminStatus.textContent = "Draft reset.";
  });

  document.querySelector("[data-lock-admin]").addEventListener("click", () => {
    sessionStorage.removeItem(authKey);
    dashboard.classList.add("is-hidden");
    lock.classList.remove("is-hidden");
    authForm.reset();
  });

  if (sessionStorage.getItem(authKey) === "true") {
    unlock();
  }
})();
