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
      console.error('Error loading JSON:', error);
    }
  }
  await loadData();

  function resetViews() {
    adminView.style.display = "none";
    contractorView.style.display = "none";
    loginForm.style.display = "none";
    

    // Stop polling when leaving the admin dashboard
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const user = users.find((u) => u.username === username && u.password === password);

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

      // Start polling for real-time job updates for the admin dashboard
      if (!pollingInterval) {
        pollingInterval = setInterval(async () => {
          await checkForJobUpdates();
        }, 5000); // Poll every 5 seconds
      }
    } else if (role === "contractor") {
      contractorView.style.display = "block";
      const contractor = users.find((u) => u.role === "contractor").username;
      populateContractorJobs(contractor);
    }
  }

  //function to populated admin job in dashboard
  function populateAdminJobs() {
    adminJobList.innerHTML = "";
  
    jobs.forEach((job) => {
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
  
    document.querySelectorAll(".approve-job").forEach((button) =>
      button.addEventListener("click", (e) => updateJobStatus(e.target.dataset.id, "Approved"))
    );
  
    document.querySelectorAll(".reject-job").forEach((button) =>
      button.addEventListener("click", (e) => updateJobStatus(e.target.dataset.id, "Pending"))
    );
  }
  
  
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
//fubction to create traffic light system
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
  

  async function updateJobStatus(jobId, newStatus) {
    try {
      const response = await fetch(`http://localhost:3000/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error("Failed to update job status.");
      alert(`Job status updated to '${newStatus}'.`);
      await loadData();
      populateAdminJobs();
    } catch (error) {
      console.error("Error updating job status:", error);
      alert("Failed to update the job status.");
    }
  }
  //populate contractor job in contractor dashboard
  function populateContractorJobs(contractor) {
    contractorJobList.innerHTML = "";

    const contractorJobs = jobs.filter((job) => job.contractor === contractor);

    if (contractorJobs.length === 0) {
        contractorJobList.innerHTML = `<tr><td colspan="4">No jobs found for this contractor.</td></tr>`;
        return;
    }

    contractorJobs.forEach((job) => {
        let displayStatus = job.contractorStatus || job.status; //  Use `contractorStatus` if available
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${job.workOrder}</td>
            <td>${job.customerName}</td>
            <td class="status-cell">${displayStatus}</td>
            <td>
                ${
                    job.status === "Pending"
                        ? `<button class="btn btn-info btn-sm onsite-job" data-id="${job.id}">Onsite</button>`
                        : ""
                }
                ${
                    job.status === "In Progress"
                        ? `<button class="btn btn-success btn-sm update-job" data-id="${job.id}">Update</button>`
                        : ""
                }
            </td>
        `;
        contractorJobList.appendChild(row);
        applyStatusColor(row.querySelector(".status-cell"), displayStatus);
    });

    contractorJobList.querySelectorAll(".onsite-job").forEach((button) =>
        button.addEventListener("click", (e) => moveJobToInProgress(e.target.dataset.id))
    );

    contractorJobList.querySelectorAll(".update-job").forEach((button) =>
        button.addEventListener("click", (e) => showUpdateJobForm(e.target.dataset.id))
    );
}

  
  
  

  function formatDateTime(dateString) {
    if (!dateString) return "N/A"; // Handle null or undefined values
  
    if (typeof dateString !== "string") {
      console.error("Invalid date format received:", dateString);
      return "N/A"; // Prevents crashing if dateString is an object
    }
  
    // If already formatted, return it
    if (dateString.includes("/")) return dateString;
  
    const date = new Date(dateString);
  
    if (isNaN(date.getTime())) {
      console.error("Invalid date detected:", dateString);
      return "N/A"; // Handles bad date inputs
    }
  
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
  
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
  //function to move job in progess
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

        // Format timestamp manually (DD/MM/YYYY HH:MM:SS)
        const currentTime = new Date();
        const formattedTime = `${String(currentTime.getDate()).padStart(2, "0")}/${
            String(currentTime.getMonth() + 1).padStart(2, "0")}/${currentTime.getFullYear()} ${
            String(currentTime.getHours()).padStart(2, "0")}:${
            String(currentTime.getMinutes()).padStart(2, "0")}:${
            String(currentTime.getSeconds()).padStart(2, "0")}`;

        console.log("Generated Timestamp:", formattedTime);

        if (job.status === "Pending") {
            updatedStatus = "In Progress";
            contractorStatus = "In Progress"; // Contractor sees "In Progress" (yellow)
            statusMessage = `Job moved to 'In Progress' at ${formattedTime}.`;
        } else if (job.status === "In Progress") {
            updatedStatus = "Completed - Pending Approval";
            contractorStatus = "Completed"; //  Fix: Ensure contractor sees "Completed"
            statusMessage = `Job completed and moved to 'Completed - Pending Approval' at ${formattedTime}.`;
        } else {
            alert("Invalid action: The job is already completed or approved.");
            return;
        }

        //  Ensure `contractorStatus` is explicitly included
        const updatedJob = {
            ...job, // Spread operator ensures all job properties are included
            status: updatedStatus,
            contractorStatus: contractorStatus, //  Fix: Ensure this gets updated
            statusTimestamp: formattedTime, //  Update last updated time
            onsiteTime: job.onsiteTime === "N/A" ? formattedTime : job.onsiteTime
        };

        console.log("PATCH Request Payload:", updatedJob);

        const response = await fetch(`http://localhost:3000/jobs/${jobId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedJob) //  Fix: Send the full updated job object
        });

        const responseData = await response.json();
        console.log("PATCH Response Data:", responseData);

        if (!response.ok) {
            throw new Error("Failed to update job status.");
        }

        alert(statusMessage);

        // Refresh jobs from server
        const jobsResponse = await fetch("http://localhost:3000/jobs");
        jobs = await jobsResponse.json();

        populateAdminJobs();
        populateContractorJobs(job.contractor); //  Ensure contractor view updates
    } catch (error) {
        console.error("Error updating job status:", error);
        alert("Failed to update job status.");
    }
}

  //update job form data
  async function showUpdateJobForm(jobId) {
    const job = jobs.find((j) => j.id.toString() === jobId.toString());
    if (!job) {
      alert("Job not found!");
      return;
    }
  
    // Remove any existing update form to avoid duplication
    const existingForm = document.getElementById('updateJobContainer');
    const existingOverlay = document.getElementById('modalOverlay');
    if (existingForm) existingForm.remove();
    if (existingOverlay) existingOverlay.remove();
  
    // Hide current views
    adminView.style.display = "none";
    contractorView.style.display = "none";
  
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'modalOverlay';
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100%';
    modalOverlay.style.height = '100%';
    modalOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
    modalOverlay.style.zIndex = '999';
    document.body.appendChild(modalOverlay);
  
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
            <label>Work Performed</label>
            <textarea id="workPerformed" rows="3" required>${job.workPerformed || ""}</textarea>
          </div>
          <div>
            <label>Job Status</label>
            <select id="jobStatus" required>
              <option value="Pending" ${job.status === "Pending" ? "selected" : ""}>Pending</option>
              <option value="In Progress" ${job.status === "In Progress" ? "selected" : ""}>In Progress</option>
              <option value="Completed - Pending Approval" ${job.status === "Completed - Pending Approval" ? "selected" : ""}>Completed - Pending Approval</option>
            </select>
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
  
    const signatureCanvas = document.getElementById("signatureCanvas");
    const ctx = signatureCanvas.getContext("2d");
    let isDrawing = false;
  
    // Load existing signature if available
    if (job.signature) {
      const img = new Image();
      img.src = job.signature;
      img.onload = () => ctx.drawImage(img, 0, 0);
    }
  
    // Canvas event listeners for drawing
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
  
    // Clear the signature
    document.getElementById("clearSignature").addEventListener("click", () => {
      ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    });
  
    // Handle form submission
    document.getElementById("updateJobForm").addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const updatedJob = {
        customerName: document.getElementById("customerName").value.trim(),
        contactName: document.getElementById("contactName").value.trim(),
        workPerformed: document.getElementById("workPerformed").value.trim(),
        status: "Completed - Pending Approval",  // Automatically set status to "Completed - Pending Approval"
        completionDate: document.getElementById("completionDate").value,
        checklist: {
          noMissingScrews: document.getElementById("checkScrews").checked,
          softwareUpdated: document.getElementById("checkSoftwareUpdated").checked,
          tested: document.getElementById("checkTested").checked,
          approvedByManagement: document.getElementById("checkApproved").checked
        },
        signature: signatureCanvas.toDataURL("image/png")  // Convert signature to base64 string
      };
  
      try {
        await fetch(`http://localhost:3000/jobs/${jobId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedJob)
        });
        alert("Job updated to 'Completed - Pending Approval' and submitted for admin approval.");
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
