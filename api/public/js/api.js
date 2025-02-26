// Replace these with your actual jsonbin IDs.
const USERS_BIN_URL = 'https://api.jsonbin.io/v3/b/67bb00c2ad19ca34f80efa55';
const JOBS_BIN_URL = 'https://api.jsonbin.io/v3/b/67bb011be41b4d34e4993fc2';
// Your master key (ideally, do not hardcode this in production)
const MASTER_KEY = '$2a$10$y0KP8R8bOJfHiuMOUousK.0M5pWd19wjCdLU74qjeOGpeIOwZ3oOS';

/**
 * Load JSON data (users, jobs) from jsonbin and store in globals.
 */
export async function loadData() {
  try {
    // Fetch from the Jobs bin
    const jobsResponse = await fetch(JOBS_BIN_URL, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER_KEY
      }
    });
    // Since the JSON is { record: { jobs: [...] } }
    const jobsData = await jobsResponse.json();
    G.jobs = jobsData.record.jobs; // <-- note the .record.jobs

    console.log("Jobs loaded:", G.jobs);

    // Fetch from the Users bin
    const usersResponse = await fetch(USERS_BIN_URL, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER_KEY
      }
    });
    const usersData = await usersResponse.json();
    G.users = usersData.record.users; // if it's also { record: { users: [...] } }

    console.log("Users loaded:", G.users);
  } catch (error) {
    console.error("Error loading JSON:", error);
  }
}

/**
 * Update a job's status.
 */
export async function updateJobStatus(jobId, newStatus) {
  try {
    // Fetch the current jobs data and extract the jobs array
    const response = await fetch(JOBS_BIN_URL, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER_KEY
      }
    });
    const fetchedData = await response.json();
    const jobsData = fetchedData.record.jobs; // note .record.jobs

    // Update the job status locally
    const updatedJobs = jobsData.map(job => {
      if (job.id === jobId) {
        return { ...job, status: newStatus };
      }
      return job;
    });

    // PUT the updated jobs array back to JSONbin,
    // preserving the structure: { record: { jobs: [...] } }
    const putResponse = await fetch(JOBS_BIN_URL, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        'X-Master-Key': MASTER_KEY
      },
      body: JSON.stringify({
        record: {
          jobs: updatedJobs
        }
      })
    });
    if (!putResponse.ok) throw new Error("Failed to update job status.");

    alert(`Job status updated to '${newStatus}'.`);
    // Optionally reload jobs from JSONbin (for example, call loadData())
    await loadData();
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
      headers: { 
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER_KEY
      }
    });
    const fetchedData = await response.json();
    const latestJobs = fetchedData.record.jobs; // note .record.jobs

    // Compare with current global G.jobs
    if (JSON.stringify(latestJobs) !== JSON.stringify(G.jobs)) {
      console.log("Job list updated. Refreshing admin dashboard...");
      G.jobs = latestJobs;
      // Re-populate the admin dashboard if desired
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
    const jobsResponse = await fetch(JOBS_BIN_URL, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER_KEY
      }
    });
    const fetchedData = await jobsResponse.json();
    G.jobs = fetchedData.record.jobs; // note .record.jobs

    // If you have a global G.users array for contractors:
    const contractor = G.users.find(u => u.role === "contractor")?.username;
    console.log("Contractor view refreshed with updated job data.");
  } catch (error) {
    console.error("Error refreshing contractor view:", error);
  }
}

/**
 * Delete a job (Admin function).
 *
 * Note: JSONbin does not support DELETE for a single entry.
 * Instead, fetch the data, remove the job locally, and PUT the updated record back.
 */
export async function deleteJob(jobId) {
  if (confirm("Are you sure you want to delete this job?")) {
    try {
      // Fetch current jobs and extract the jobs array
      const response = await fetch(JOBS_BIN_URL, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'X-Master-Key': MASTER_KEY
        }
      });
      const fetchedData = await response.json();
      const jobsData = fetchedData.record.jobs; // note .record.jobs

      // Remove the job with the given id
      const updatedJobs = jobsData.filter(job => job.id !== jobId);

      // Write the updated data back to JSONbin (preserving structure)
      const putResponse = await fetch(JOBS_BIN_URL, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          'X-Master-Key': MASTER_KEY
        },
        body: JSON.stringify({
          record: {
            jobs: updatedJobs
          }
        })
      });
      if (!putResponse.ok) throw new Error("Failed to delete job.");

      alert("Job deleted successfully.");
      // Optionally, refresh or call loadData() again
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete the job.");
    }
  }
}

