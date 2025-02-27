import { G } from './globals.js';
import { populateAdminJobs, populateContractorJobs, showDashboard } from './dashboard.js';
import { loadData } from './api.js';
import mysql from 'mysql2/promise';

// Create a MySQL connection pool using Aiven credentials from environment variables.
const pool = mysql.createPool({
  host: process.env.AIVEN_MYSQL_HOST,         // e.g., prefect-app-prefect-app.c.aivencloud.com
  user: process.env.AIVEN_MYSQL_USER,          // e.g., avnadmin
  password: process.env.AIVEN_MYSQL_PASSWORD,  // your password
  database: process.env.AIVEN_MYSQL_DATABASE,  // e.g., PrefectAppDB
  port: process.env.AIVEN_MYSQL_PORT || 3306,   // e.g., 13590
  ssl: { rejectUnauthorized: false },
});

/**
 * Load data (jobs, users) from MySQL and store in globals.
 */
export async function loadData() {
  try {
    // Fetch jobs from the MySQL database.
    const [jobs] = await pool.query('SELECT * FROM jobs');
    G.jobs = jobs;
    console.log("Jobs loaded:", G.jobs);

    // Fetch users from the MySQL database.
    const [users] = await pool.query('SELECT * FROM users');
    G.users = users;
    console.log("Users loaded:", G.users);
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

/**
 * Update a job's status.
 */
export async function updateJobStatus(jobId, newStatus) {
  try {
    // Fetch the current job from the database.
    const [jobs] = await pool.query('SELECT * FROM jobs WHERE id = ?', [jobId]);
    if (jobs.length === 0) {
      console.error("Job not found.");
      return;
    }
    const job = jobs[0];

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

    // Determine onsiteTime (if not already set, assign formattedTime)
    const onsiteTime = (!job.onsiteTime || job.onsiteTime === "N/A") ? formattedTime : job.onsiteTime;

    // Update the job record in MySQL.
    const [result] = await pool.query(
      `UPDATE jobs 
       SET status = ?, contractorStatus = ?, statusTimestamp = ?, onsiteTime = ?
       WHERE id = ?`,
      [updatedStatus, contractorStatus, formattedTime, onsiteTime, jobId]
    );
    if (result.affectedRows === 0) throw new Error("Failed to update job status.");

    console.log(statusMessage);
    // Reload global data and refresh both views.
    await loadData();
    populateAdminJobs(G.jobs);
    populateContractorJobs(G.jobs);
  } catch (error) {
    console.error("Error updating job status:", error);
  }
}

/**
 * Periodically check if the job list has changed (Admin view).
 */
export async function checkForJobUpdates() {
  try {
    const [latestJobs] = await pool.query('SELECT * FROM jobs');
    // Compare with current global G.jobs.
    if (JSON.stringify(latestJobs) !== JSON.stringify(G.jobs)) {
      console.log("Job list updated. Refreshing admin dashboard...");
      G.jobs = latestJobs;
      // Optionally, trigger re-population of the admin dashboard.
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
    const [jobs] = await pool.query('SELECT * FROM jobs');
    G.jobs = jobs;
    // If you have a global G.users array for contractors:
    const contractor = G.users.find(u => u.role === "contractor")?.username;
    console.log("Contractor view refreshed with updated job data.", contractor);
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
      // Execute a DELETE query for the given job.
      const [result] = await pool.query('DELETE FROM jobs WHERE id = ?', [jobId]);
      if (result.affectedRows === 0) throw new Error("Failed to delete job.");
      alert("Job deleted successfully.");
      // Optionally reload jobs after deletion.
      await loadData();
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete the job.");
    }
  }
}
