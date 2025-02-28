import { G } from './globals.js';
import { populateAdminJobs, populateContractorJobs, showDashboard } from './dashboard.js';

const API_BASE_URL = 'https://prefect-app.onrender.com';

/**
 * Fetch data from the API.
 * @param {string} endpoint - API endpoint to fetch.
 * @returns {Promise<any>} - The response JSON.
 */
async function fetchData(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`);
    if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return null;
  }
}

/**
 * Load jobs and users from the API and store them in globals.
 */
export async function loadData() {
  G.jobs = await fetchData('jobs') || [];
  console.log('Jobs loaded:', G.jobs);

  G.users = await fetchData('users') || [];
  console.log('Users loaded:', G.users);
}

/**
 * Update a job's status and refresh the UI.
 * @param {number} jobId - The job ID.
 */
export async function updateJobStatus(jobId) {
  try {
    const job = await fetchData(`jobs/${jobId}`);
    if (!job) return;

    const currentTime = new Date().toLocaleString('en-GB');
    let updatedStatus, contractorStatus, statusMessage;

    switch (job.status) {
      case 'Pending':
        updatedStatus = 'In Progress';
        contractorStatus = 'In Progress';
        statusMessage = `Job moved to 'In Progress' at ${currentTime}.`;
        break;
      case 'In Progress':
        updatedStatus = 'Completed - Pending Approval';
        contractorStatus = 'Completed';
        statusMessage = `Job completed and moved to 'Completed - Pending Approval' at ${currentTime}.`;
        break;
      default:
        console.error('Invalid action: The job is already completed or approved.');
        return;
    }

    const updatedJob = { ...job, status: updatedStatus, contractorStatus, statusTimestamp: currentTime };
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedJob),
    });
    if (!response.ok) throw new Error('Failed to update job status.');

    console.log(statusMessage);
    alert(statusMessage);
    await loadData();
    refreshDashboard();
  } catch (error) {
    console.error('Error updating job status:', error);
  }
}

/**
 * Periodically check for job updates and refresh the UI.
 */
export async function checkForJobUpdates() {
  const latestJobs = await fetchData('jobs');
  if (!latestJobs) return;

  if (JSON.stringify(latestJobs) !== JSON.stringify(G.jobs)) {
    console.log('Job list updated. Refreshing dashboard...');
    G.jobs = latestJobs;
    refreshDashboard();
  }
}

/**
 * Refresh contractor's job view.
 */
export async function refreshContractorView() {
  const allJobs = await fetchData('jobs');
  if (!allJobs) return;

  if (G.currentUser && (G.currentUserRole === 'contractor' || G.currentUserRole === 'technician')) {
    // Filter jobs based on the user's role and their unique id
    if (G.currentUserRole === 'contractor') {
      G.jobs = allJobs.filter(job => job.assignedContractor === G.currentUser.id);
    } else if (G.currentUserRole === 'technician') {
      G.jobs = allJobs.filter(job => job.assignedTech === G.currentUser.id);
    }
  } else {
    G.jobs = allJobs;
  }

  console.log('Contractor view refreshed for', G.currentUser);
  showDashboard(G.currentUserRole);
}

/**
 * Delete a job and refresh the UI.
 * @param {number} jobId - The job ID.
 */
export async function deleteJob(jobId) {
  if (!confirm('Are you sure you want to delete this job?')) return;
  try {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete job.');
    alert('Job deleted successfully.');
    await loadData();
    refreshDashboard();
  } catch (error) {
    console.error('Error deleting job:', error);
    alert('Failed to delete the job.');
  }
}

/**
 * Refresh the dashboard view based on the user role.
 */
function refreshDashboard() {
  if (G.currentUserRole === 'admin') {
    populateAdminJobs(G.jobs);
  } else {
    populateContractorJobs(G.jobs);
  }
  showDashboard(G.currentUserRole);
}
