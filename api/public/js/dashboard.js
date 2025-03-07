import { G } from './globals.js';
import { formatForDisplay, applyStatusColor } from './utils.js';
import { API_BASE_URL } from './api.js';  // <-- Import the base URL
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
 * Populate Admin Dashboard (renders table + sets up the modal form).
 */
export async function populateAdminJobs() {
  // 1) Clear out existing rows first
  G.adminJobList.innerHTML = "";

  // 2) If needed, fetch latest jobs from server:
  // const jobs = await fetch(`${API_BASE_URL}/api/jobs`).then(res => res.json());
  // G.jobs = jobs;

  if (!Array.isArray(G.jobs)) {
    console.error("G.jobs is not an array. Current value:", G.jobs);
    return;
  }

  // 3) Render each job as a table row, including work_required
  G.jobs.forEach((job) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${job.work_order || 'N/A'}</td>
      <td>${job.customer_name || 'N/A'}</td>
      <td>${job.contractor || 'N/A'}</td>
      <td>${job.work_required || 'N/A'}</td>
      <td>${job.role || 'N/A'}</td>
      <td class="status-cell">${job.status || 'N/A'}</td>
      <td>${job.last_updated || ''}</td>
      <td>
        <button class="approve-job" data-id="${job.id}">Approve</button>
        <button class="reject-job" data-id="${job.id}">Reject</button>
      </td>
    `;
    G.adminJobList.appendChild(row);

    // Apply color styling if desired
    applyStatusColor(row.querySelector(".status-cell"), job.status);
  });

  // 4) Approve/Reject event listeners
  document.querySelectorAll(".approve-job").forEach((button) =>
    button.addEventListener("click", (e) =>
      updateJobStatus(e.target.dataset.id, "Approved")
    )
  );
  document.querySelectorAll(".reject-job").forEach((button) =>
    button.addEventListener("click", (e) =>
      updateJobStatus(e.target.dataset.id, "Pending")
    )
  );

  // 5) Setup the "Create New Job" modal logic (open/close) + form submission
  setupCreateJobModal();
}

/** 
 * Initialize the Create Job modal logic and form submission 
 */
function setupCreateJobModal() {
  const openModalBtn = document.getElementById("openCreateJobModal");
  const closeOverlay = document.getElementById("closeModalOverlay");
  const closeBtn = document.getElementById("closeCreateJobModal");
  const modal = document.getElementById("createJobModal");
  const addJobForm = document.getElementById("admin-add-job-form");

  // Show the modal when "Create New Job" button is clicked
  openModalBtn.addEventListener("click", () => {
    console.log("Create New Job button clicked!");
    modal.style.display = "block";
  });

  // Hide the modal if user clicks the overlay or the close button
  closeOverlay.addEventListener("click", () => {
    modal.style.display = "none";
  });
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Attach form submit (only once)
  if (!addJobForm.dataset.listenerAttached) {
    addJobForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Collect form values (including work_required)
      const workOrder = document.getElementById("work_order").value.trim();
      const customerName = document.getElementById("customer_name").value.trim();
      const contractor = document.getElementById("contractor").value.trim();
      const workRequired = document.getElementById("work_required").value.trim();
      const role = document.getElementById("role").value;

      // Build new job object with work_required
      const newJob = {
        work_order: workOrder,
        customer_name: customerName,
        contractor,
        work_required: workRequired,
        role,
        status: "Pending"
      };

      try {
        // POST to your server
        const response = await fetch(`${API_BASE_URL}/api/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newJob),
        });

        if (!response.ok) {
          throw new Error(`Error creating job: ${response.status}`);
        }

        // Returned newly inserted job from MySQL (including new ID)
        const createdJob = await response.json();

        // Add to our local array
        G.jobs.push(createdJob);

        // Refresh the table
        populateAdminJobs();

        // Close the modal and clear the form
        modal.style.display = "none";
        addJobForm.reset();

      } catch (err) {
        console.error("Create job failed:", err);
        alert("Failed to create job, see console for details.");
      }
    });

    addJobForm.dataset.listenerAttached = "true";
  }
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
    const requiredDate = job.required_date ? formatForDisplay(job.required_date) : "N/A";
    const loggedTime = job.onsite_time ? formatForDisplay(job.onsite_time) : "Not Logged";
    const displayStatus = job.contractor_status || job.status;

     // Create Google Maps URL
     const encodedAddress = encodeURIComponent(job.customer_address);
     const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

     function formatForMySQL(dateInput) {
      if (!dateInput) return null; // Ensure NULL values are handled
    
      const date = new Date(dateInput);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    }
    

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
    const requiredDate = job.required_date ? formatForDisplay(job.required_date) : "N/A";
    const loggedTime = job.onsite_time ? formatForDisplay(job.onsite_time) : "Not Logged";
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
