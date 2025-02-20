async function moveJobToInProgress(jobId) {
    try {
      const jobResponse = await fetch(`http://localhost:3000/jobs/${jobId}`);
      const job = await jobResponse.json();
  
      if (!job) {
        alert("Job not found.");
        return;
      }
  
      let updatedStatus = job.status === "Pending" ? "In Progress" : "Completed - Pending Approval";
      let contractorStatus = job.status === "Pending" ? "In Progress" : "Completed";
      
      await fetch(`http://localhost:3000/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: updatedStatus, contractorStatus: contractorStatus })
      });
  
      alert(`Job updated to '${updatedStatus}'.`);
      refreshContractorView();
    } catch (error) {
      console.error("Error updating job status:", error);
      alert("Failed to update job status.");
    }
  }
  
  async function refreshContractorView() {
    try {
      const jobsResponse = await fetch("http://localhost:3000/jobs");
      jobs = await jobsResponse.json();
      populateContractorJobs(loggedInUser.username);
    } catch (error) {
      console.error("Error refreshing contractor view:", error);
    }
  }
  