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
