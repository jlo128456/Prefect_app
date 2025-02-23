// api.js
import { G } from './globals.js';

// Replace these with your actual jsonbin IDs.
const USERS_BIN_URL = 'https://api.jsonbin.io/v3/b/67bb00c2ad19ca34f80efa55';
const JOBS_BIN_URL = 'https://api.jsonbin.io/v3/b/67bb011be41b4d34e4993fc2';

/**
 * Load JSON data (users, jobs) from jsonbin and store in globals.
 */
export async function loadData() {
  try {
    const usersResponse = await fetch(USERS_BIN_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const jobsResponse = await fetch(JOBS_BIN_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const usersData = await usersResponse.json();
    const jobsData = await jobsResponse.json();

    // Update based on the JSON structure:
    // If your JSON is { "users": [...] } inside "record"
    G.users = usersData.record.users; 
    G.jobs = jobsData.record;  // Assuming jobs is already an array
    console.log("Data loaded successfully.");
  } catch (error) {
    console.error("Error loading JSON:", error);
  }
}

/**
 * Update job status (e.g. Approve, Reject) by PATCHing to jsonbin.
 *
 * Note: jsonbin does not support PATCH natively. You may need to fetch the data,
 * update the desired job, and then PUT the whole record back to jsonbin.
 */
export async function updateJobStatus(jobId, newStatus) {
  try {
    // Fetch the current jobs data
    const response = await fetch(JOBS_BIN_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const jobsData = (await response.json()).record;

    // Update the job status locally
    const updatedJobs = jobsData.map(job => {
      if (job.id === jobId) {
        return { ...job, status: newStatus };
      }
      return job;
    });

    // Write the updated jobs data back to jsonbin with a PUT request
    const putResponse = await fetch(JOBS_BIN_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record: updatedJobs })
    });
    if (!putResponse.ok) throw new Error("Failed to update job status.");

    alert(`Job status updated to '${newStatus}'.`);
    // Reload jobs from jsonbin
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
    const response = await fetch(JOBS_BIN_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const latestJobs = (await response.json()).record;
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
    const jobsResponse = await fetch(JOBS_BIN_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    G.jobs = (await jobsResponse.json()).record;
    const contractor = G.users.find(u => u.role === "contractor")?.username;
    // Re-populate contractor jobs
    console.log("Contractor view refreshed with updated job data.");
  } catch (error) {
    console.error("Error refreshing contractor view:", error);
  }
}

/**
 * Delete a job (Admin function).
 *
 * Note: As with updating, jsonbin does not support DELETE for a single entry.
 * Instead, fetch the data, remove the job locally, and PUT the updated record back.
 */
export async function deleteJob(jobId) {
  if (confirm("Are you sure you want to delete this job?")) {
    try {
      // Fetch current jobs
      const response = await fetch(JOBS_BIN_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const jobsData = (await response.json()).record;

      // Remove the job with the given id
      const updatedJobs = jobsData.filter(job => job.id !== jobId);

      // Write the updated data back to jsonbin
      const putResponse = await fetch(JOBS_BIN_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record: updatedJobs })
      });
      if (!putResponse.ok) throw new Error("Failed to delete job.");

      alert("Job deleted successfully.");
      // Optionally refresh or showDashboard again
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete the job.");
    }
  }
}
