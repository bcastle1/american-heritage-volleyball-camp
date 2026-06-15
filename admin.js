(function () {
  const defaultCode = "patriot";
  const adminCodeKey = "ahvcAdminCode.v1";
  const storageKey = "ahvcAdminDraft";
  const crmKey = "ahvcCampCrm.v1";
  const authKey = "ahvcAdminUnlocked";
  const runLogKey = "ahvcEmailRunLog.v1";
  const emailHistoryKey = "ahvcEmailHistory.v1";

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

  function defaultEmailTemplate() {
    return `Hi {{first_name}},

We are inviting American Heritage families, staff, and friends to help us get the word out about American Heritage Volleyball Camp in American Fork, Utah.

Camp details:
Dates: {{camp_dates}}
Location: {{camp_location}}
Fee: {{camp_fee}}
Venmo: @{{venmo_handle}}

This camp is for high school boys and girls who want focused volleyball reps, strong fundamentals, leadership, and team-first training with Brad and Erik Castle.

Registration link:
{{registration_link}}

Please reply with any questions, or forward this to a family with an athlete who may be interested.

Thank you,
American Heritage Volleyball Camp
{{from_email}}`;
  }

  const defaultCrm = {
    settings: {
      venmoHandle: "bcastle1",
      campFee: "TBD",
      contactEmail: "",
      forwardEmail: "",
      fromEmail: "",
      ccEmail: "",
      frequency: "manual",
      day: "Monday",
      time: "09:00",
      delaySeconds: 4,
      openDrafts: false,
      emailTemplate: defaultEmailTemplate(),
    },
    participants: [],
    payments: [],
  };

  const workbook = window.PATRIOTS_DIRECTORY_WORKBOOK || { contacts: [], notes: [] };
  const directoryContacts = Array.isArray(workbook.contacts) ? workbook.contacts : [];
  const directoryContactsWithEmail = directoryContacts.filter((contact) => String(contact.email || "").trim());
  const requestedDirectoryId = new URLSearchParams(window.location.search).get("select");

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
  const emailSelectedName = document.querySelector("[data-email-selected-name]");
  const emailSelectedDetail = document.querySelector("[data-email-selected-detail]");
  const emailSelectedMeta = document.querySelector("[data-email-selected-meta]");
  const emailTo = document.querySelector("[data-email-to]");
  const emailCc = document.querySelector("[data-email-cc]");
  const emailSubject = document.querySelector("[data-email-subject]");
  const emailTemplate = document.querySelector("[data-email-template]");
  const emailBody = document.querySelector("[data-email-body]");
  const emailStatus = document.querySelector("[data-email-status]");
  const scheduleFrequency = document.querySelector("[data-schedule-frequency]");
  const scheduleDay = document.querySelector("[data-schedule-day]");
  const scheduleTime = document.querySelector("[data-schedule-time]");
  const scheduleDelay = document.querySelector("[data-schedule-delay]");
  const manualEmail = document.querySelector("[data-manual-email]");
  const openDraftsDuringRun = document.querySelector("[data-open-drafts-during-run]");
  const progressPanel = document.querySelector("[data-progress-panel]");
  const progressText = document.querySelector("[data-progress-text]");
  const progressCount = document.querySelector("[data-progress-count]");
  const progressBar = document.querySelector("[data-progress-bar]");
  const runLog = document.querySelector("[data-run-log]");
  const directorySearch = document.querySelector("[data-directory-search]");
  const directoryGroup = document.querySelector("[data-directory-group]");
  const directorySummary = document.querySelector("[data-directory-summary]");
  const directoryList = document.querySelector("[data-directory-list]");
  const emailHistoryPanel = document.querySelector("[data-email-history]");

  let selectedParticipantId = "";
  let selectedDirectoryIds = new Set();
  let visibleDirectoryContacts = [];
  let activeHistoryContactId = "";
  let runTimer = null;
  let runState = { active: false, total: 0, sent: 0 };
  let currentDirectoryId = directoryContactsWithEmail.some((contact) => contact.id === requestedDirectoryId)
    ? requestedDirectoryId
    : directoryContactsWithEmail[0]?.id || "";

  const clean = (value) => String(value || "").trim();

  const escapeHtml = (value) => clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const escapeAttr = escapeHtml;

  const getAdminCode = () => {
    const savedCode = localStorage.getItem(adminCodeKey);
    if (savedCode === "Patriot") {
      localStorage.setItem(adminCodeKey, defaultCode);
      return defaultCode;
    }
    return savedCode || defaultCode;
  };

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

  const normalizeCrm = (incoming = {}) => {
    const settings = { ...defaultCrm.settings, ...(incoming?.settings || {}) };
    settings.delaySeconds = Math.max(1, Number(settings.delaySeconds) || defaultCrm.settings.delaySeconds);
    settings.emailTemplate = ensureRequiredEmailTemplate(settings.emailTemplate || defaultEmailTemplate());
    return {
      settings,
      participants: Array.isArray(incoming?.participants) ? incoming.participants : [],
      payments: Array.isArray(incoming?.payments) ? incoming.payments : [],
      savedAt: incoming?.savedAt || "",
    };
  };

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
    const percent = runState.total ? `${Math.round((runState.sent / runState.total) * 100)}%` : "0%";
    const values = {
      registrations: crm.participants.length,
      paid: paid.length,
      pending: pending.length,
      revenue: `$${revenue.toFixed(2)}`,
      directory: directoryContacts.length.toLocaleString(),
      selected: selectedDirectoryIds.size.toLocaleString(),
      emails: loadEmailHistory().length.toLocaleString(),
      progress: percent,
    };

    document.querySelectorAll("[data-metric]").forEach((element) => {
      element.textContent = values[element.dataset.metric] ?? "0";
    });
  };

  const renderSettingsForm = (crm) => {
    settingsForm.elements.venmoHandle.value = crm.settings.venmoHandle || "bcastle1";
    settingsForm.elements.campFee.value = crm.settings.campFee || "TBD";
    settingsForm.elements.contactEmail.value = crm.settings.contactEmail || "";
    settingsForm.elements.fromEmail.value = crm.settings.fromEmail || crm.settings.contactEmail || "";
    settingsForm.elements.forwardEmail.value = crm.settings.forwardEmail || crm.settings.contactEmail || "";
    settingsForm.elements.ccEmail.value = crm.settings.ccEmail || "";
    settingsForm.elements.adminCode.value = "";
    settingsForm.elements.adminCodeConfirm.value = "";
    emailCc.value = crm.settings.ccEmail || "";
    scheduleFrequency.value = crm.settings.frequency || "manual";
    scheduleDay.value = crm.settings.day || "Monday";
    scheduleTime.value = crm.settings.time || "09:00";
    scheduleDelay.value = crm.settings.delaySeconds || 4;
    openDraftsDuringRun.checked = !!crm.settings.openDrafts;
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
            <button type="button" data-email-participant="${escapeHtml(participant.id)}">Email</button>
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
    renderEmailComposer();
    renderDirectory();
    renderRunLog();
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

  const currentDirectoryContact = () => (
    directoryContacts.find((contact) => contact.id === currentDirectoryId) || null
  );

  const appBaseUrl = () => {
    try {
      return new URL("index.html", window.location.href).href;
    } catch (error) {
      return "https://patriotsvb.com/";
    }
  };

  const registrationLink = () => {
    try {
      return new URL("#contact", appBaseUrl()).href;
    } catch (error) {
      return "https://patriotsvb.com/#contact";
    }
  };

  const emailSubjectLine = () => {
    const values = getFormValues();
    const dates = values.dates && values.dates !== "TBD" ? ` | ${values.dates}` : "";
    return `American Heritage Volleyball Camp${dates}`;
  };

  const contactLabel = (contact) => contact?.name || contact?.email || "Selected contact";

  const contactMeta = (contact) => [
    contact?.groupLabel,
    contact?.phone,
    contact?.address,
  ].filter(Boolean).join(" | ");

  const renderEmailComposer = () => {
    const crm = loadCrm();
    const contact = currentDirectoryContact();
    renderTemplateEditor(crm.settings.emailTemplate);

    if (contact) {
      emailSelectedName.textContent = contactLabel(contact);
      emailSelectedDetail.textContent = contactMeta(contact) || contact.email || "Directory contact";
      emailSelectedMeta.textContent = contact.groupLabel || "Directory";
      emailTo.value = contact.email || "";
      emailSubject.value = emailSubjectLine();
      updateEmailPreview();
      return;
    }

    emailSelectedName.textContent = "Manual email";
    emailSelectedDetail.textContent = "Enter an address and edit the draft before opening or copying.";
    emailSelectedMeta.textContent = "Manual";
    if (!emailSubject.value) emailSubject.value = emailSubjectLine();
    updateEmailPreview();
  };

  const renderTemplateEditor = (template) => {
    if (!emailTemplate || document.activeElement === emailTemplate) return;
    emailTemplate.innerHTML = highlightTemplate(template || defaultEmailTemplate());
  };

  const highlightTemplate = (template) => (
    escapeHtml(template).replace(/(\{\{[a-z0-9_]+\}\})/gi, '<span class="template-token">$1</span>')
  );

  const templateEditorText = () => (
    (emailTemplate?.innerText || "").replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim()
  );

  const updateEmailPreview = () => {
    if (!emailBody) return;
    const crm = loadCrm();
    const template = document.activeElement === emailTemplate
      ? templateEditorText()
      : crm.settings.emailTemplate || defaultEmailTemplate();
    emailBody.value = resolveTemplate(template, currentDirectoryContact() || {});
  };

  function ensureRequiredEmailTemplate(template) {
    const cleanTemplate = clean(template || defaultEmailTemplate());
    if (/\{\{registration_link\}\}/i.test(cleanTemplate)) return cleanTemplate;
    return `${cleanTemplate}\n\nRegistration link:\n{{registration_link}}`;
  }

  const resolveTemplate = (template, contact = {}) => {
    const values = templateValues(contact);
    return String(template || defaultEmailTemplate()).replace(/\{\{([a-z0-9_]+)\}\}/gi, (_, key) => values[key] ?? "");
  };

  const templateValues = (contact = {}) => {
    const crm = loadCrm();
    const draft = getDraft();
    const fromEmail = crm.settings.fromEmail || crm.settings.contactEmail || crm.settings.forwardEmail || "";
    return {
      name: contact.name || "there",
      first_name: contact.firstName || contact.name?.split(" ")[0] || "there",
      last_name: contact.lastName || "",
      email: contact.email || "",
      group: contact.groupLabel || contact.worksheet || "camp contact",
      worksheet: contact.worksheet || "",
      address: contact.address || "",
      phone: contact.phone || "",
      notes: contact.notes || "",
      camp_dates: draft.dates || "TBD",
      camp_location: draft.location || "American Fork, Utah",
      camp_fee: moneyLabel(crm.settings.campFee),
      venmo_handle: clean(crm.settings.venmoHandle).replace(/^@/, "") || "bcastle1",
      registration_link: registrationLink(),
      from_email: fromEmail,
    };
  };

  const saveTemplateFromEditor = () => {
    const template = templateEditorText();
    if (!template) {
      emailStatus.textContent = "Add template text before saving.";
      return;
    }
    const crm = loadCrm();
    crm.settings.emailTemplate = ensureRequiredEmailTemplate(template);
    saveCrm(crm);
    renderEmailComposer();
    emailStatus.textContent = "Email template saved.";
  };

  const resetTemplate = () => {
    const crm = loadCrm();
    crm.settings.emailTemplate = defaultEmailTemplate();
    saveCrm(crm);
    renderEmailComposer();
    emailStatus.textContent = "Email template reset.";
  };

  const currentEmailTarget = () => ({
    contactId: currentDirectoryContact()?.id || "",
    email: clean(emailTo.value),
    label: currentDirectoryContact() ? contactLabel(currentDirectoryContact()) : "manual recipient",
    subject: clean(emailSubject.value) || emailSubjectLine(),
    body: emailBody.value,
  });

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(`${emailSubject.value}\n\n${emailBody.value}`);
      emailStatus.textContent = "Draft copied.";
    } catch (error) {
      emailStatus.textContent = "Copy failed; select the preview text and copy manually.";
    }
  };

  const openMailDraft = (target = currentEmailTarget(), quiet = false) => {
    if (!clean(target.email)) {
      emailStatus.textContent = "Add a recipient email first.";
      return;
    }
    const params = new URLSearchParams({
      cc: emailCc.value || "",
      subject: target.subject || emailSubject.value,
      body: target.body || emailBody.value,
    });
    window.open(`mailto:${target.email}?${params.toString()}`, "_blank");
    if (!quiet) emailStatus.textContent = "Draft opened in your mail app.";
  };

  const markCurrentSent = () => {
    const target = currentEmailTarget();
    if (!target.email) {
      emailStatus.textContent = "Add a recipient email first.";
      return;
    }
    recordEmailHistory(target, "Sent");
    if (target.contactId) selectedDirectoryIds.delete(target.contactId);
    logRun(`Marked sent for ${target.label} <${target.email}>.`);
    renderAdmin();
    emailStatus.textContent = "Marked sent.";
  };

  const loadParticipantEmail = (participantId) => {
    const participant = loadCrm().participants.find((item) => item.id === participantId);
    if (!participant) return;
    currentDirectoryId = "";
    emailSelectedName.textContent = participant.guardian || participant.athlete || "Registration";
    emailSelectedDetail.textContent = `${participant.athlete || "Athlete"} | ${participant.grade || "Grade not listed"} | ${participant.phone || "No phone"}`;
    emailSelectedMeta.textContent = "Registration";
    emailTo.value = participant.email || participant.athleteEmail || "";
    emailSubject.value = emailSubjectLine();
    emailBody.value = resolveTemplate(loadCrm().settings.emailTemplate, {
      name: participant.guardian || participant.athlete,
      firstName: (participant.guardian || participant.athlete || "there").split(" ")[0],
      lastName: "",
      email: participant.email || participant.athleteEmail || "",
      groupLabel: "Camp registration",
      notes: participant.message || participant.experience || "",
      phone: participant.phone || "",
    });
    switchTab("email");
  };

  const runTargets = () => {
    const selected = [...selectedDirectoryIds]
      .map((id) => directoryContacts.find((contact) => contact.id === id))
      .filter((contact) => contact && clean(contact.email))
      .map((contact) => ({
        contactId: contact.id,
        email: contact.email,
        label: contactLabel(contact),
        subject: emailSubjectLine(),
        body: resolveTemplate(loadCrm().settings.emailTemplate, contact),
      }));

    const manual = clean(manualEmail.value);
    if (manual) {
      selected.push({
        email: manual,
        label: "manual recipient",
        subject: clean(emailSubject.value) || emailSubjectLine(),
        body: emailBody.value,
      });
    }

    if (!selected.length && clean(emailTo.value)) {
      selected.push(currentEmailTarget());
    }

    return selected;
  };

  const startSendRun = () => {
    if (runState.active) {
      emailStatus.textContent = "A send run is already active.";
      return;
    }

    const crm = loadCrm();
    crm.settings.delaySeconds = Math.max(1, Number(scheduleDelay.value) || 4);
    crm.settings.openDrafts = openDraftsDuringRun.checked;
    saveCrm(crm);

    const targets = runTargets();
    if (!targets.length) {
      emailStatus.textContent = "Select directory contacts or enter a manual email first.";
      return;
    }

    progressPanel.hidden = false;
    runState = { active: true, total: targets.length, sent: 0 };
    logRun(`Send run started for ${targets.length} recipient${targets.length === 1 ? "" : "s"}.`);
    updateProgress();
    emailStatus.textContent = "Send run started.";

    const step = () => {
      const target = targets[runState.sent];
      if (!target) {
        runState.active = false;
        logRun("Send run complete.");
        updateProgress();
        renderAdmin();
        emailStatus.textContent = "Send run complete.";
        return;
      }

      emailTo.value = target.email;
      emailSubject.value = target.subject;
      emailBody.value = target.body;
      currentDirectoryId = target.contactId || "";
      logRun(`Prepared draft for ${target.label} <${target.email}>.`);
      if (crm.settings.openDrafts) openMailDraft(target, true);
      recordEmailHistory(target, crm.settings.openDrafts ? "Draft opened" : "Prepared");
      if (target.contactId) selectedDirectoryIds.delete(target.contactId);
      runState.sent += 1;
      updateProgress();
      runTimer = window.setTimeout(step, crm.settings.delaySeconds * 1000);
    };

    step();
  };

  const updateProgress = () => {
    const percent = runState.total ? Math.round((runState.sent / runState.total) * 100) : 0;
    progressText.textContent = `${percent}%`;
    progressCount.textContent = `${runState.sent} of ${runState.total}`;
    progressBar.style.width = `${percent}%`;
    renderMetrics(loadCrm());
    renderRunLog();
  };

  const saveSchedule = () => {
    const crm = loadCrm();
    crm.settings.frequency = scheduleFrequency.value;
    crm.settings.day = scheduleDay.value;
    crm.settings.time = scheduleTime.value;
    crm.settings.delaySeconds = Math.max(1, Number(scheduleDelay.value) || 4);
    crm.settings.openDrafts = openDraftsDuringRun.checked;
    saveCrm(crm);
    logRun(`Auto-send schedule saved: ${crm.settings.frequency}, ${crm.settings.day} at ${crm.settings.time}, ${crm.settings.delaySeconds}s between contacts.`);
    renderRunLog();
    emailStatus.textContent = "Schedule saved.";
  };

  const loadEmailHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem(emailHistoryKey) || "[]");
      return Array.isArray(history) ? history : [];
    } catch (error) {
      return [];
    }
  };

  const saveEmailHistory = (history) => {
    localStorage.setItem(emailHistoryKey, JSON.stringify(history.slice(0, 1000)));
  };

  const recordEmailHistory = (target, status = "Sent") => {
    if (!target.contactId) return;
    const history = loadEmailHistory();
    history.unshift({
      id: makeId("email"),
      contactId: target.contactId,
      name: target.label || "",
      email: target.email || "",
      subject: target.subject || emailSubject.value,
      body: target.body || emailBody.value,
      status,
      sentAt: new Date().toISOString(),
      respondedAt: "",
      viewedAt: "",
    });
    saveEmailHistory(history);
  };

  const emailHistoryFor = (contactId) => (
    loadEmailHistory()
      .filter((item) => item.contactId === contactId)
      .sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0))
  );

  const loadRunLog = () => {
    try {
      const log = JSON.parse(localStorage.getItem(runLogKey) || "[]");
      return Array.isArray(log) ? log : [];
    } catch (error) {
      return [];
    }
  };

  const logRun = (message) => {
    const log = loadRunLog();
    log.unshift({ message, createdAt: new Date().toISOString() });
    localStorage.setItem(runLogKey, JSON.stringify(log.slice(0, 100)));
  };

  const renderRunLog = () => {
    const log = loadRunLog();
    runLog.innerHTML = log.length
      ? log.map((item) => `<p><time>${escapeHtml(formatTime(item.createdAt))}</time>${escapeHtml(item.message)}</p>`).join("")
      : `<p><time>--:--</time>No run log entries yet.</p>`;
  };

  const formatTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const visibleDirectoryRows = () => {
    const query = clean(directorySearch.value).toLowerCase();
    const group = directoryGroup.value;
    return directoryContacts
      .filter((contact) => !group || contact.group === group)
      .filter((contact) => {
        if (!query) return true;
        return [
          contact.name,
          contact.email,
          contact.phone,
          contact.address,
          contact.notes,
          contact.reason,
          contact.groupLabel,
          contact.worksheet,
        ].join(" ").toLowerCase().includes(query);
      })
      .slice(0, 80);
  };

  const renderDirectory = () => {
    visibleDirectoryContacts = visibleDirectoryRows();
    const totalFiltered = directoryContacts
      .filter((contact) => !directoryGroup.value || contact.group === directoryGroup.value)
      .filter((contact) => {
        const query = clean(directorySearch.value).toLowerCase();
        if (!query) return true;
        return [
          contact.name,
          contact.email,
          contact.phone,
          contact.address,
          contact.notes,
          contact.reason,
          contact.groupLabel,
          contact.worksheet,
        ].join(" ").toLowerCase().includes(query);
      }).length;
    directorySummary.textContent = `Showing ${visibleDirectoryContacts.length.toLocaleString()} of ${totalFiltered.toLocaleString()} matching contacts.`;
    directoryList.innerHTML = visibleDirectoryContacts.length
      ? visibleDirectoryContacts.map(renderDirectoryContact).join("")
      : `<div class="directory-contact"><p>No directory contacts match the current filters.</p></div>`;
    renderMetrics(loadCrm());
  };

  const renderDirectoryContact = (contact) => {
    const history = emailHistoryFor(contact.id);
    const selected = selectedDirectoryIds.has(contact.id);
    return `
      <article class="directory-contact ${contact.id === currentDirectoryId ? "active" : ""}">
        <div class="directory-contact-head">
          <label>
            <input type="checkbox" data-select-directory="${escapeAttr(contact.id)}" ${selected ? "checked" : ""}>
            <span>
              <strong>${escapeHtml(contactLabel(contact))}</strong>
              <small>${escapeHtml(contact.email || "No email")} | ${escapeHtml(contact.groupLabel || contact.worksheet || "")}</small>
            </span>
          </label>
          <span class="status-pill neutral">${history.length}</span>
        </div>
        <p>${escapeHtml([contact.phone, contact.address, contact.notes || contact.reason].filter(Boolean).join(" | ") || "No extra directory notes.")}</p>
        <div class="directory-actions">
          <button type="button" data-load-directory="${escapeAttr(contact.id)}">Load Draft</button>
          <button type="button" data-history-directory="${escapeAttr(contact.id)}">History</button>
        </div>
      </article>
    `;
  };

  const renderEmailHistory = (contactId) => {
    activeHistoryContactId = contactId;
    const contact = directoryContacts.find((item) => item.id === contactId);
    const history = emailHistoryFor(contactId);
    emailHistoryPanel.innerHTML = `
      <h3>${escapeHtml(contactLabel(contact))}</h3>
      <p>${escapeHtml(contactMeta(contact) || contact?.email || "Directory contact")}</p>
      ${history.length ? history.map(renderHistoryEntry).join("") : "<p>No saved email history for this contact yet.</p>"}
    `;
  };

  const renderHistoryEntry = (item) => `
    <article class="history-entry">
      <div class="history-entry-head">
        <div>
          <strong>${escapeHtml(item.subject || "Camp email")}</strong>
          <span>To: ${escapeHtml(item.email || "")}</span>
          <span>Sent: ${escapeHtml(formatDate(item.sentAt))} | Status: ${escapeHtml(item.status || "Sent")}</span>
          <span>Responded: ${item.respondedAt ? escapeHtml(formatDate(item.respondedAt)) : "No response marked"}</span>
          <span>Viewed: ${item.viewedAt ? escapeHtml(formatDate(item.viewedAt)) : "Not tracked automatically"}</span>
        </div>
      </div>
      <pre>${escapeHtml(item.body || "")}</pre>
      <div class="history-actions">
        <button type="button" data-history-action="responded" data-history-id="${escapeAttr(item.id)}">Mark Responded</button>
        <button type="button" data-history-action="viewed" data-history-id="${escapeAttr(item.id)}">Mark Viewed</button>
      </div>
    </article>
  `;

  const updateHistoryItem = (historyId, action) => {
    const history = loadEmailHistory();
    const item = history.find((entry) => entry.id === historyId);
    if (!item) return;
    if (action === "responded") item.respondedAt = new Date().toISOString();
    if (action === "viewed") item.viewedAt = new Date().toISOString();
    saveEmailHistory(history);
    renderEmailHistory(activeHistoryContactId);
    renderDirectory();
  };

  const exportDirectoryCsv = () => {
    const headers = [
      "worksheet",
      "groupLabel",
      "name",
      "firstName",
      "lastName",
      "email",
      "address",
      "phone",
      "notes",
      "reason",
      "sourcePage",
      "lastEmail1",
      "lastEmail2",
      "lastEmail3",
      "emailHistoryCount",
    ];
    const rows = visibleDirectoryRows().map((contact) => {
      const history = emailHistoryFor(contact.id);
      const enriched = {
        ...contact,
        lastEmail1: history[0]?.sentAt || "",
        lastEmail2: history[1]?.sentAt || "",
        lastEmail3: history[2]?.sentAt || "",
        emailHistoryCount: history.length,
      };
      return headers.map((header) => csvCell(enriched[header] || "")).join(",");
    });
    downloadTextFile(
      "american-heritage-volleyball-directory.csv",
      [headers.join(","), ...rows].join("\n"),
      "text/csv;charset=utf-8"
    );
  };

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
    if (submitted === getAdminCode()) {
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
    const newCode = clean(settingsForm.elements.adminCode.value);
    const confirmedCode = clean(settingsForm.elements.adminCodeConfirm.value);
    if (newCode || confirmedCode) {
      if (newCode.length < 3) {
        settingsStatus.textContent = "Admin code must be at least 3 characters.";
        return;
      }
      if (newCode !== confirmedCode) {
        settingsStatus.textContent = "Admin code confirmation did not match.";
        return;
      }
      localStorage.setItem(adminCodeKey, newCode);
      settingsForm.elements.adminCode.value = "";
      settingsForm.elements.adminCodeConfirm.value = "";
    }
    crm.settings.venmoHandle = clean(settingsForm.elements.venmoHandle.value).replace(/^@/, "") || "bcastle1";
    crm.settings.campFee = clean(settingsForm.elements.campFee.value) || "TBD";
    crm.settings.contactEmail = clean(settingsForm.elements.contactEmail.value);
    crm.settings.fromEmail = clean(settingsForm.elements.fromEmail.value);
    crm.settings.forwardEmail = clean(settingsForm.elements.forwardEmail.value);
    crm.settings.ccEmail = clean(settingsForm.elements.ccEmail.value);
    saveCrm(crm);
    settingsStatus.textContent = "Settings saved.";
    renderAdmin();
  });

  manualForm.addEventListener("submit", saveManualRegistration);

  participantsTable.addEventListener("click", (event) => {
    const selectButton = event.target.closest("[data-select-participant]");
    const editButton = event.target.closest("[data-edit-participant]");
    const emailButton = event.target.closest("[data-email-participant]");
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
    if (emailButton) {
      loadParticipantEmail(emailButton.dataset.emailParticipant);
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
  emailTo.addEventListener("input", () => {
    currentDirectoryId = "";
    emailSelectedName.textContent = "Manual email";
    emailSelectedDetail.textContent = "Enter an address and edit the draft before opening or copying.";
    emailSelectedMeta.textContent = "Manual";
  });
  emailCc.addEventListener("input", () => {
    const crm = loadCrm();
    crm.settings.ccEmail = clean(emailCc.value);
    saveCrm(crm);
  });
  emailSubject.addEventListener("input", updateEmailPreview);
  emailTemplate.addEventListener("input", updateEmailPreview);
  document.querySelector("[data-save-template]").addEventListener("click", saveTemplateFromEditor);
  document.querySelector("[data-reset-template]").addEventListener("click", resetTemplate);
  document.querySelector("[data-copy-email]").addEventListener("click", copyDraft);
  document.querySelector("[data-open-email]").addEventListener("click", () => openMailDraft());
  document.querySelector("[data-mark-email-sent]").addEventListener("click", markCurrentSent);
  document.querySelector("[data-start-run]").addEventListener("click", startSendRun);
  document.querySelector("[data-save-schedule]").addEventListener("click", saveSchedule);
  document.querySelector("[data-toggle-progress]").addEventListener("click", () => {
    progressPanel.hidden = !progressPanel.hidden;
  });
  document.querySelector("[data-toggle-log]").addEventListener("click", () => {
    runLog.hidden = !runLog.hidden;
    renderRunLog();
  });
  directorySearch.addEventListener("input", renderDirectory);
  directoryGroup.addEventListener("change", renderDirectory);
  directoryList.addEventListener("click", (event) => {
    const checkbox = event.target.closest("[data-select-directory]");
    const loadButton = event.target.closest("[data-load-directory]");
    const historyButton = event.target.closest("[data-history-directory]");
    if (checkbox) {
      if (checkbox.checked) selectedDirectoryIds.add(checkbox.dataset.selectDirectory);
      else selectedDirectoryIds.delete(checkbox.dataset.selectDirectory);
      renderMetrics(loadCrm());
    }
    if (loadButton) {
      currentDirectoryId = loadButton.dataset.loadDirectory;
      renderEmailComposer();
      switchTab("email");
    }
    if (historyButton) {
      renderEmailHistory(historyButton.dataset.historyDirectory);
    }
  });
  emailHistoryPanel.addEventListener("click", (event) => {
    const action = event.target.closest("[data-history-action]");
    if (!action) return;
    updateHistoryItem(action.dataset.historyId, action.dataset.historyAction);
  });
  document.querySelector("[data-select-visible]").addEventListener("click", () => {
    visibleDirectoryContacts.forEach((contact) => {
      if (clean(contact.email)) selectedDirectoryIds.add(contact.id);
    });
    renderDirectory();
  });
  document.querySelector("[data-clear-selected]").addEventListener("click", () => {
    selectedDirectoryIds.clear();
    renderDirectory();
  });
  document.querySelector("[data-download-directory]").addEventListener("click", exportDirectoryCsv);

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
