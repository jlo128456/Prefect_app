let jobs = [];
let pollingInterval = null;

async function loadJobs() {
  try {
    const jobsResponse = await fetch('http://localhost:3000/jobs');
    jobs = await jobsResponse.json();
  } catch (error) {
    console.error('Error loading jobs:', error);
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
    await loadJobs();
    populateAdminJobs();
  } catch (error) {
    console.error("Error updating job status:", error);
    alert("Failed to update the job status.");
  }
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
