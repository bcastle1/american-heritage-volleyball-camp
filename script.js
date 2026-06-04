(function () {
  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const form = document.querySelector("[data-interest-form]");
  const status = document.querySelector("[data-form-status]");
  const paymentModal = document.querySelector("[data-payment-modal]");
  const paymentTitle = document.querySelector("[data-payment-title]");
  const paymentSummary = document.querySelector("[data-payment-summary]");
  const venmoPayLink = document.querySelector("[data-venmo-pay-link]");
  const venmoProfileLinks = document.querySelectorAll("[data-venmo-profile]");
  const recordPaymentButton = document.querySelector("[data-record-payment]");
  const closePaymentButton = document.querySelector("[data-close-payment]");
  const adminDraftKey = "ahvcAdminDraft";
  const crmKey = "ahvcCampCrm.v1";

  const defaultCrm = {
    settings: {
      venmoHandle: "bcastle1",
      campFee: "TBD",
      contactEmail: "",
    },
    participants: [],
    payments: [],
  };

  let pendingPaymentId = "";

  const clean = (value) => String(value || "").trim();

  const escapeHtml = (value) => clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const makeId = (prefix) => (
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  );

  const normalizeCrm = (incoming) => ({
    settings: { ...defaultCrm.settings, ...(incoming?.settings || {}) },
    participants: Array.isArray(incoming?.participants) ? incoming.participants : [],
    payments: Array.isArray(incoming?.payments) ? incoming.payments : [],
  });

  const loadCrm = () => {
    try {
      return normalizeCrm(JSON.parse(localStorage.getItem(crmKey) || "{}"));
    } catch (error) {
      localStorage.removeItem(crmKey);
      return normalizeCrm();
    }
  };

  const saveCrm = (crm) => {
    localStorage.setItem(
      crmKey,
      JSON.stringify({ ...normalizeCrm(crm), savedAt: new Date().toISOString() }, null, 2)
    );
  };

  const moneyAmount = (value) => {
    const amount = Number(clean(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  };

  const moneyLabel = (value) => {
    const amount = moneyAmount(value);
    return amount > 0 ? `$${amount.toFixed(2)}` : clean(value) || "TBD";
  };

  const venmoHandle = () => clean(loadCrm().settings.venmoHandle).replace(/^@/, "") || "bcastle1";

  const venmoProfileUrl = () => `https://venmo.com/${encodeURIComponent(venmoHandle())}`;

  const venmoPayUrl = (payment) => {
    const params = new URLSearchParams({
      txn: "pay",
      recipients: venmoHandle(),
      note: payment?.memo || "American Heritage Volleyball Camp",
    });

    if (Number(payment?.amount || 0) > 0) {
      params.set("amount", Number(payment.amount).toFixed(2));
    }

    return `https://venmo.com/?${params.toString()}`;
  };

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Just now";
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

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

  const openDialog = (dialog) => {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  };

  const closeDialog = (dialog) => {
    if (!dialog) return;
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  };

  const renderPaymentModal = (participant, payment) => {
    if (!paymentSummary || !paymentTitle || !venmoPayLink) return;

    pendingPaymentId = payment.id;
    paymentTitle.textContent = `Complete Venmo payment for ${participant.athlete}.`;
    venmoPayLink.href = venmoPayUrl(payment);
    venmoPayLink.textContent = `Pay @${venmoHandle()}`;
    paymentSummary.innerHTML = [
      ["Athlete", participant.athlete],
      ["Grade", participant.grade],
      ["Amount", payment.amount > 0 ? `$${payment.amount.toFixed(2)}` : payment.amountLabel],
      ["Venmo", `@${venmoHandle()}`],
      ["Memo", payment.memo],
      ["Status", payment.status],
      ["Saved", formatDate(payment.date)],
    ].map(([label, value]) => `
      <div class="payment-row">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `).join("");
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const athlete = clean(data.get("athlete"));
    const guardian = clean(data.get("guardian"));
    const email = clean(data.get("email"));
    const phone = clean(data.get("phone"));
    const athleteEmail = clean(data.get("athleteEmail"));
    const grade = data.get("grade");
    const experience = data.get("experience");
    const message = clean(data.get("message"));
    const crm = loadCrm();
    const participant = {
      id: makeId("athlete"),
      athlete,
      guardian,
      email,
      phone,
      athleteEmail,
      grade,
      experience,
      message,
      signedUpAt: new Date().toISOString(),
    };
    const amount = moneyAmount(crm.settings.campFee);
    const payment = {
      id: makeId("payment"),
      participantId: participant.id,
      date: new Date().toISOString(),
      amount,
      amountLabel: moneyLabel(crm.settings.campFee),
      method: "Venmo",
      memo: `American Heritage Volleyball Camp - ${athlete} - ${grade}`,
      status: "pending",
      verified: false,
    };

    crm.participants.unshift(participant);
    crm.payments.unshift(payment);
    saveCrm(crm);
    renderPaymentModal(participant, payment);
    openDialog(paymentModal);

    try {
      await navigator.clipboard.writeText(payment.memo);
      status.textContent = "Registration saved. Venmo checkout is open and the memo was copied.";
    } catch (error) {
      status.textContent = "Registration saved. Venmo checkout is open.";
    }
  });

  recordPaymentButton?.addEventListener("click", () => {
    const crm = loadCrm();
    const payment = crm.payments.find((item) => item.id === pendingPaymentId);
    if (!payment) return;

    payment.status = "paid";
    payment.verified = false;
    payment.date = new Date().toISOString();
    saveCrm(crm);

    const participant = crm.participants.find((item) => item.id === payment.participantId) || { athlete: "athlete", grade: "" };
    renderPaymentModal(participant, payment);
    status.textContent = "Payment marked recorded. Admin should still verify Venmo.";
  });

  closePaymentButton?.addEventListener("click", () => closeDialog(paymentModal));

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

  const applyPublicSettings = () => {
    const crm = loadCrm();
    document.querySelectorAll("[data-public-setting]").forEach((element) => {
      const key = element.dataset.publicSetting;
      const value = crm.settings[key];
      if (!value) return;
      element.textContent = key === "campFee" ? moneyLabel(value) : clean(value).replace(/^@/, "");
    });

    venmoProfileLinks.forEach((link) => {
      link.href = venmoProfileUrl();
      link.textContent = `Pay @${venmoHandle()}`;
    });
  };

  applyPublicSettings();
})();
