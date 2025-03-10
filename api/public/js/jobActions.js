import { G } from './globals.js';
import { populateAdminJobs, populateContractorJobs, populateTechJobs, showDashboard } from './dashboard.js';

// Base URL for your backend API on Render
const API_BASE_URL = 'https://prefect-app.onrender.com';

/**
 * Show Admin Review Modal (Approve or Reject)
 */
export async function showAdminReviewModal(id) {
  try {
    const jobResponse = await fetch(`${API_BASE_URL}/jobs/${id}`);
    if (!jobResponse.ok) {
      throw new Error("Failed to fetch job data.");
    }
    const job = await jobResponse.json();

    // Remove any existing modal
    const existingModal = document.getElementById("adminReviewModal");
    if (existingModal) existingModal.remove();

    // Create modal container
    const modal = document.createElement("div");
    modal.id = "adminReviewModal";
    modal.classList.add("modal");

    // Make it fullscreen + centered with overlay
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.background = "rgba(0, 0, 0, 0.7)";
    modal.style.zIndex = "9999";

    // Build content with contractor updates
    const modalContent = `
      <div class="modal-content">
        <span class="close-button" id="closeReviewModal">&times;</span>
        <h3>Review Job: ${job.work_order}</h3>
        
        <p><strong>Contractor:</strong> ${job.contractor}</p>
        <p><strong>Work Performed:</strong> ${job.work_performed || ""}</p>
        <p><strong>Note Count:</strong> ${job.note_count || 0}</p>
        <p><strong>Travel Time:</strong> ${job.travel_time || 0} hours</p>
        <p><strong>Labour Time:</strong> ${job.labour_time || 0} hours</p>

        <!-- Show signature if available -->
        ${
          job.signature
            ? `<img src="${job.signature}" alt="Signature" style="max-width: 100%; border: 1px solid #ccc;" />`
            : `<p>No signature provided</p>`
        }

        <button id="approveReviewBtn">Approve</button>
        <button id="rejectReviewBtn">Reject</button>
      </div>
    `;

    modal.innerHTML = modalContent;
    document.body.appendChild(modal);

    // Close modal
    document.getElementById("closeReviewModal").addEventListener("click", () => {
      modal.remove();
    });

    // Approve/Reject logic
    document.getElementById("approveReviewBtn").addEventListener("click", async () => {
      await updateJobStatus(id, "Approved");
      modal.remove();
    });
    document.getElementById("rejectReviewBtn").addEventListener("click", async () => {
      await updateJobStatus(id, "Rejected");
      modal.remove();
    });
  } catch (err) {
    console.error("Error showing admin review form:", err);
    alert("Failed to load job details.");
  }
}

/**
 * Move job from Pending -> In Progress -> Completed - Pending Approval.
 * All references now in snake_case.
 */
export async function moveJobToInProgress(id) {
  console.log(`Moving Job ID: ${id} to "In Progress"...`);

  try {
    const response = await fetch(`${API_BASE_URL}/jobs/${id}`);
    if (!response.ok) throw new Error("Failed to fetch job data.");

    const job = await response.json();
    console.log("Current job details:", job);

    // Helper to format date/time for MySQL (YYYY-MM-DD HH:MM:SS)
    function formatForMySQL(dateInput) {
      if (!dateInput) return null;
      const date = new Date(dateInput);
      return `${date.getFullYear()}-${
        String(date.getMonth() + 1).padStart(2, '0')
      }-${
        String(date.getDate()).padStart(2, '0')
      } ${
        String(date.getHours()).padStart(2, '0')
      }:${
        String(date.getMinutes()).padStart(2, '0')
      }:${
        String(date.getSeconds()).padStart(2, '0')
      }`;
    }

    // Helper to format date/time for UI
    function formatForDisplay(dateInput) {
      if (!dateInput) return "Not Logged";
      const date = new Date(dateInput);
      return `${String(date.getDate()).padStart(2, '0')}-${
        String(date.getMonth() + 1).padStart(2, '0')
      }-${
        date.getFullYear()
      } ${
        String(date.getHours()).padStart(2, '0')
      }:${
        String(date.getMinutes()).padStart(2, '0')
      }:${
        String(date.getSeconds()).padStart(2, '0')
      }`;
    }

    // Generate formatted timestamp
    const formattedTime = formatForMySQL(new Date());

    let updatedStatus, contractorStatus, statusMessage;

    if (job.status === "Pending") {
      updatedStatus = "In Progress";
      contractorStatus = "In Progress";
      statusMessage = `Job moved to 'In Progress' at ${formatForDisplay(formattedTime)}.`;
    } else if (job.status === "In Progress") {
      updatedStatus = "Completed - Pending Approval";
      contractorStatus = "Completed";
      statusMessage = `Job completed and moved to 'Completed - Pending Approval' at ${formatForDisplay(formattedTime)}.`;
    } else {
      console.error("Invalid action: The job is already completed or approved.");
      return;
    }

    // Set `onsite_time` only if it was not previously set
    const onsiteTime = (!job.onsite_time || job.onsite_time === "N/A")
      ? formattedTime
      : job.onsite_time;

    // Prepare the updated job object
    const updatedJob = {
      ...job,
      status: updatedStatus,
      contractor_status: contractorStatus,
      status_timestamp: formattedTime,
      onsite_time: onsiteTime
    };

    console.log("Updating job with new details:", updatedJob);

    // Send the updated job data to the API
    const putResponse = await fetch(`${API_BASE_URL}/jobs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedJob),
    });

    if (!putResponse.ok) {
      throw new Error("Failed to update job status.");
    }

    console.log(`Job ${id} updated successfully.`);
    alert(statusMessage);

    // Refresh UI
    populateAdminJobs(G.jobs);
    populateContractorJobs(G.currentUser.id);
    populateTechJobs(G.currentUser.id);

  } catch (error) {
    console.error("Error updating job status:", error);
    alert("Failed to update job status.");
  }
}

/**
 * Get local time in MySQL format (YYYY-MM-DD HH:MM:SS)
 */
function getLocalMySQLTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Update the status of a job (Approved, Rejected, In Progress, etc.)
 */
export async function updateJobStatus(id, newStatus) {
  try {
    const nowLocalMySQL = getLocalMySQLTime();

    // Fetch existing job details
    const jobResponse = await fetch(`${API_BASE_URL}/jobs/${id}`);
    const jobData = await jobResponse.json();

    const updateData = {
      status: newStatus,
      lastUpdated: nowLocalMySQL,
    };

    // Only set `logged_time` if moving to "In Progress" and it's not already set
    if (newStatus === "In Progress" && !jobData.logged_time) {
      updateData.logged_time = nowLocalMySQL;
    }

    const response = await fetch(`${API_BASE_URL}/jobs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error("Failed to update job status.");
    }

    alert(`Job status updated to: ${newStatus}`);

    // Refresh Admin & Contractor Views
    populateAdminJobs();
    populateContractorJobs(G.currentUser.id);
    populateTechJobs(G.currentUser.id);

  } catch (error) {
    console.error("updateJobStatus error:", error);
    alert("Could not update job status. Check console for details.");
  }
}

/**
 * Show extended job update form (with signature, machine selection, etc.).
 * All references now in snake_case.
 */
export async function showUpdateJobForm(id) {
  try {
    console.log("showUpdateJobForm called with id:", id);

    // Fetch the job record from the API.
    const jobResponse = await fetch(`${API_BASE_URL}/jobs/${id}`);
    if (!jobResponse.ok) {
      console.error("Job not found!");
      return;
    }
    const job = await jobResponse.json();
    console.log("Fetched job:", job);

    // Fetch available machines from the API.
    const machinesResponse = await fetch(`${API_BASE_URL}/machines`);
    let availableMachines = [];
    if (machinesResponse.ok) {
      availableMachines = await machinesResponse.json();
    } else {
      console.error("Error fetching machines:", machinesResponse.statusText);
    }

    // Remove any existing update modal.
    const existingModal = document.getElementById("updateJobModal");
    if (existingModal) existingModal.remove();

    // Hide main views.
    if (G.adminView) G.adminView.style.display = "none";
    if (G.contractorView) G.contractorView.style.display = "none";
    if (G.techView) G.techView.style.display = "none";

    // Create a modal container using your CSS classes.
    const modalContainer = document.createElement("div");
    modalContainer.id = "updateJobModal";
    modalContainer.classList.add("modal");

    // Make it fullscreen + centered with overlay
    modalContainer.style.display = "flex";
    modalContainer.style.alignItems = "center";
    modalContainer.style.justifyContent = "center";
    modalContainer.style.position = "fixed";
    modalContainer.style.top = "0";
    modalContainer.style.left = "0";
    modalContainer.style.width = "100%";
    modalContainer.style.height = "100%";
    modalContainer.style.background = "rgba(0, 0, 0, 0.7)";
    modalContainer.style.zIndex = "9999";

    // Create the modal content container.
    const modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");
    // You can set a max width/height here to keep content contained:
    // modalContent.style.maxWidth = "600px";
    // modalContent.style.maxHeight = "80%";
    // modalContent.style.overflowY = "auto";

    // Determine the status field HTML.
    const statusField =
      G.currentUserRole === "contractor"
        ? `<input type="hidden" id="jobStatus" value="Completed">`
        : `
          <select id="jobStatus" required>
            <option value="Pending" ${job.status === "Pending" ? "selected" : ""}>Pending</option>
            <option value="In Progress" ${job.status === "In Progress" ? "selected" : ""}>In Progress</option>
            <option value="Completed - Pending Approval" ${job.status === "Completed - Pending Approval" ? "selected" : ""}>Completed - Pending Approval</option>
          </select>
        `;

    // Build the update form HTML.
    const formHTML = `
      <div id="updateJobContainerInner">
        <span class="close-button" id="closeUpdateModal">&times;</span>
        <h3>Update Work Order: ${job.work_order}</h3>
        <form id="updateJobForm">
          <div class="form-row">
            <label>Customer Name</label>
            <input type="text" id="customerName" value="${job.customer_name}" required>
          </div>
          <div class="form-row">
            <label>Contact Name</label>
            <input type="text" id="contactName" value="${job.contact_name || ''}" required>
          </div>
          <div class="form-row">
            <label>Travel Time (hours)</label>
            <input type="number" id="travelTime" min="0" step="0.5" value="${job.travel_time || 0}" required>
          </div>
          <div class="form-row">
            <label>Labour Time (hours)</label>
            <input type="number" id="labourTime" min="0" step="0.5" value="${job.labour_time || 0}" required>
          </div>
          <div class="form-row">
            <label>Note Count</label>
            <input type="number" id="note_count" value="${job.note_count || ''}" required>
          </div>
          <div class="form-row">
            <label>Work Performed</label>
            <select id="workPerformedDropdown">
              <option value="">Select Common Work Performed</option>
              <option value="Routine Maintenance">Routine Maintenance</option>
              <option value="Software Update">Software Update</option>
              <option value="Parts Replacement">Parts Replacement</option>
              <option value="Hardware Repair">Hardware Repair</option>
              <option value="System Calibration">System Calibration</option>
            </select>
            <textarea id="workPerformed" rows="3" required>${job.work_performed || ''}</textarea>
          </div>
          <div class="form-row">
            <label>Select Machines</label>
            <select id="machineSelect">
              <option value="">Select Machine</option>
              ${availableMachines.map(machine => `
                <option value="${machine.machineId}">
                  ${machine.machineType} - ${machine.model}
                </option>
              `).join('')}
            </select>
            <button type="button" id="addMachine">Add Machine</button>
          </div>
          <div id="machineList">
            ${
              Array.isArray(job.machines)
                ? job.machines.map(machineId => {
                    const machine = availableMachines.find(m => m.machineId === machineId);
                    if (!machine) return "";
                    return `
                      <div class="machine-entry" data-id="${machine.machineId}">
                        <strong>${machine.machineType} - ${machine.model}</strong>
                        <label>Notes:</label>
                        <textarea class="machine-notes">${machine.notes || ""}</textarea>
                        <label>Parts Used:</label>
                        <input type="text" class="machine-parts" value="${machine.partsUsed || ""}">
                        <button type="button" class="remove-machine">Remove</button>
                      </div>
                    `;
                  }).join("")
                : ""
            }
          </div>
          <div class="form-row">
            <label>Job Status</label>
            ${statusField}
          </div>
          <div class="form-row">
            <label>Completion Date</label>
            <input type="date" id="completionDate" value="${job.completion_date || ''}" required>
          </div>
          <div class="form-row">
            <label>Checklist</label>
            <div>
              <input type="checkbox" id="checkScrews" ${job.checklist?.noMissingScrews ? "checked" : ""}> No Missing Screws
              <input type="checkbox" id="checkSoftwareUpdated" ${job.checklist?.softwareUpdated ? "checked" : ""}> Software Updated
              <input type="checkbox" id="checkTested" ${job.checklist?.tested ? "checked" : ""}> Tested
              <input type="checkbox" id="checkApproved" ${job.checklist?.approvedByManagement ? "checked" : ""}> Approved by Management
            </div>
          </div>
          <div class="form-row">
            <label>Signature</label>
            <canvas id="signatureCanvas" width="400" height="150" style="border: 1px solid black;"></canvas>
            <button type="button" id="clearSignature">Clear Signature</button>
          </div>
          <button type="submit">Save</button>
        </form>
        <button type="button" id="backToDashboard">Back to Dashboard</button>
      </div>
    `;

    // Set the modal content
    modalContent.innerHTML = formHTML;
    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);

    // --- Close Modal Button Logic ---
    const closeBtn = document.getElementById("closeUpdateModal");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modalContainer.remove();
        showDashboard(G.currentUserRole);
      });
    } else {
      console.error("Close button not found");
    }

    // --- Work Performed Dropdown Logic ---
    const workPerformedDropdown = document.getElementById("workPerformedDropdown");
    if (workPerformedDropdown) {
      workPerformedDropdown.addEventListener("change", function () {
        const selectedPhrase = this.value;
        if (selectedPhrase) {
          const textarea = document.getElementById("workPerformed");
          textarea.value += selectedPhrase + "\n";
          this.value = ""; // Reset dropdown
        }
      });
    } else {
      console.error("workPerformedDropdown element not found");
    }

    // --- Signature Pad Setup ---
    const signatureCanvas = document.getElementById("signatureCanvas");
    const ctx = signatureCanvas.getContext("2d");
    let isDrawing = false;

    // If job already has a signature in DB, load it
    if (job.signature) {
      const img = new Image();
      img.src = job.signature;
      img.onload = () => ctx.drawImage(img, 0, 0);
    }

    signatureCanvas.addEventListener("mousedown", e => {
      isDrawing = true;
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    });
    signatureCanvas.addEventListener("mouseup", () => (isDrawing = false));
    signatureCanvas.addEventListener("mousemove", e => {
      if (!isDrawing) return;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "black";
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    });

    const clearSignatureBtn = document.getElementById("clearSignature");
    if (clearSignatureBtn) {
      clearSignatureBtn.addEventListener("click", () => {
        ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
      });
    }

    // --- Machine Add/Remove Functionality ---
    const addMachineBtn = document.getElementById("addMachine");
    addMachineBtn.addEventListener("click", () => {
      const machineSelect = document.getElementById("machineSelect");
      const selectedMachineId = machineSelect.value;
      const selectedMachineName = machineSelect.options[machineSelect.selectedIndex].text;

      if (!selectedMachineId) {
        alert("Please select a machine!");
        return;
      }
      const machineList = document.getElementById("machineList");
      if (document.querySelector(`[data-id="${selectedMachineId}"]`)) {
        alert("Machine already added!");
        return;
      }
      const machineEntry = document.createElement("div");
      machineEntry.classList.add("machine-entry");
      machineEntry.setAttribute("data-id", selectedMachineId);
      machineEntry.innerHTML = `
        <strong>${selectedMachineName}</strong>
        <label>Notes:</label>
        <textarea class="machine-notes"></textarea>
        <label>Parts Used:</label>
        <input type="text" class="machine-parts">
        <button type="button" class="remove-machine">Remove</button>
      `;
      machineList.appendChild(machineEntry);
    });

    document.getElementById("machineList").addEventListener("click", event => {
      if (event.target.classList.contains("remove-machine")) {
        event.target.parentElement.remove();
      }
    });

    // --- Handle Update Form Submission ---
    document.getElementById("updateJobForm").addEventListener("submit", async e => {
      e.preventDefault();
      let newStatus = document.getElementById("jobStatus").value;
      let newContractorStatus = newStatus;

      // If contractor sets "Completed", override main status
      if (G.currentUserRole === "contractor" && newStatus === "Completed") {
        newStatus = "Completed - Pending Approval";
        newContractorStatus = "Completed";
      }

      const noteCount = document.getElementById("note_count").value;

      // Collect updated machine data
      const updatedMachines = [...document.querySelectorAll(".machine-entry")].map(machine => ({
        id: machine.getAttribute("data-id"),
        name: machine.querySelector("strong").innerText,
        notes: machine.querySelector(".machine-notes").value,
        partsUsed: machine.querySelector(".machine-parts").value,
      }));

      // Convert the signature canvas to a Base64 image
      const signatureData = signatureCanvas.toDataURL("image/png");

      // Build updated job data
      const updatedJobData = {
        customer_name: document.getElementById("customerName").value.trim(),
        contact_name: document.getElementById("contactName").value.trim(),
        work_performed: document.getElementById("workPerformed").value.trim(),
        travel_time: document.getElementById("travelTime").value,
        labour_time: document.getElementById("labourTime").value,
        note_count: noteCount,
        status: newStatus,
        contractor_status: newContractorStatus,
        completion_date: document.getElementById("completionDate").value,
        checklist: {
          noMissingScrews: document.getElementById("checkScrews").checked,
          softwareUpdated: document.getElementById("checkSoftwareUpdated").checked,
          tested: document.getElementById("checkTested").checked,
          approvedByManagement: document.getElementById("checkApproved").checked,
        },
        signature: signatureData,
        machines: updatedMachines,
      };

      try {
        // Merge updated data with existing job object
        const updatedJob = { ...job, ...updatedJobData };

        // Send a PUT request to update the job
        const putResponse = await fetch(`${API_BASE_URL}/jobs/${job.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedJob),
        });

        if (!putResponse.ok) throw new Error("Failed to update job.");

        alert("Job updated successfully and submitted for admin approval.");
        modalContainer.remove();
        showDashboard(G.currentUserRole);
      } catch (error) {
        console.error("Error updating job:", error);
        alert("Failed to update the job.");
      }
    });

    // --- Back to Dashboard Button ---
    const backBtn = document.getElementById("backToDashboard");
    backBtn.addEventListener("click", () => {
      modalContainer.remove();
      showDashboard(G.currentUserRole);
    });

  } catch (error) {
    console.error("Error showing update form:", error);
    alert("Failed to load job data.");
  }
}
