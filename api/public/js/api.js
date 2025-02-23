// api.js
import { G } from './globals.js';

/**
 * Load JSON data (users, jobs) from the server and store in globals.
 */
export async function loadData() {
  try {
    const usersResponse = await fetch('http://localhost:3000/users');
    const jobsResponse = await fetch('http://localhost:3000/jobs');
    G.users = await usersResponse.json();
    G.jobs = await jobsResponse.json();
    console.log("Data loaded successfully.");
  } catch (error) {
    console.error("Error loading JSON:", error);
  }
}

/**
 * Update job status (e.g. Approve, Reject) by PATCHing to the server.
 */
export async function updateJobStatus(jobId, newStatus) {
  try {
    const response = await fetch(`http://localhost:3000/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    if (!response.ok) throw new Error("Failed to update job status.");

    alert(`Job status updated to '${newStatus}'.`);
    // Reload jobs from server
    await loadData();
    // Optionally re-populate the admin table after reload
  } catch (error) {
    console.error("Error updating job status:", error);
    alert("Failed to update the job status.");
  }
}

/**
 * Periodically check if the job list has changed (Admin view).
 */
export async function checkForJobUpdates() {
  try {
    const response = await fetch("http://localhost:3000/jobs");
    const latestJobs = await response.json();
    // Compare with current G.jobs
    if (JSON.stringify(latestJobs) !== JSON.stringify(G.jobs)) {
      console.log("Job list updated. Refreshing admin dashboard...");
      G.jobs = latestJobs;
      // Re-populate admin dashboard here if desired
    }
  } catch (error) {
    console.error("Error checking for job updates:", error);
  }
}

/**
 * Refresh contractor view (polling).
 */
export async function refreshContractorView() {
  try {
    const jobsResponse = await fetch("http://localhost:3000/jobs");
    G.jobs = await jobsResponse.json();
    const contractor = G.users.find(u => u.role === "contractor")?.username;
    // Re-populate contractor jobs
    console.log("Contractor view refreshed with updated job data.");
  } catch (error) {
    console.error("Error refreshing contractor view:", error);
  }
}

/**
 * Delete a job (Admin function).
 */
export async function deleteJob(jobId) {
  if (confirm("Are you sure you want to delete this job?")) {
    try {
      await fetch(`http://localhost:3000/jobs/${jobId}`, { method: "DELETE" });
      alert("Job deleted successfully.");
      // Optionally refresh or showDashboard again
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete the job.");
    }
  }
}
