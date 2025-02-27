import { G } from './globals.js';
import { populateAdminJobs, populateContractorJobs, showDashboard } from './dashboard.js';
import { loadData } from './api.js';

const API_BASE_URL = 'https://prefect-app.onrender.com';

/**
 * Load data (jobs, users) from the API and store in globals.
 */
export async function loadData() {
  try {
    // Fetch jobs from the API
    const jobsResponse = await fetch(`${API_BASE_URL}/jobs`);
    if (!jobsResponse.ok) throw new Error("Failed to fetch jobs");
    G.jobs = await jobsResponse.json();
    console.log("Jobs loaded:", G.jobs);

    // Fetch users from the API
    const usersResponse = await fetch(`${API_BASE_URL}/users`);
    if (!usersResponse.ok) throw new Error("Failed to fetch users");
    G.users = await usersResponse.json();
    console.log("Users loaded:", G.users);
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

/**
 * Update a job's status.
 */
export async function updateJobStatus(jobId) {
  try {
    // Fetch the current job data from the API.
    const jobResponse = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    if (!jobResponse.ok) {
      console.error("Job not found.");
      return;
    }
    const job = await jobResponse.json();

    // Generate timestamp in DD/MM/YYYY HH:MM:SS format.
    const currentTime = new Date();
    const formattedTime = `${String(currentTime.getDate()).padStart(2, "0")}/${
      String(currentTime.getMonth() + 1).padStart(2, "0")}/${currentTime.getFullYear()} ${
      String(currentTime.getHours()).padStart(2, "0")}:${
      String(currentTime.getMinutes()).padStart(2, "0")}:${
      String(currentTime.getSeconds()).padStart(2, "0")}`;

    let updatedStatus, contractorStatus, statusMessage;
    if (job.status === "Pending") {
      updatedStatus = "In Progress";
      contractorStatus = "In Progress";
      statusMessage = `Job moved to 'In Progress' at ${formattedTime}.`;
    } else if (job.status === "In Progress") {
      updatedStatus = "Completed - Pending Approval";
      contractorStatus = "Completed";
      statusMessage = `Job completed and moved to 'Completed - Pending Approval' at ${formattedTime}.`;
    } else {
      console.error("Invalid action: The job is already completed or approved.");
      return;
    }

    // Determine onsiteTime (if not set, assign formattedTime)
    const onsiteTime = (!job.onsiteTime || job.onsiteTime === "N/A") ? formattedTime : job.onsiteTime;

    // Merge updated fields with the existing job object.
    const updatedJob = {
      ...job,
      status: updatedStatus,
      contractorStatus: contractorStatus,
      statusTimestamp: formattedTime,
      onsiteTime: onsiteTime,
    };

    // Send a PUT request to update the job via your API.
    const putResponse = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedJob),
    });
    if (!putResponse.ok) throw new Error("Failed to update job status.");

    console.log(statusMessage);
    alert(statusMessage);
    // Reload global data and refresh views.
    await loadData();
    // For admins, display all jobs.
    if (G.currentUserRole === "admin") {
      populateAdminJobs(G.jobs);
    } else {
      populateContractorJobs(G.jobs);
    }
    showDashboard(G.currentUserRole);
  } catch (error) {
    console.error("Error updating job status:", error);
  }
}

/**
 * Periodically check if the job list has changed.
 * For admin, refresh with all jobs.
 */
export async function checkForJobUpdates() {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs`);
    if (!response.ok) throw new Error("Failed to fetch jobs");
    const latestJobs = await response.json();

    // For admin view, ensure all jobs are displayed.
    if (G.currentUserRole === "admin") {
      if (JSON.stringify(latestJobs) !== JSON.stringify(G.jobs)) {
        console.log("Job list updated. Refreshing admin dashboard...");
        G.jobs = latestJobs;
        showDashboard(G.currentUserRole);
      }
    } else {
      // For contractors, filtering is handled in refreshContractorView.
      console.log("Contractor view update skipped in checkForJobUpdates.");
    }
  } catch (error) {
    console.error("Error checking for job updates:", error);
  }
}

/**
 * Refresh the contractor view (polling).
 */
export async function refreshContractorView() {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs`);
    if (!response.ok) throw new Error("Failed to fetch jobs");
    const allJobs = await response.json();

    // If the current user is a contractor, filter jobs for the assigned contractor.
    if (G.currentUserRole === "contractor" && G.currentUser) {
      G.jobs = allJobs.filter(job => job.assignedContractor === G.currentUser);
    } else {
      G.jobs = allJobs;
    }
    console.log("Contractor view refreshed with job data for", G.currentUser);
    showDashboard(G.currentUserRole);
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
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete job.");
      alert("Job deleted successfully.");
      // Reload global data and refresh views.
      await loadData();
      // If admin, display all jobs.
      if (G.currentUserRole === "admin") {
        populateAdminJobs(G.jobs);
      }
      showDashboard(G.currentUserRole);
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete the job.");
    }
  }
}
