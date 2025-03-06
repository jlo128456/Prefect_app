import { G } from './globals.js';
import { formatDateTime, applyStatusColor } from './utils.js';
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
    const contractor = G.users.find(u => u.role === "contractor")?.username;
    populateContractorJobs(contractor);

    G.pollingInterval = setInterval(async () => {
      await refreshContractorView();
      populateContractorJobs(contractor);
    }, 5000);

  } else if (role === "technician") {
    // Show Tech view
    G.techView.style.display = "block";
    const technician = G.users.find(u => u.role === "technician")?.username;
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

/**
 * Populate Contractor Dashboard.
 */
export function populateContractorJobs(contractorId) {
  // Ensure the contractorId equals G.currentUser.id
  if (contractorId !== G.currentUser.id) {
    console.warn(
      `Parameter contractorId (${contractorId}) does not match G.currentUser.id (${G.currentUser.id}). Overriding parameter with G.currentUser.id.`
    );
    contractorId = G.currentUser.id;
  }
  
  console.log("populateContractorJobs parameter contractorId:", contractorId);

  if (!G.contractorJobList) {
    console.error("G.contractorJobList is not defined or not found in the DOM.");
    return;
  }
  
  G.contractorJobList.innerHTML = "";

  if (!Array.isArray(G.jobs)) {
    console.error("G.jobs is not an array. Current value:", G.jobs);
    return;
  }

  // Log all jobs for debugging
  G.jobs.forEach(job =>
    console.log(`Job ID: ${job.id} | assigned_contractor: "${job.assigned_contractor}"`)
  );

  // Filter jobs by the assigned_contractor field using the enforced contractorId
  const contractorJobs = G.jobs.filter(job => job.assigned_contractor === contractorId);
  console.log("Filtered contractor jobs:", contractorJobs);

  if (contractorJobs.length === 0) {
    G.contractorJobList.innerHTML = `<tr><td colspan="4">No jobs found for this contractor.</td></tr>`;
    return;
  }

  contractorJobs.forEach(job => {
    const displayStatus = job.contractor_status || job.status;
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
    workOrderCell.addEventListener("click", e => {
      e.stopPropagation();
      alert(`Work Required: ${job.work_required}`);
    });

    G.contractorJobList.appendChild(row);
    applyStatusColor(row.querySelector(".status-cell"), displayStatus);
  });

  // Attach event listeners for the onsite and update buttons
  G.contractorJobList.querySelectorAll(".onsite-job").forEach(button =>
    button.addEventListener("click", e => moveJobToInProgress(e.target.dataset.id))
  );
  G.contractorJobList.querySelectorAll(".update-job").forEach(button =>
    button.addEventListener("click", e => showUpdateJobForm(e.target.dataset.id))
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

  // Adjust the filter property if needed (e.g., job.assignedTech instead of job.technician)
  const techJobs = G.jobs.filter(job => job.technician === technician);
  if (techJobs.length === 0) {
    G.techJobList.innerHTML = `<tr><td colspan="7">No jobs found for this technician.</td></tr>`;
    return;
  }

  techJobs.forEach(job => {
    const displayStatus = job.contractor_status || job.status;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${job.work_order}</td>
      <td>${job.customer_name}</td>
      <td>${job.contractor_name || 'N/A'}</td>
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

    // Allow clicking on the work order cell to view work required details
    const workOrderCell = row.querySelector("td:first-child");
    workOrderCell.style.cursor = "pointer";
    workOrderCell.addEventListener("click", e => {
      e.stopPropagation();
      alert(`Work Required: ${job.work_required}`);
    });

    G.techJobList.appendChild(row);
    applyStatusColor(row.querySelector(".status-cell"), displayStatus);
  });

  // Add event listeners for "Onsite" buttons to move the job to In Progress
  G.techJobList.querySelectorAll(".onsite-job").forEach(button =>
    button.addEventListener("click", e => moveJobToInProgress(e.target.dataset.id))
  );

  // Add event listeners for "Job Completed" buttons to show the extended update form
  G.techJobList.querySelectorAll(".update-job").forEach(button =>
    button.addEventListener("click", e => showUpdateJobForm(e.target.dataset.id))
  );
}
