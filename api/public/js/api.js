import { G } from './globals.js';
import { populateAdminJobs, populateContractorJobs, populateTechJobs, showDashboard } from './dashboard.js';

const API_BASE_URL = 'https://prefect-app.onrender.com';

/**
 * Load jobs and users from the API and store them in globals.
 */
export async function loadData() {
  try {
    const jobsResponse = await fetch(`${API_BASE_URL}/jobs`);
    if (!jobsResponse.ok) throw new Error('Failed to fetch jobs');
    G.jobs = await jobsResponse.json();
    console.log('Jobs loaded:', G.jobs);

    const usersResponse = await fetch(`${API_BASE_URL}/users`);
    if (!usersResponse.ok) throw new Error('Failed to fetch users');
    G.users = await usersResponse.json();
    console.log('Users loaded:', G.users);
  } catch (error) {
    console.error('Error loading data:', error);
    G.jobs = [];
    G.users = [];
  }
}

/**
 * Update a job's status and refresh the UI.
 * @param {number} jobId - The job ID.
 */
export async function updateJobStatus(jobId) {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    if (!response.ok) throw new Error('Failed to fetch job');
    const job = await response.json();
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
    const updateResponse = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedJob),
    });
    if (!updateResponse.ok) throw new Error('Failed to update job status.');

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
  try {
    const response = await fetch(`${API_BASE_URL}/jobs`);
    if (!response.ok) return;
    const latestJobs = await response.json();
    if (JSON.stringify(latestJobs) !== JSON.stringify(G.jobs)) {
      console.log('Job list updated. Refreshing dashboard...');
      G.jobs = latestJobs;
      refreshDashboard();
    }
  } catch (error) {
    console.error('Error checking job updates:', error);
  }
}

/**
 * Refresh contractor's job view.
 */
export async function refreshContractorView() {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs`);
    if (!response.ok) return;
    const allJobs = await response.json();

    if (!G.currentUser) {
      // If no user is logged in, no jobs
      G.jobs = [];
    } else if (G.currentUserRole === 'admin') {
      // Admin sees all jobs
      G.jobs = allJobs;
    } else if (G.currentUserRole === 'contractor') {
      // Filter for 'contractor' jobs AND check assignedContractor if needed
      G.jobs = allJobs.filter(job => 
        job.role === 'contractor' && 
        job.assignedContractor === G.currentUser.id
      );
    } else if (G.currentUserRole === 'technician') {
      // Filter for 'technician' jobs AND check assignedTech if needed
      G.jobs = allJobs.filter(job =>
        job.role === 'technician' &&
        job.assignedTech === G.currentUser.id
      );
    } else {
      // Fallback: if there's some unknown role, no jobs
      G.jobs = [];
    }

    console.log('Job list filtered for role:', G.currentUserRole, G.jobs);
    showDashboard(G.currentUserRole);
  } catch (error) {
    console.error('Error refreshing contractor/tech view:', error);
  }
}
/**
 * Delete a job and refresh the UI.
 *
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
  } else if (G.currentUserRole === 'technician') {
    populateTechJobs(G.jobs);
  } else {
    // default to contractor view
    populateContractorJobs(G.jobs);
  }
  showDashboard(G.currentUserRole);
}

