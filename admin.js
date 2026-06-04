(function () {
  const code = "Patriot";
  const storageKey = "ahvcAdminDraft";
  const crmKey = "ahvcCampCrm.v1";
  const authKey = "ahvcAdminUnlocked";

  const defaults = {
    dates: "TBD",
    location: "American Fork, Utah",
    athletes: "High school boys & girls",
    registrationStatus: "Registration / Venmo Checkout",
    heroSubhead: "American Fork, Utah volleyball training for high school boys and girls.",
    announcement: "Train hard. Lead well. Honor always.",
    coachSummary:
      "Together, Brad and Erik Castle bring college-level playing backgrounds, semi-professional USVBA experience, and current American Heritage varsity and JV coaching leadership. Their shared approach is technical, competitive, and values-driven: strong fundamentals, smart reads, disciplined reps, and team-first leadership.",
    notes: "",
  };

  const defaultCrm = {
    settings: {
      venmoHandle: "bcastle1",
      campFee: "TBD",
      contactEmail: "",
    },
    participants: [],
    payments: [],
  };

  const lock = document.querySelector("[data-admin-lock]");
  const dashboard = document.querySelector("[data-admin-dashboard]");
  const authForm = document.querySelector("[data-auth-form]");
  const adminForm = document.querySelector("[data-admin-form]");
  const authStatus = document.querySelector("[data-auth-status]");
  const adminStatus = document.querySelector("[data-admin-status]");
  const settingsForm = document.querySelector("[data-settings-form]");
  const settingsStatus = document.querySelector("[data-settings-status]");
  const manualForm = document.querySelector("[data-manual-registration]");
  const participantsTable = document.querySelector("[data-participants-table]");
  const paymentsTable = document.querySelector("[data-payments-table]");
  const participantDetail = document.querySelector("[data-participant-detail]");
  const participantSearch = document.querySelector("[data-registration-search]");
  const paymentFilter = document.querySelector("[data-payment-filter]");
  const restoreInput = document.querySelector("[data-restore-backup]");

  let selectedParticipantId = "";

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

  const moneyAmount = (value) => {
    const amount = Number(clean(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  };

  const moneyLabel = (value) => {
    const amount = moneyAmount(value);
    return amount > 0 ? `$${amount.toFixed(2)}` : clean(value) || "TBD";
  };

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not dated";
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const normalizeCrm = (incoming) => ({
    settings: { ...defaultCrm.settings, ...(incoming?.settings || {}) },
    participants: Array.isArray(incoming?.participants) ? incoming.participants : [],
    payments: Array.isArray(incoming?.payments) ? incoming.payments : [],
    savedAt: incoming?.savedAt || "",
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

  const paymentForParticipant = (crm, participantId) => (
    crm.payments.find((payment) => payment.participantId === participantId) || null
  );

  const paymentState = (crm, participantId) => {
    const payments = crm.payments.filter((payment) => payment.participantId === participantId);
    return payments.some((payment) => payment.status === "paid") ? "paid" : "pending";
  };

  const defaultMemo = (participant) => (
    `American Heritage Volleyball Camp - ${participant.athlete || "Athlete"} - ${participant.grade || "High school"}`
  );

  const renderMetrics = (crm) => {
    const paid = crm.payments.filter((payment) => payment.status === "paid");
    const pending = crm.payments.filter((payment) => payment.status !== "paid");
    const revenue = paid.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const values = {
      registrations: crm.participants.length,
      paid: paid.length,
      pending: pending.length,
      revenue: `$${revenue.toFixed(2)}`,
    };

    document.querySelectorAll("[data-metric]").forEach((element) => {
      element.textContent = values[element.dataset.metric] ?? "0";
    });
  };

  const renderSettingsForm = (crm) => {
    settingsForm.elements.venmoHandle.value = crm.settings.venmoHandle || "bcastle1";
    settingsForm.elements.campFee.value = crm.settings.campFee || "TBD";
    settingsForm.elements.contactEmail.value = crm.settings.contactEmail || "";
  };

  const renderParticipants = () => {
    const crm = loadCrm();
    const query = clean(participantSearch.value).toLowerCase();
    const filter = paymentFilter.value;
    const rows = crm.participants.filter((participant) => {
      const searchable = [
        participant.athlete,
        participant.guardian,
        participant.email,
        participant.phone,
        participant.athleteEmail,
        participant.grade,
        participant.experience,
      ].join(" ").toLowerCase();
      const status = paymentState(crm, participant.id);
      return (!query || searchable.includes(query)) && (filter === "all" || status === filter);
    });

    participantsTable.innerHTML = rows.map((participant) => {
      const status = paymentState(crm, participant.id);
      return `
        <tr data-participant-id="${escapeHtml(participant.id)}">
          <td><button class="link-button" type="button" data-select-participant="${escapeHtml(participant.id)}">${escapeHtml(participant.athlete)}</button></td>
          <td>${escapeHtml(participant.grade)}</td>
          <td>${escapeHtml(participant.guardian)}</td>
          <td>${escapeHtml(participant.email)}<br><span>${escapeHtml(participant.phone || "No phone")}</span></td>
          <td><span class="status-pill ${status}">${status}</span></td>
          <td>
            <button type="button" data-edit-participant="${escapeHtml(participant.id)}">Edit</button>
            <button type="button" data-toggle-payment="${escapeHtml(participant.id)}">${status === "paid" ? "Mark Pending" : "Mark Paid"}</button>
            <button type="button" data-delete-participant="${escapeHtml(participant.id)}">Delete</button>
          </td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="6">No registrations match the current filters.</td></tr>`;

    if (!crm.participants.some((participant) => participant.id === selectedParticipantId)) {
      selectedParticipantId = crm.participants[0]?.id || "";
    }
    renderParticipantDetail();
    renderPayments();
    renderMetrics(crm);
  };

  const renderParticipantDetail = () => {
    const crm = loadCrm();
    const participant = crm.participants.find((item) => item.id === selectedParticipantId);

    if (!participant) {
      participantDetail.innerHTML = "<p>Select a registration to see details.</p>";
      return;
    }

    const payments = crm.payments.filter((payment) => payment.participantId === participant.id);
    participantDetail.innerHTML = `
      <h3>${escapeHtml(participant.athlete)}</h3>
      <p>${escapeHtml(participant.grade)} grade. ${escapeHtml(participant.experience || "Experience not listed")}.</p>
      <dl>
        <div><dt>Guardian</dt><dd>${escapeHtml(participant.guardian)}</dd></div>
        <div><dt>Email</dt><dd>${escapeHtml(participant.email)}</dd></div>
        <div><dt>Phone</dt><dd>${escapeHtml(participant.phone || "Not provided")}</dd></div>
        <div><dt>Athlete email</dt><dd>${escapeHtml(participant.athleteEmail || "Not provided")}</dd></div>
        <div><dt>Signed up</dt><dd>${formatDate(participant.signedUpAt)}</dd></div>
      </dl>
      <h4>Notes</h4>
      <p>${escapeHtml(participant.message || "No notes yet.")}</p>
      <h4>Payments</h4>
      ${payments.map((payment) => `
        <div class="payment-row">
          <span>${formatDate(payment.date)}<br>${escapeHtml(payment.memo)}</span>
          <strong>${payment.amount > 0 ? `$${Number(payment.amount).toFixed(2)}` : escapeHtml(payment.amountLabel || "TBD")} <span class="status-pill ${payment.status}">${escapeHtml(payment.status)}</span></strong>
        </div>
      `).join("") || "<p>No payments recorded.</p>"}
    `;
  };

  const renderPayments = () => {
    const crm = loadCrm();
    paymentsTable.innerHTML = crm.payments.map((payment) => {
      const participant = crm.participants.find((item) => item.id === payment.participantId);
      return `
        <tr>
          <td>${formatDate(payment.date)}</td>
          <td>${escapeHtml(participant?.athlete || "Unknown athlete")}</td>
          <td>${escapeHtml(payment.memo || "")}</td>
          <td>${payment.amount > 0 ? `$${Number(payment.amount).toFixed(2)}` : escapeHtml(payment.amountLabel || "TBD")}</td>
          <td><span class="status-pill ${payment.status}">${escapeHtml(payment.status || "pending")}</span></td>
          <td><button type="button" data-toggle-payment-id="${escapeHtml(payment.id)}">${payment.status === "paid" ? "Mark Pending" : "Mark Paid"}</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="6">No payments yet.</td></tr>`;
  };

  const renderAdmin = () => {
    const crm = loadCrm();
    renderMetrics(crm);
    renderSettingsForm(crm);
    renderParticipants();
    renderPayments();
  };

  const unlock = () => {
    lock.classList.add("is-hidden");
    dashboard.classList.remove("is-hidden");
    sessionStorage.setItem(authKey, "true");
    setFormValues(getDraft());
    renderAdmin();
  };

  const switchTab = (tabName) => {
    document.querySelectorAll("[data-admin-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.adminTab === tabName);
    });
    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === tabName);
    });
  };

  const fillManualForm = (participant) => {
    const crm = loadCrm();
    const payment = participant ? paymentForParticipant(crm, participant.id) : null;
    manualForm.elements.participantId.value = participant?.id || "";
    manualForm.elements.athlete.value = participant?.athlete || "";
    manualForm.elements.grade.value = participant?.grade || "";
    manualForm.elements.guardian.value = participant?.guardian || "";
    manualForm.elements.email.value = participant?.email || "";
    manualForm.elements.phone.value = participant?.phone || "";
    manualForm.elements.experience.value = participant?.experience || "";
    manualForm.elements.paymentStatus.value = payment?.status || "pending";
    manualForm.elements.paymentAmount.value = payment?.amount ? Number(payment.amount).toFixed(2) : "";
    manualForm.elements.paymentMemo.value = payment?.memo || (participant ? defaultMemo(participant) : "");
    manualForm.elements.message.value = participant?.message || "";
  };

  const saveManualRegistration = (event) => {
    event.preventDefault();
    const crm = loadCrm();
    const data = new FormData(manualForm);
    const participantId = clean(data.get("participantId")) || makeId("athlete");
    const existing = crm.participants.find((item) => item.id === participantId);
    const participant = {
      id: participantId,
      athlete: clean(data.get("athlete")),
      guardian: clean(data.get("guardian")),
      email: clean(data.get("email")),
      phone: clean(data.get("phone")),
      athleteEmail: existing?.athleteEmail || "",
      grade: clean(data.get("grade")),
      experience: clean(data.get("experience")),
      message: clean(data.get("message")),
      signedUpAt: existing?.signedUpAt || new Date().toISOString(),
    };

    if (existing) {
      Object.assign(existing, participant);
    } else {
      crm.participants.unshift(participant);
    }

    const paymentAmount = clean(data.get("paymentAmount"));
    const amount = paymentAmount ? moneyAmount(paymentAmount) : moneyAmount(crm.settings.campFee);
    const paymentStatus = clean(data.get("paymentStatus")) || "pending";
    const payment = paymentForParticipant(crm, participantId);
    const paymentData = {
      participantId,
      date: new Date().toISOString(),
      amount,
      amountLabel: amount > 0 ? `$${amount.toFixed(2)}` : moneyLabel(crm.settings.campFee),
      method: "Venmo",
      memo: clean(data.get("paymentMemo")) || defaultMemo(participant),
      status: paymentStatus,
      verified: paymentStatus === "paid",
    };

    if (payment) {
      Object.assign(payment, paymentData);
    } else {
      crm.payments.unshift({ id: makeId("payment"), ...paymentData });
    }

    saveCrm(crm);
    selectedParticipantId = participantId;
    fillManualForm(null);
    renderAdmin();
  };

  const toggleParticipantPayment = (participantId) => {
    const crm = loadCrm();
    const participant = crm.participants.find((item) => item.id === participantId);
    if (!participant) return;

    let payment = paymentForParticipant(crm, participantId);
    if (!payment) {
      const amount = moneyAmount(crm.settings.campFee);
      payment = {
        id: makeId("payment"),
        participantId,
        date: new Date().toISOString(),
        amount,
        amountLabel: amount > 0 ? `$${amount.toFixed(2)}` : moneyLabel(crm.settings.campFee),
        method: "Venmo",
        memo: defaultMemo(participant),
        status: "pending",
        verified: false,
      };
      crm.payments.unshift(payment);
    }

    payment.status = payment.status === "paid" ? "pending" : "paid";
    payment.verified = payment.status === "paid";
    payment.date = new Date().toISOString();
    saveCrm(crm);
    renderAdmin();
  };

  const togglePaymentById = (paymentId) => {
    const crm = loadCrm();
    const payment = crm.payments.find((item) => item.id === paymentId);
    if (!payment) return;
    payment.status = payment.status === "paid" ? "pending" : "paid";
    payment.verified = payment.status === "paid";
    payment.date = new Date().toISOString();
    saveCrm(crm);
    renderAdmin();
  };

  const deleteParticipant = (participantId) => {
    const crm = loadCrm();
    const participant = crm.participants.find((item) => item.id === participantId);
    if (!participant) return;
    if (!window.confirm(`Delete ${participant.athlete}'s registration and payment records?`)) return;
    crm.participants = crm.participants.filter((item) => item.id !== participantId);
    crm.payments = crm.payments.filter((item) => item.participantId !== participantId);
    if (selectedParticipantId === participantId) selectedParticipantId = "";
    saveCrm(crm);
    renderAdmin();
  };

  const downloadTextFile = (filename, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const csvCell = (value) => `"${clean(value).replace(/"/g, '""')}"`;

  const exportCsv = () => {
    const crm = loadCrm();
    const rows = [
      ["Athlete", "Grade", "Guardian", "Guardian Email", "Phone", "Experience", "Payment Status", "Amount", "Memo", "Signed Up"],
      ...crm.participants.map((participant) => {
        const payment = paymentForParticipant(crm, participant.id);
        return [
          participant.athlete,
          participant.grade,
          participant.guardian,
          participant.email,
          participant.phone,
          participant.experience,
          payment?.status || "pending",
          payment?.amount > 0 ? Number(payment.amount).toFixed(2) : payment?.amountLabel || "TBD",
          payment?.memo || "",
          participant.signedUpAt,
        ];
      }),
    ];
    downloadTextFile("american-heritage-volleyball-registrations.csv", rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv;charset=utf-8");
  };

  const exportBackup = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      `american-heritage-volleyball-crm-${date}.json`,
      JSON.stringify({ exportedAt: new Date().toISOString(), state: loadCrm() }, null, 2),
      "application/json"
    );
  };

  const restoreBackup = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const restored = normalizeCrm(parsed.state && typeof parsed.state === "object" ? parsed.state : parsed);
        saveCrm(restored);
        selectedParticipantId = restored.participants[0]?.id || "";
        renderAdmin();
      } catch (error) {
        settingsStatus.textContent = "That backup file could not be restored.";
      }
      restoreInput.value = "";
    });
    reader.readAsText(file);
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

  settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const crm = loadCrm();
    crm.settings.venmoHandle = clean(settingsForm.elements.venmoHandle.value).replace(/^@/, "") || "bcastle1";
    crm.settings.campFee = clean(settingsForm.elements.campFee.value) || "TBD";
    crm.settings.contactEmail = clean(settingsForm.elements.contactEmail.value);
    saveCrm(crm);
    settingsStatus.textContent = "Payment settings saved.";
    renderAdmin();
  });

  manualForm.addEventListener("submit", saveManualRegistration);

  participantsTable.addEventListener("click", (event) => {
    const selectButton = event.target.closest("[data-select-participant]");
    const editButton = event.target.closest("[data-edit-participant]");
    const toggleButton = event.target.closest("[data-toggle-payment]");
    const deleteButton = event.target.closest("[data-delete-participant]");

    if (selectButton) {
      selectedParticipantId = selectButton.dataset.selectParticipant;
      renderParticipantDetail();
    }
    if (editButton) {
      const participant = loadCrm().participants.find((item) => item.id === editButton.dataset.editParticipant);
      if (participant) fillManualForm(participant);
    }
    if (toggleButton) {
      toggleParticipantPayment(toggleButton.dataset.togglePayment);
    }
    if (deleteButton) {
      deleteParticipant(deleteButton.dataset.deleteParticipant);
    }
  });

  paymentsTable.addEventListener("click", (event) => {
    const button = event.target.closest("[data-toggle-payment-id]");
    if (button) togglePaymentById(button.dataset.togglePaymentId);
  });

  participantSearch.addEventListener("input", renderParticipants);
  paymentFilter.addEventListener("change", renderParticipants);

  document.querySelector("[data-clear-manual-form]").addEventListener("click", () => fillManualForm(null));

  document.querySelector("[data-copy-summary]").addEventListener("click", async () => {
    const values = getFormValues();
    const crm = loadCrm();
    const summary = [
      "American Heritage Volleyball Camp admin update",
      "",
      `Dates: ${values.dates}`,
      `Location: ${values.location}`,
      `Athletes: ${values.athletes}`,
      `Registration status: ${values.registrationStatus}`,
      `Venmo: @${crm.settings.venmoHandle}`,
      `Camp fee: ${crm.settings.campFee}`,
      `Registrations: ${crm.participants.length}`,
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

  document.querySelector("[data-export-csv]").addEventListener("click", exportCsv);
  document.querySelector("[data-export-backup]").addEventListener("click", exportBackup);
  restoreInput.addEventListener("change", restoreBackup);

  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.adminTab));
  });

  if (sessionStorage.getItem(authKey) === "true") {
    unlock();
  }
})();
