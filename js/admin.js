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
          ${job.status === "Completed - Pending Approval" ? `
            <button class="btn btn-success btn-sm approve-job" data-id="${job.id}">Approve</button>
            <button class="btn btn-warning btn-sm reject-job" data-id="${job.id}">Reject</button>
          ` : "N/A"}
        </td>
      `;
      adminJobList.appendChild(row);
      applyStatusColor(row.querySelector(".status-cell"), job.status);
    });
  }
  