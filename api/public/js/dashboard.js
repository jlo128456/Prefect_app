import { G } from './globals.js';
import {  applyStatusColor } from './utils.js';
import { checkForJobUpdates, refreshContractorView, updateJobStatus } from './api.js';
import { moveJobToInProgress, showUpdateJobForm } from './jobActions.js';

/**
 * Show the appropriate dashboard (admin, contractor, or tech).
 */
export function showDashboard(role) {
  // Hide all views first
  G.adminView.style.display = "none";
  G.contractorView.style.display = "none";
  G.techView.style.display = "none";

  // Clear existing polling interval (if any)
  if (G.pollingInterval) {
    clearInterval(G.pollingInterval);
    G.pollingInterval = null;
  }

  if (role === "admin") {
    G.adminView.style.display = "block";
    populateAdminJobs();

    // Start polling for updates if not already
    G.pollingInterval = setInterval(async () => {
      await checkForJobUpdates();
      populateAdminJobs();
    }, 5000);

  } else if (role === "contractor") {
    G.contractorView.style.display = "block";
    // We use the current user's id directly instead of contractor username.
    populateContractorJobs(G.currentUser.id);

    G.pollingInterval = setInterval(async () => {
      await refreshContractorView();
      populateContractorJobs(G.currentUser.id);
    }, 5000);

  } else if (role === "technician") {
    // Show Tech view
    G.techView.style.display = "block";
    populateTechJobs(G.currentUser.id);

    G.pollingInterval = setInterval(async () => {
      await refreshContractorView();
      populateTechJobs(G.currentUser.id);
    }, 5000);
  }
}

/**
 * Populate Admin Dashboard (table of jobs).
 */
export function populateAdminJobs() {
  G.adminJobList.innerHTML = "";

  if (!Array.isArray(G.jobs)) {
    console.error("G.jobs is not an array. Current value:", G.jobs);
    return;
  }

  G.jobs.forEach(job => {
    console.log("Job Data:", job);
    console.log("Work Order:", job.work_order);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${job.work_order ? job.work_order : 'N/A'}</td>
      <td>${job.customer_name ? job.customer_name : 'N/A'}</td>
      <td>${job.contractor ? job.contractor : 'N/A'}</td>
      <td>${job.role ? job.role : 'N/A'}</td>      <!-- Display 'role' here -->
      <td class="status-cell">${job.status ? job.status : 'N/A'}</td>
    `;

    G.adminJobList.appendChild(row);
    applyStatusColor(row.querySelector(".status-cell"), job.status);
  });

  // Approve/Reject event listeners
  document.querySelectorAll(".approve-job").forEach(button =>
    button.addEventListener("click", e => updateJobStatus(e.target.dataset.id, "Approved"))
  );
  document.querySelectorAll(".reject-job").forEach(button =>
    button.addEventListener("click", e => updateJobStatus(e.target.dataset.id, "Pending"))
  );
}
function formatDate(dateInput) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper to format a Date or date string as HH:MM (24-hour clock)
function formatTime(dateInput) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Populate Contractor Dashboard.
 */
export function populateContractorJobs(contractorId) {
  if (contractorId !== G.currentUser.id) {
    console.warn(`Parameter contractorId (${contractorId}) does not match G.currentUser.id (${G.currentUser.id}). Overriding parameter with G.currentUser.id.`);
    contractorId = G.currentUser.id;
  }

  if (!G.contractorJobList) {
    console.error("G.contractorJobList is not defined or not found in the DOM.");
    return;
  }

  G.contractorJobList.innerHTML = "";

  if (!Array.isArray(G.jobs)) {
    console.error("G.jobs is not an array. Current value:", G.jobs);
    return;
  }

  const contractorJobs = G.jobs.filter(job => job.assigned_contractor === contractorId);
  if (contractorJobs.length === 0) {
    G.contractorJobList.innerHTML = `<tr><td colspan="6">No jobs found for this contractor.</td></tr>`;
    return;
  }

  contractorJobs.forEach(job => {
    const requiredDate = job.required_date ? formatDate(job.required_date) : "N/A";
    const loggedTime = job.onsite_time ? formatTime(job.onsite_time) : "Not Logged";
    const displayStatus = job.contractor_status || job.status;

     // Create Google Maps URL
     const encodedAddress = encodeURIComponent(job.customer_address);
     const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="work-order" data-id="${job.id}" style="cursor: pointer;">${job.work_order}</td>
      <td>
        <a href="${mapsUrl}" target="_blank" class="customer-name" data-address="${job.customer_address}" style="cursor: pointer; text-decoration: underline;">
          ${job.customer_name}
        </a>
      </td>
      <td>${requiredDate}</td>
      <td class="status-cell">${displayStatus}</td>
      <td>${loggedTime}</td>
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

  // Event listeners for work order (work required alert)
  document.querySelectorAll(".work-order").forEach(cell =>
    cell.addEventListener("click", e => {
      const jobId = e.target.dataset.id;
      const job = G.jobs.find(j => j.id === jobId);
      if (job) {
        alert(`Work Required: ${job.work_required}`);
      }
    })
  );

  // Event listeners for customer name (display customer address)
  document.querySelectorAll(".customer-name").forEach(cell =>
    cell.addEventListener("click", e => {
      alert(`Customer Address: ${e.target.dataset.address}`);
    })
  );

  // Onsite button event handlers
  document.querySelectorAll(".onsite-job").forEach(button =>
    button.addEventListener("click", e => moveJobToInProgress(e.target.dataset.id))
  );

  // Job Completed button event handlers
  document.querySelectorAll(".update-job").forEach(button =>
    button.addEventListener("click", e => showUpdateJobForm(e.target.dataset.id))
  );
}


/**
 * Populate Tech Dashboard (same structure as Contractor Dashboard).
 */
export function populateTechJobs(techId) {
  if (!G.techJobList) {
    console.error("G.techJobList is not defined or not found in the DOM.");
    return;
  }

  G.techJobList.innerHTML = "";

  if (!Array.isArray(G.jobs)) {
    console.error("G.jobs is not an array. Current value:", G.jobs);
    return;
  }

  const techJobs = G.jobs.filter(job => job.assigned_tech === techId);
  if (techJobs.length === 0) {
    G.techJobList.innerHTML = `<tr><td colspan="7">No jobs found for this technician.</td></tr>`;
    return;
  }

  techJobs.forEach(job => {
    const requiredDate = job.required_date ? formatDate(job.required_date) : "N/A";
    const loggedTime = job.onsite_time ? formatTime(job.onsite_time) : "Not Logged";
    const displayStatus = job.contractor_status || job.status;

      // Create Google Maps URL
      const encodedAddress = encodeURIComponent(job.customer_address);
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="work-order" data-id="${job.id}" style="cursor: pointer;">${job.work_order}</td>
      <td>
        <a href="${mapsUrl}" target="_blank" class="customer-name" data-address="${job.customer_address}" style="cursor: pointer; text-decoration: underline;">
          ${job.customer_name}
        </a>
      </td>
      <td>${requiredDate}</td>
      <td class="status-cell">${displayStatus}</td>
      <td>${loggedTime}</td> 
      <td>
        ${
          job.status === "Pending"
            ? `<button class="btn btn-info btn-sm onsite-job" data-id="${job.id}">Onsite</button>`
            : ""
        }
        <button class="btn btn-success btn-sm update-job" data-id="${job.id}">Job Completed</button>
      </td>
    `;

    G.techJobList.appendChild(row);
    applyStatusColor(row.querySelector(".status-cell"), displayStatus);
  });

  // Event listeners for work order (work required alert)
  document.querySelectorAll(".work-order").forEach(cell =>
    cell.addEventListener("click", e => {
      const jobId = e.target.dataset.id;
      const job = G.jobs.find(j => j.id === jobId);
      if (job) {
        alert(`Work Required: ${job.work_required}`);
      }
    })
  );

  // Event listeners for customer name (display customer address)
  document.querySelectorAll(".customer-name").forEach(cell =>
    cell.addEventListener("click", e => {
      alert(`Customer Address: ${e.target.dataset.address}`);
    })
  );

  // Onsite button event handlers
  document.querySelectorAll(".onsite-job").forEach(button =>
    button.addEventListener("click", e => moveJobToInProgress(e.target.dataset.id))
  );

  // Job Completed button event handlers
  document.querySelectorAll(".update-job").forEach(button =>
    button.addEventListener("click", e => showUpdateJobForm(e.target.dataset.id))
  );
}
