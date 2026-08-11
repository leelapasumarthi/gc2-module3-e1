document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");
  const adminToggleButton = document.getElementById("admin-toggle");
  const adminLoginForm = document.getElementById("admin-login-form");
  const adminLogoutButton = document.getElementById("admin-logout");
  const adminStatus = document.getElementById("admin-status");
  const adminUsernameInput = document.getElementById("admin-username");
  const adminPasswordInput = document.getElementById("admin-password");

  let adminToken = null;
  let adminUser = null;

  function setMessage(text, kind = "info") {
    messageDiv.textContent = text;
    messageDiv.className = `message ${kind}`;
    messageDiv.classList.remove("hidden");
  }

  function hideMessage() {
    messageDiv.className = "message hidden";
  }

  function renderAdminControls() {
    if (adminUser) {
      adminStatus.textContent = `Signed in as ${adminUser}`;
      adminStatus.classList.remove("hidden");
      adminLoginForm.classList.add("hidden");
      adminToggleButton.classList.add("hidden");
      adminLogoutButton.classList.remove("hidden");
    } else {
      adminStatus.classList.add("hidden");
      adminLoginForm.classList.add("hidden");
      adminToggleButton.classList.remove("hidden");
      adminLogoutButton.classList.add("hidden");
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
                <h5>Participants:</h5>
                <ul class="participants-list">
                  ${details.participants
                    .map((email) => {
                      const removeButton = adminUser
                        ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">Remove</button>`
                        : "";
                      return `<li><span class="participant-email">${email}</span>${removeButton}</li>`;
                    })
                    .join("")}
                </ul>
              </div>`
            : `<p><em>No participants yet</em></p>`;

        const adminControls = adminUser
          ? `<div class="admin-controls">
              <h5>Teacher Controls</h5>
              <form class="inline-register-form" data-activity="${name}">
                <input type="email" class="student-email-input" placeholder="student@mergington.edu" required />
                <button type="submit">Register Student</button>
              </form>
            </div>`
          : `<p class="teacher-hint">Teacher login required to manage registrations.</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
          ${adminControls}
        `;

        activitiesList.appendChild(activityCard);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      document.querySelectorAll(".inline-register-form").forEach((form) => {
        form.addEventListener("submit", handleAdminRegistration);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!adminToken) {
      setMessage("Teacher login required to remove students.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}&token=${encodeURIComponent(adminToken)}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, "success");
        fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  async function handleAdminRegistration(event) {
    event.preventDefault();

    if (!adminToken) {
      setMessage("Teacher login required to register students.", "error");
      return;
    }

    const form = event.target;
    const activity = form.getAttribute("data-activity");
    const emailInput = form.querySelector(".student-email-input");
    const email = emailInput.value.trim();

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}&token=${encodeURIComponent(adminToken)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, "success");
        form.reset();
        fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage("Failed to register student. Please try again.", "error");
      console.error("Error registering student:", error);\n    }
  }

  async function handleAdminLogin(event) {
    event.preventDefault();

    const username = adminUsernameInput.value.trim();
    const password = adminPasswordInput.value;

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        adminToken = result.token;
        adminUser = result.username;
        renderAdminControls();
        setMessage(result.message, "success");
        adminLoginForm.reset();
        fetchActivities();
      } else {
        setMessage(result.detail || "Unable to sign in.", "error");
      }
    } catch (error) {
      setMessage("Unable to connect to the server.", "error");
      console.error("Error logging in:", error);
    }
  }

  async function handleAdminLogout() {
    if (adminToken) {
      await fetch(`/admin/logout?token=${encodeURIComponent(adminToken)}`, { method: "POST" });
    }
    adminToken = null;
    adminUser = null;
    renderAdminControls();
    setMessage("Logged out.", "info");
    fetchActivities();
  }

  adminToggleButton.addEventListener("click", () => {
    adminLoginForm.classList.toggle("hidden");
  });

  adminLoginForm.addEventListener("submit", handleAdminLogin);
  adminLogoutButton.addEventListener("click", handleAdminLogout);

  renderAdminControls();
  fetchActivities();
});
