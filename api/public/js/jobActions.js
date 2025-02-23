// jobActions.js
import { G } from './globals.js';
import { populateAdminJobs, populateContractorJobs, showDashboard } from './dashboard.js';

// Replace these with your actual jsonbin IDs.
const JOBS_BIN_URL = 'https://api.jsonbin.io/v3/b/<67bb011be41b4d34e4993fc2 >';
const MACHINES_BIN_URL = 'https://api.jsonbin.io/v3/b/<67bb00f1acd3cb34a8ed73fa >';

/**
 * Move job from Pending -> In Progress -> Completed - Pending Approval
 */
export async function moveJobToInProgress(jobId) {
  try {
    // Fetch entire jobs array from jsonbin
    const jobsResponse = await fetch(JOBS_BIN_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const jobsData = (await jobsResponse.json()).record;
    const job = jobsData.find(j => j.id.toString() === jobId.toString());
    if (!job) {
      alert("Job not found.");
      return;
    }

    let updatedStatus, contractorStatus, statusMessage;

    // Generate formatted timestamp
    const currentTime = new Date();
    const formattedTime = `${String(currentTime.getDate()).padStart(2, "0")}/${
      String(currentTime.getMonth() + 1).padStart(2, "0")}/${currentTime.getFullYear()} ${
      String(currentTime.getHours()).padStart(2, "0")}:${
      String(currentTime.getMinutes()).padStart(2, "0")}:${
      String(currentTime.getSeconds()).padStart(2, "0")}`;

    if (job.status === "Pending") {
      updatedStatus = "In Progress";
      contractorStatus = "In Progress";
      statusMessage = `Job moved to 'In Progress' at ${formattedTime}.`;
    } else if (job.status === "In Progress") {
      updatedStatus = "Completed - Pending Approval";
      contractorStatus = "Completed";
      statusMessage = `Job completed and moved to 'Completed - Pending Approval' at ${formattedTime}.`;
    } else {
      alert("Invalid action: The job is already completed or approved.");
      return;
    }

    // Update the specific job in the jobs array
    const updatedJobs = jobsData.map(j => {
      if (j.id.toString() === jobId.toString()) {
        return {
          ...j,
          status: updatedStatus,
          contractorStatus: contractorStatus,
          statusTimestamp: formattedTime,
          onsiteTime: j.onsiteTime === "N/A" ? formattedTime : j.onsiteTime
        };
      }
      return j;
    });

    // PUT the updated jobs array back to jsonbin
    const putResponse = await fetch(JOBS_BIN_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record: updatedJobs })
    });
    if (!putResponse.ok) throw new Error("Failed to update job status.");

    alert(statusMessage);
    // Update the global jobs list and re-populate both admin and contractor views
    G.jobs = updatedJobs;
    populateAdminJobs();
    populateContractorJobs(job.contractor);
  } catch (error) {
    console.error("Error updating job status:", error);
    alert("Failed to update job status.");
  }
}

/**
 * Show extended job update form (with signature, machine selection, etc.).
 */
export async function showUpdateJobForm(jobId) {
  // Find job in global jobs array (assumes jobs have been loaded already)
  const job = G.jobs.find(j => j.id.toString() === jobId.toString());
  if (!job) {
    alert("Job not found!");
    return;
  }

  // Fetch available machines from jsonbin
  let availableMachines = [];
  try {
    const machinesResponse = await fetch(MACHINES_BIN_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    availableMachines = (await machinesResponse.json()).record;
  } catch (error) {
    console.error("Error fetching machines:", error);
  }

  // Remove any existing form or overlay
  const existingForm = document.getElementById("updateJobContainer");
  const existingOverlay = document.getElementById("modalOverlay");
  if (existingForm) existingForm.remove();
  if (existingOverlay) existingOverlay.remove();

  // Hide main views
  G.adminView.style.display = "none";
  G.contractorView.style.display = "none";

  // Create overlay
  const modalOverlay = document.createElement("div");
  modalOverlay.id = "modalOverlay";
  Object.assign(modalOverlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.5)",
    zIndex: "999",
  });
  document.body.appendChild(modalOverlay);

  // For contractors, hide the status dropdown (always "Completed")
  const statusField = G.currentUserRole === "contractor"
    ? `<input type="hidden" id="jobStatus" value="Completed">`
    : `
      <select id="jobStatus" required>
        <option value="Pending" ${job.status === "Pending" ? "selected" : ""}>Pending</option>
        <option value="In Progress" ${job.status === "In Progress" ? "selected" : ""}>In Progress</option>
        <option value="Completed - Pending Approval" ${job.status === "Completed - Pending Approval" ? "selected" : ""}>Completed - Pending Approval</option>
      </select>
    `;

  // Build the update form HTML
  const formHTML = `
    <div id="updateJobContainer">
      <h3>Update Work Order: ${job.workOrder}</h3>
      <form id="updateJobForm">
        <div>
          <label>Customer Name</label>
          <input type="text" id="customerName" value="${job.customerName}" required>
        </div>
        <div>
          <label>Contact Name</label>
          <input type="text" id="contactName" value="${job.contactName || ""}" required>
        </div>
        <div>
          <label>Travel Time (hours)</label>
          <input type="number" id="travelTime" min="0" step="0.5" value="${job.travelTime || 0}" required>
        </div>
        <div>
          <label>Labour Time (hours)</label>
          <input type="number" id="labourTime" min="0" step="0.5" value="${job.labourTime || 0}" required>
        </div>
        <div>
          <label>Work Performed</label>
          <select id="workPerformedDropdown">
            <option value="">Select Common Work Performed</option>
            <option value="Routine Maintenance">Routine Maintenance</option>
            <option value="Software Update">Software Updated</option>
            <option value="Parts Replacement">Parts Replacement</option>
            <option value="Hardware Repair">Hardware Repair</option>
            <option value="System Calibration">Sensors Calibration</option>
          </select>
          <textarea id="workPerformed" rows="3" required>${job.workPerformed || ""}</textarea>
        </div>
        <div>
          <label>Select Machines</label>
          <select id="machineSelect">
            <option value="">Select Machine</option>
            ${availableMachines.map(machine => `<option value="${machine.machineId}">${machine.machineType} - ${machine.model}</option>`).join("")}
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
        <div>
          <label>Job Status</label>
          ${statusField}
        </div>
        <div>
          <label>Completion Date</label>
          <input type="date" id="completionDate" value="${job.completionDate || ""}" required>
        </div>
        <div>
          <label>Checklist</label>
          <div>
            <input type="checkbox" id="checkScrews" ${job.checklist?.noMissingScrews ? "checked" : ""}> No Missing Screws
            <input type="checkbox" id="checkSoftwareUpdated" ${job.checklist?.softwareUpdated ? "checked" : ""}> Software Updated
            <input type="checkbox" id="checkTested" ${job.checklist?.tested ? "checked" : ""}> Tested
            <input type="checkbox" id="checkApproved" ${job.checklist?.approvedByManagement ? "checked" : ""}> Approved by Management
          </div>
        </div>
        <div>
          <label>Signature</label>
          <canvas id="signatureCanvas" width="400" height="150" style="border: 1px solid black;"></canvas>
          <button type="button" id="clearSignature">Clear Signature</button>
        </div>
        <button type="submit">Save</button>
      </form>
      <button type="button" id="backToDashboard">Back to Dashboard</button>
    </div>
  `;

  // Insert form into the DOM
  const updateFormContainer = document.createElement("div");
  updateFormContainer.innerHTML = formHTML;
  document.body.appendChild(updateFormContainer);

  // --- Signature Pad Setup ---
  const signatureCanvas = document.getElementById("signatureCanvas");
  const ctx = signatureCanvas.getContext("2d");
  let isDrawing = false;

  // Load existing signature if available
  if (job.signature) {
    const img = new Image();
    img.src = job.signature;
    img.onload = () => ctx.drawImage(img, 0, 0);
  }

  signatureCanvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  });
  signatureCanvas.addEventListener("mouseup", () => (isDrawing = false));
  signatureCanvas.addEventListener("mousemove", (e) => {
    if (!isDrawing) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
  });

  document.getElementById("clearSignature").addEventListener("click", () => {
    ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  });

  // Work Performed dropdown logic
  document.getElementById("workPerformedDropdown").addEventListener("change", function() {
    const selectedPhrase = this.value;
    const textarea = document.getElementById("workPerformed");
    if (selectedPhrase) {
      textarea.value += selectedPhrase + "\n";
    }
  });

  // Add Machine functionality
  document.getElementById("addMachine").addEventListener("click", () => {
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

  // Remove Machine functionality
  document.getElementById("machineList").addEventListener("click", (event) => {
    if (event.target.classList.contains("remove-machine")) {
      event.target.parentElement.remove();
    }
  });

  // Handle form submission: update the job and write back the updated jobs array to jsonbin
  document.getElementById("updateJobForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    let newStatus = document.getElementById("jobStatus").value;
    let newContractorStatus = newStatus;

    // For contractors, if finishing the job, adjust statuses
    if (G.currentUserRole === "contractor" && newStatus === "Completed") {
      newStatus = "Completed - Pending Approval";
      newContractorStatus = "Completed";
    }

    // Gather selected machines
    const updatedMachines = [...document.querySelectorAll(".machine-entry")].map(machine => ({
      id: machine.getAttribute("data-id"),
      name: machine.querySelector("strong").innerText,
      notes: machine.querySelector(".machine-notes").value,
      partsUsed: machine.querySelector(".machine-parts").value,
    }));

    // Convert the signature to base64
    const signatureData = signatureCanvas.toDataURL("image/png");

    const updatedJobData = {
      customerName: document.getElementById("customerName").value.trim(),
      contactName: document.getElementById("contactName").value.trim(),
      workPerformed: document.getElementById("workPerformed").value.trim(),
      travelTime: document.getElementById("travelTime").value,
      labourTime: document.getElementById("labourTime").value,
      status: newStatus,
      contractorStatus: newContractorStatus,
      completionDate: document.getElementById("completionDate").value,
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
      // Fetch current jobs from jsonbin
      const jobsResponse = await fetch(JOBS_BIN_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const jobsData = (await jobsResponse.json()).record;

      // Update the specific job with the new data
      const updatedJobs = jobsData.map(j => {
        if (j.id.toString() === job.id.toString()) {
          return { ...j, ...updatedJobData };
        }
        return j;
      });

      // PUT the updated jobs array back to jsonbin
      const putResponse = await fetch(JOBS_BIN_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record: updatedJobs })
      });
      if (!putResponse.ok) throw new Error("Failed to update job.");

      alert("Job updated successfully and submitted for admin approval.");
      updateFormContainer.remove();
      modalOverlay.remove();
      showDashboard(G.currentUserRole);
    } catch (error) {
      console.error("Error updating job:", error);
      alert("Failed to update the job.");
    }
  });

  // Back to Dashboard button
  document.getElementById("backToDashboard").addEventListener("click", () => {
    updateFormContainer.remove();
    modalOverlay.remove();
    showDashboard(G.currentUserRole);
  });
}
