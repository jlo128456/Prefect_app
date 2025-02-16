document.addEventListener("DOMContentLoaded", async () => {
  let users = [];
  let jobs = [];
  
  const loginForm = document.getElementById("loginForm");
  const adminView = document.getElementById("adminView");
  const contractorView = document.getElementById("contractorView");
  const contractorJobList = document.getElementById("contractorJobList");
  const adminJobList = document.getElementById("adminJobList");
  const homeButton = document.getElementById("homeButton");
  
  let currentUserRole = null;

  // Load JSON data from the JSON server
  try {
    const usersResponse = await fetch('http://localhost:3000/users');
    const jobsResponse = await fetch('http://localhost:3000/jobs');
    users = await usersResponse.json();
    jobs = await jobsResponse.json();
    console.log("Data loaded successfully.");
  } catch (error) {
    console.error('Error loading JSON:', error);
  }

  function resetViews() {
    adminView.style.display = "none";
    contractorView.style.display = "none";
    loginForm.style.display = "none";
    homeButton.style.display = "none";
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const user = users.find((u) => u.username === username && u.password === password);

    if (user) {
      currentUserRole = user.role;
      loginForm.style.display = "none";
      homeButton.style.display = "block";
      showDashboard(user.role);
    } else {
      alert("Invalid username or password.");
    }
  });

  homeButton.addEventListener("click", () => {
    if (currentUserRole) {
      showDashboard(currentUserRole);
    } else {
      resetViews();
      loginForm.style.display = "block";
    }
  });

  function showDashboard(role) {
    resetViews();
    if (role === "admin") {
      adminView.style.display = "block";
      populateAdminJobs();
    } else if (role === "contractor") {
      contractorView.style.display = "block";
      populateContractorJobs(users.find((u) => u.role === "contractor").username);
    }
  }

  function populateAdminJobs() {
    adminJobList.innerHTML = "";
    jobs.forEach((job) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${job.workOrder}</td>
        <td>${job.customerName}</td>
        <td>${job.contractor}</td>
        <td class="status-cell">${job.status}</td>
        <td>
          <button class="btn btn-primary btn-sm edit-job" data-id="${job.id}">Edit</button>
          <button class="btn btn-danger btn-sm delete-job" data-id="${job.id}">Delete</button>
        </td>
      `;
      adminJobList.appendChild(row);
      applyStatusColor(row.querySelector(".status-cell"), job.status);
    });

    document.querySelectorAll(".edit-job").forEach((button) =>
      button.addEventListener("click", (e) => showUpdateJobForm(e.target.dataset.id))
    );

    document.querySelectorAll(".delete-job").forEach((button) =>
      button.addEventListener("click", (e) => deleteJob(e.target.dataset.id))
    );
  }

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
    }
  }

  function populateContractorJobs(contractor) {
    contractorJobList.innerHTML = "";
  
    const contractorJobs = jobs.filter((job) => job.contractor === contractor);
  
    if (contractorJobs.length === 0) {
      contractorJobList.innerHTML = `<tr><td colspan="4">No jobs found for this contractor.</td></tr>`;
      return;
    }
  
    contractorJobs.forEach((job) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${job.workOrder}</td>
        <td>${job.customerName}</td>
        <td class="status-cell">${job.status}</td>
        <td>
          ${job.status === "Pending" ? `<button class="btn btn-info btn-sm onsite-job" data-id="${job.id}">Onsite</button>` : ""}
          <button class="btn btn-success btn-sm update-job" data-id="${job.id}">Update</button>
        </td>
      `;
      contractorJobList.appendChild(row);
      applyStatusColor(row.querySelector(".status-cell"), job.status);
    });
  
    // Add event listeners for the "Onsite" button
    contractorJobList.querySelectorAll(".onsite-job").forEach((button) =>
      button.addEventListener("click", (e) => moveJobToInProgress(e.target.dataset.id))
    );
  
    // Add event listeners for the "Update" button
    contractorJobList.querySelectorAll(".update-job").forEach((button) =>
      button.addEventListener("click", (e) => showUpdateJobForm(e.target.dataset.id))
    );
  }
  

  function populateContractorJobs(contractor) {
    contractorJobList.innerHTML = "";
  
    const contractorJobs = jobs.filter((job) => job.contractor === contractor);
  
    if (contractorJobs.length === 0) {
      contractorJobList.innerHTML = `<tr><td colspan="4">No jobs found for this contractor.</td></tr>`;
      return;
    }
  
    contractorJobs.forEach((job) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${job.workOrder}</td>
        <td>${job.customerName}</td>
        <td class="status-cell">${job.status}</td>
        <td>
          ${job.status === "Pending" ? `<button class="btn btn-info btn-sm onsite-job" data-id="${job.id}">Onsite</button>` : ""}
          <button class="btn btn-success btn-sm update-job" data-id="${job.id}">Update</button>
        </td>
      `;
      contractorJobList.appendChild(row);
      applyStatusColor(row.querySelector(".status-cell"), job.status);
    });
  
    // Add event listeners for the "Onsite" button
    contractorJobList.querySelectorAll(".onsite-job").forEach((button) =>
      button.addEventListener("click", (e) => moveJobToInProgress(e.target.dataset.id))
    );
  
    // Add event listeners for the "Update" button
    contractorJobList.querySelectorAll(".update-job").forEach((button) =>
      button.addEventListener("click", (e) => showUpdateJobForm(e.target.dataset.id))
    );
  }
  

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
  
   // Render the update form
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
         <input type="text" id="contactName" placeholder="Enter contact name" required>
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
           <option value="Completed" ${job.status === "Completed" ? "selected" : ""}>Completed</option>
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
         <canvas id="signatureCanvas" width="400" height="150" style="border:1px solid black;"></canvas>
         <button type="button" id="clearSignature">Clear Signature</button>
       </div>
       <button type="submit">Save</button>
     </form>
     <button type="button" id="backToDashboard">Back to Dashboard</button>
   </div>
 `;
  
    const updateFormContainer = document.createElement('div');
    updateFormContainer.innerHTML = formHTML;
    document.body.appendChild(updateFormContainer);
  
    // Event listener for "Back to Dashboard"
    document.getElementById('backToDashboard').addEventListener('click', () => {
      updateFormContainer.remove();
      modalOverlay.remove();
      adminView.style.display = "block";
      contractorView.style.display = "block";
      showDashboard(currentUserRole);
    });
  
    // Handle form submission
    document.getElementById('updateJobForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const updatedJob = {
        customerName: document.getElementById('customerName').value.trim(),
        contactName: document.getElementById('contactName').value.trim(),
        workPerformed: document.getElementById('workPerformed').value.trim(),
        status: document.getElementById('jobStatus').value,
        completionDate: document.getElementById('completionDate').value,
        checklist: {
          noMissingScrews: document.getElementById('checkScrews')?.checked || false,
          softwareUpdated: document.getElementById('checkSoftwareUpdated')?.checked || false,
          tested: document.getElementById('checkTested')?.checked || false,
          approvedByManagement: document.getElementById('checkApproved')?.checked || false,
        }
      };
  
      try {
        await fetch(`http://localhost:3000/jobs/${jobId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedJob),
        });
        alert('Job updated successfully!');
        updateFormContainer.remove();
        modalOverlay.remove();
        adminView.style.display = "block";
        contractorView.style.display = "block";
        showDashboard(currentUserRole);
      } catch (error) {
        console.error('Error updating job:', error);
        alert('Failed to update the job.');
      }
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
