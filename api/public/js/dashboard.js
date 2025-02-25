// dashboard.js
import { G } from './globals.js';
import { formatDateTime, applyStatusColor } from './utils.js';
import { checkForJobUpdates, refreshContractorView, updateJobStatus } from './api.js';
import { moveJobToInProgress, showUpdateJobForm } from './jobActions.js';

/**
 * Hide all views, clear polling, etc.
 */
export function resetViews() {
  G.adminView.style.display = "none";
  G.contractorView.style.display = "none";
  G.loginForm.style.display = "none";
  if (G.pollingInterval) {
    clearInterval(G.pollingInterval);
    G.pollingInterval = null;
  }
}

/**
 * Show the appropriate dashboard (admin or contractor).
 */
export function showDashboard(role) {
  resetViews();
  if (role === "admin") {
    G.adminView.style.display = "block";
    populateAdminJobs();
    // Start polling for admin if needed
    if (!G.pollingInterval) {
      G.pollingInterval = setInterval(async () => {
        await checkForJobUpdates();
        // Optionally re-populate if changes are found
        populateAdminJobs();
      }, 2000);
    }
  } else if (role === "contractor") {
    G.contractorView.style.display = "block";
    // In case you only have one contractor, this finds them by role
    const contractor = G.users.find(u => u.role === "contractor")?.username;
    populateContractorJobs(contractor);
    // Start polling for contractor view
    G.pollingInterval = setInterval(async () => {
      await refreshContractorView();
      populateContractorJobs(contractor);
    }, 5000);
  }
}

/**
 * Populate Admin Dashboard (table of jobs).
 */
export function populateAdminJobs() {
  G.adminJobList.innerHTML = "";

  // Check if G.jobs is actually an array
  if (!Array.isArray(G.jobs)) {
    console.error("G.jobs is not an array. Current value:", G.jobs);
    return;
  }

  G.jobs.forEach(job => {
    const lastUpdated = job.statusTimestamp ? formatDateTime(job.statusTimestamp) : "N/A";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${job.workOrder}</td>
      <td>${job.customerName}</td>
      <td>${job.contractor}</td>
      <td class="status-cell">${job.status}</td>
      <td>${lastUpdated}</td>
      <td>
        ${
          job.status === "Completed - Pending Approval" 
            ? `
               <button class="btn btn-success btn-sm approve-job" data-id="${job.id}">Approve</button>
               <button class="btn btn-warning btn-sm reject-job" data-id="${job.id}">Reject</button>
              `
            : "N/A"
        }
      </td>
    `;
    G.adminJobList.appendChild(row);
    applyStatusColor(row.querySelector(".status-cell"), job.status);
  });

  // Approve/Reject buttons
  document.querySelectorAll(".approve-job").forEach(button =>
    button.addEventListener("click", (e) => updateJobStatus(e.target.dataset.id, "Approved"))
  );
  document.querySelectorAll(".reject-job").forEach(button =>
    button.addEventListener("click", (e) => updateJobStatus(e.target.dataset.id, "Pending"))
  );
}

/**
 * Populate Contractor Dashboard (table of jobs).
 */
export function populateContractorJobs(contractor) {
  G.contractorJobList.innerHTML = "";

  // Check if G.jobs is actually an array
  if (!Array.isArray(G.jobs)) {
    console.error("G.jobs is not an array. Current value:", G.jobs);
    return;
  }

  const contractorJobs = G.jobs.filter(job => job.contractor === contractor);
  if (contractorJobs.length === 0) {
    G.contractorJobList.innerHTML = `<tr><td colspan="4">No jobs found for this contractor.</td></tr>`;
    return;
  }

  contractorJobs.forEach(job => {
    const displayStatus = job.contractorStatus || job.status;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${job.workOrder}</td>
      <td>${job.customerName}</td>
      <td>${job.requiredDate}</td> <!-- New column for required date -->
      <td class="status-cell">${displayStatus}</td>
      <td>
        ${
          job.status === "Pending"
            ? `<button class="btn btn-info btn-sm onsite-job" data-id="${job.id}">Onsite</button>`
            : ""
        }
        <button class="btn btn-success btn-sm update-job" data-id="${job.id}">Job Completed</button>
      </td>
    `;
    G.contractorJobList.appendChild(row);
    applyStatusColor(row.querySelector(".status-cell"), displayStatus);
  });

  // Onsite -> moves job to In Progress
  G.contractorJobList.querySelectorAll(".onsite-job").forEach(button =>
    button.addEventListener("click", (e) => moveJobToInProgress(e.target.dataset.id))
  );

  // Show the extended job update form
  G.contractorJobList.querySelectorAll(".update-job").forEach(button =>
    button.addEventListener("click", (e) => showUpdateJobForm(e.target.dataset.id))
  );
}
