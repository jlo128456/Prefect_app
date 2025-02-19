document.addEventListener("DOMContentLoaded", async () => {
  let users = [];
  let jobs = [];
  let pollingInterval = null;
  
  const loginForm = document.getElementById("loginForm");
  const adminView = document.getElementById("adminView");
  const contractorView = document.getElementById("contractorView");
  const contractorJobList = document.getElementById("contractorJobList");
  const adminJobList = document.getElementById("adminJobList");
  
  let currentUserRole = null;

  // Load JSON data from the JSON server
  async function loadData() {
    try {
      const usersResponse = await fetch('http://localhost:3000/users');
      const jobsResponse = await fetch('http://localhost:3000/jobs');
      users = await usersResponse.json();
      jobs = await jobsResponse.json();
      console.log("Data loaded successfully.");
    } catch (error) {
      console.error("Error loading JSON:", error);
    }
  }
  await loadData();

  function resetViews() {
    adminView.style.display = "none";
    contractorView.style.display = "none";
    loginForm.style.display = "none";
    // Stop polling when leaving the dashboard
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  // Login
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      currentUserRole = user.role;
      loginForm.style.display = "none";
      showDashboard(user.role);
    } else {
      alert("Invalid username or password.");
    }
  });

  function showDashboard(role) {
    resetViews();
    if (role === "admin") {
      adminView.style.display = "block";
      populateAdminJobs();
      // Start polling for admin if needed
      if (!pollingInterval) {
        pollingInterval = setInterval(async () => {
          await checkForJobUpdates();
        }, 5000);
      }
    } else if (role === "contractor") {
      contractorView.style.display = "block";
      const contractor = users.find(u => u.role === "contractor").username;
      populateContractorJobs(contractor);
      // Start polling for contractor view
      pollingInterval = setInterval(refreshContractorView, 5000);
    }
  }

  // Populate Admin Dashboard
  function populateAdminJobs() {
    adminJobList.innerHTML = "";
    jobs.forEach(job => {
      const lastUpdated = job.statusTimestamp ? formatDateTime(job.statusTimestamp) : "N/A";
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${job.workOrder}</td>
        <td>${job.customerName}</td>
        <td>${job.contractor}</td>
        <td class="status-cell">${job.status}</td>
        <td>${lastUpdated}</td>
        <td>
          ${job.status === "Completed - Pending Approval" ? `
            <button class="btn btn-success btn-sm approve-job" data-id="${job.id}">Approve</button>
            <button class="btn btn-warning btn-sm reject-job" data-id="${job.id}">Reject</button>
          ` : "N/A"}
        </td>
      `;
      adminJobList.appendChild(row);
      applyStatusColor(row.querySelector(".status-cell"), job.status);
    });
    document.querySelectorAll(".approve-job").forEach(button =>
      button.addEventListener("click", (e) => updateJobStatus(e.target.dataset.id, "Approved"))
    );
    document.querySelectorAll(".reject-job").forEach(button =>
      button.addEventListener("click", (e) => updateJobStatus(e.target.dataset.id, "Pending"))
    );
  }

  // Populate Contractor Dashboard
  function populateContractorJobs(contractor) {
    contractorJobList.innerHTML = "";
    const contractorJobs = jobs.filter(job => job.contractor === contractor);
    if (contractorJobs.length === 0) {
      contractorJobList.innerHTML = `<tr><td colspan="4">No jobs found for this contractor.</td></tr>`;
      return;
    }
    contractorJobs.forEach(job => {
      const displayStatus = job.contractorStatus || job.status;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${job.workOrder}</td>
        <td>${job.customerName}</td>
        <td class="status-cell">${displayStatus}</td>
        <td>
          ${job.status === "Pending" ? `<button class="btn btn-info btn-sm onsite-job" data-id="${job.id}">Onsite</button>` : ""}
          <button class="btn btn-success btn-sm update-job" data-id="${job.id}">Job Completed</button>
        </td>
      `;
      contractorJobList.appendChild(row);
      applyStatusColor(row.querySelector(".status-cell"), displayStatus);
    });
    contractorJobList.querySelectorAll(".onsite-job").forEach(button =>
      button.addEventListener("click", (e) => moveJobToInProgress(e.target.dataset.id))
    );
    contractorJobList.querySelectorAll(".update-job").forEach(button =>
      button.addEventListener("click", (e) => showUpdateJobForm(e.target.dataset.id))
    );
  }

  // Check for updates in admin view
  async function checkForJobUpdates() {
    try {
      const response = await fetch("http://localhost:3000/jobs");
      const latestJobs = await response.json();
      if (JSON.stringify(latestJobs) !== JSON.stringify(jobs)) {
        console.log("Job list updated. Refreshing admin dashboard...");
        jobs = latestJobs;
        populateAdminJobs();
      }
    } catch (error) {
      console.error("Error checking for job updates:", error);
    }
  }

  // Refresh contractor view (polling)
  async function refreshContractorView() {
    try {
      const jobsResponse = await fetch("http://localhost:3000/jobs");
      jobs = await jobsResponse.json();
      const contractor = users.find(u => u.role === "contractor").username;
      populateContractorJobs(contractor);
      console.log("Contractor view refreshed with updated job data.");
    } catch (error) {
      console.error("Error refreshing contractor view:", error);
    }
  }

  // Format date as DD/MM/YYYY HH:MM:SS
  function formatDateTime(dateString) {
    if (!dateString) return "N/A";
    if (typeof dateString !== "string") {
      console.error("Invalid date format received:", dateString);
      return "N/A";
    }
    if (dateString.includes("/")) return dateString;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  // Traffic light status colors
  function applyStatusColor(statusElement, status) {
    if (status === "Pending") {
      statusElement.style.backgroundColor = "red";
      statusElement.style.color = "white";
    } else if (status === "In Progress") {
      statusElement.style.backgroundColor = "yellow";
      statusElement.style.color = "black";
    } else if (status === "Completed") {
      statusElement.style.backgroundColor = "green";
      statusElement.style.color = "white";
    } else if (status === "Completed - Pending Approval") {
      statusElement.style.backgroundColor = "orange";
      statusElement.style.color = "white";
    }
  }

  // Move job from Pending -> In Progress -> Completed
  async function moveJobToInProgress(jobId) {
    try {
      const jobResponse = await fetch(`http://localhost:3000/jobs/${jobId}`);
      const job = await jobResponse.json();
      if (!job) {
        alert("Job not found.");
        return;
      }
      let updatedStatus;
      let contractorStatus;
      let statusMessage;
      const currentTime = new Date();
      const formattedTime = `${String(currentTime.getDate()).padStart(2, "0")}/${
          String(currentTime.getMonth() + 1).padStart(2, "0")}/${currentTime.getFullYear()} ${
          String(currentTime.getHours()).padStart(2, "0")}:${
          String(currentTime.getMinutes()).padStart(2, "0")}:${
          String(currentTime.getSeconds()).padStart(2, "0")}`;
      console.log("Generated Timestamp:", formattedTime);
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
      console.log("PATCH Request Payload:", {
        status: updatedStatus,
        contractorStatus: contractorStatus,
        statusTimestamp: formattedTime,
        onsiteTime: job.onsiteTime || formattedTime
      });
      const response = await fetch(`http://localhost:3000/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: updatedStatus,
          contractorStatus: contractorStatus,
          statusTimestamp: formattedTime,
          onsiteTime: job.onsiteTime === "N/A" ? formattedTime : job.onsiteTime
        })
      });
      const responseData = await response.json();
      console.log("PATCH Response Data:", responseData);
      if (!response.ok) {
        throw new Error("Failed to update job status.");
      }
      alert(statusMessage);
      const jobsResponse = await fetch("http://localhost:3000/jobs");
      jobs = await jobsResponse.json();
      populateAdminJobs();
      populateContractorJobs(job.contractor);
    } catch (error) {
      console.error("Error updating job status:", error);
      alert("Failed to update job status.");
    }
  }

  // Update job form with extended features
  async function showUpdateJobForm(jobId) {
    const job = jobs.find((j) => j.id.toString() === jobId.toString());
    if (!job) {
      alert("Job not found!");
      return;
    }
  
    // Fetch machines from data.json
    let availableMachines = [];
    try {
      const machinesResponse = await fetch("http://localhost:3000/machines");
      availableMachines = await machinesResponse.json();
    } catch (error) {
      console.error("Error fetching machines:", error);
    }
  
    // Remove existing update form and overlay if present
    const existingForm = document.getElementById("updateJobContainer");
    const existingOverlay = document.getElementById("modalOverlay");
    if (existingForm) existingForm.remove();
    if (existingOverlay) existingOverlay.remove();
  
    // Hide current views
    adminView.style.display = "none";
    contractorView.style.display = "none";
  
    // Create modal overlay
    const modalOverlay = document.createElement("div");
    modalOverlay.id = "modalOverlay";
    modalOverlay.style.position = "fixed";
    modalOverlay.style.top = "0";
    modalOverlay.style.left = "0";
    modalOverlay.style.width = "100%";
    modalOverlay.style.height = "100%";
    modalOverlay.style.background = "rgba(0, 0, 0, 0.5)";
    modalOverlay.style.zIndex = "999";
    document.body.appendChild(modalOverlay);
  
    // For contractors, use a hidden input for job status; for admins, show the dropdown
    const statusField = currentUserRole === "contractor"
      ? `<input type="hidden" id="jobStatus" value="Completed">`
      : `
        <select id="jobStatus" required>
          <option value="Pending" ${job.status === "Pending" ? "selected" : ""}>Pending</option>
          <option value="In Progress" ${job.status === "In Progress" ? "selected" : ""}>In Progress</option>
          <option value="Completed - Pending Approval" ${job.status === "Completed - Pending Approval" ? "selected" : ""}>Completed - Pending Approval</option>
        </select>
      `;
  
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
            ${job.machines.map(machineId => {
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
            }).join("")}
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
  
    const updateFormContainer = document.createElement("div");
    updateFormContainer.innerHTML = formHTML;
    document.body.appendChild(updateFormContainer);
  
    // Initialize signature pad
    const signatureCanvas = document.getElementById("signatureCanvas");
    const ctx = signatureCanvas.getContext("2d");
    let isDrawing = false;
  
    // Load existing signature if available
    if (job.signature) {
      const img = new Image();
      img.src = job.signature;
      img.onload = () => ctx.drawImage(img, 0, 0);
    }
  
    // Canvas drawing events
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
  
    // Clear signature button
    document.getElementById("clearSignature").addEventListener("click", () => {
      ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    });
  
    // Append work performed phrase from dropdown
    document.getElementById("workPerformedDropdown").addEventListener("change", function() {
      const selectedPhrase = this.value;
      const textarea = document.getElementById("workPerformed");
      if (selectedPhrase) {
        textarea.value += selectedPhrase + "\n";
      }
    });
  
    // Add machine button
    document.getElementById("addMachine").addEventListener("click", function() {
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
  
    // Remove machine event
    document.getElementById("machineList").addEventListener("click", function(event) {
      if (event.target.classList.contains("remove-machine")) {
        event.target.parentElement.remove();
      }
    });
  
    // Handle form submission
    document.getElementById("updateJobForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      let newStatus = document.getElementById("jobStatus").value;
      // For contractors, we always want to set status to "Completed - Pending Approval"
      // while showing contractorStatus as "Completed"
      let newContractorStatus = newStatus;
      if (currentUserRole === "contractor" && newStatus === "Completed") {
        newStatus = "Completed - Pending Approval";
        newContractorStatus = "Completed";
      }
      const updatedMachines = [...document.querySelectorAll(".machine-entry")].map(machine => ({
        id: machine.getAttribute("data-id"),
        name: machine.querySelector("strong").innerText,
        notes: machine.querySelector(".machine-notes").value,
        partsUsed: machine.querySelector(".machine-parts").value
      }));
      const updatedJob = {
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
          approvedByManagement: document.getElementById("checkApproved").checked
        },
        signature: signatureCanvas.toDataURL("image/png"),
        machines: updatedMachines
      };
    
      try {
        await fetch(`http://localhost:3000/jobs/${job.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedJob)
        });
        alert("Job updated successfully and submitted for admin approval.");
        updateFormContainer.remove();
        modalOverlay.remove();
        showDashboard(currentUserRole);
      } catch (error) {
        console.error("Error updating job:", error);
        alert("Failed to update the job.");
      }
    });
  
    // Event listener for "Back to Dashboard"
    document.getElementById("backToDashboard").addEventListener("click", () => {
      updateFormContainer.remove();
      modalOverlay.remove();
      showDashboard(currentUserRole);
    });
  }
    
  async function deleteJob(jobId) {
    if (confirm("Are you sure you want to delete this job?")) {
      try {
        await fetch(`http://localhost:3000/jobs/${jobId}`, { method: "DELETE" });
        alert("Job deleted successfully.");
        showDashboard(currentUserRole);
      } catch (error) {
        console.error("Error deleting job:", error);
        alert("Failed to delete the job.");
      }
    }
  }
});
