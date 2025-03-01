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
  G.techView.style.display = "none";
  G.loginForm.style.display = "none";
  if (G.pollingInterval) {
    clearInterval(G.pollingInterval);
    G.pollingInterval = null;
  }
}

/**
 * Show the appropriate dashboard (admin, contractor, or tech).
 */
export function showDashboard(role) {
  resetViews();
  if (role === "admin") {
    G.adminView.style.display = "block";
    populateAdminJobs();
    if (!G.pollingInterval) {
      G.pollingInterval = setInterval(async () => {
        await checkForJobUpdates();
        populateAdminJobs();
      }, 2000);
    }
  } else if (role === "contractor") {
    G.contractorView.style.display = "block";
    const contractor = G.users.find(u => u.role === "contractor")?.username;
    populateContractorJobs(contractor);
    G.pollingInterval = setInterval(async () => {
      await refreshContractorView();
      populateContractorJobs(contractor);
    }, 5000);
  } else if (role === "tech") {
    G.techView.style.display = "block";
    const technician = G.users.find(u => u.role === "tech")?.username;
    populateTechJobs(technician);
    G.pollingInterval = setInterval(async () => {
      await refreshContractorView();
      populateTechJobs(technician);
    }, 5000);
  }
}

/**
 * Populate Admin Dashboard (table of jobs).
 */
export function populateAdminJobs() {
  G.adminJobList.innerHTML = "";
  if (!Array.isArray(G.jobs)) {
    console.error("❌ G.jobs is not an array. Current value:", G.jobs);
    return;
  }
  G.jobs.forEach(job => {
    console.log("✅ Job Data:", job);
    console.log("Work Order:", job.work_order);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${job.work_order ? job.work_order : 'N/A'}</td>
      <td>${job.customer_name ? job.customer_name : 'N/A'}</td>
      <td>${job.contractor ? job.contractor : 'N/A'}</td>
      <td class="status-cell">${job.status ? job.status : 'N/A'}</td>
    `;
    G.adminJobList.appendChild(row);
    applyStatusColor(row.querySelector(".status-cell"), job.status);
  });
}

/**
 * Populate Contractor Dashboard.
 */
export function populateContractorJobs(contractor) {
  G.contractorJobList.innerHTML = "";
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
      <td>${job.requiredDate}</td>
      <td>${job.onsitetime ? job.onsite_time : "Not Logged"}</td>
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
    const workOrderCell = row.querySelector("td:first-child");
    workOrderCell.style.cursor = "pointer";
    workOrderCell.addEventListener("click", (e) => {
      e.stopPropagation();
      alert(`Work Required: ${job.work_Required}`);
    });
    G.contractorJobList.appendChild(row);
    applyStatusColor(row.querySelector(".status-cell"), displayStatus);
  });
  G.contractorJobList.querySelectorAll(".onsite-job").forEach(button =>
    button.addEventListener("click", (e) => moveJobToInProgress(e.target.dataset.id))
  );
  G.contractorJobList.querySelectorAll(".update-job").forEach(button =>
    button.addEventListener("click", (e) => showUpdateJobForm(e.target.dataset.id))
  );
}

/**
 * Populate Tech Dashboard (same structure as Contractor Dashboard).
 */
export function populateTechJobs(technician) {
  G.techJobList.innerHTML = "";
  if (!Array.isArray(G.jobs)) {
    console.error("G.jobs is not an array. Current value:", G.jobs);
    return;
  }
  const techJobs = G.jobs.filter(job => job.technician === technician);
  if (techJobs.length === 0) {
    G.techJobList.innerHTML = `<tr><td colspan="4">No jobs found for this technician.</td></tr>`;
    return;
  }
  techJobs.forEach(job => {
    const displayStatus = job.contractorStatus || job.status;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${job.work_order}</td>
      <td>${job.customer_name}</td>
      <td>${job.required_date}</td>
      <td>${job.onsite_time ? job.onsite_time : "Not Logged"}</td>
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
    const workOrderCell = row.querySelector("td:first-child");
    workOrderCell.style.cursor = "pointer";
    workOrderCell.addEventListener("click", (e) => {
      e.stopPropagation();
      alert(`Work Required: ${job.work_required}`);
    });
    G.techJobList.appendChild(row);
    applyStatusColor(row.querySelector(".status-cell"), displayStatus);
  });
  G.techJobList.querySelectorAll(".onsite-job").forEach(button =>
    button.addEventListener("click", (e) => moveJobToInProgress(e.target.dataset.id))
  );
  G.techJobList.querySelectorAll(".update-job").forEach(button =>
    button.addEventListener("click", (e) => showUpdateJobForm(e.target.dataset.id))
  );
}