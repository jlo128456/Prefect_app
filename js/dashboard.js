const loginForm = document.getElementById("loginForm");
const adminView = document.getElementById("adminView");
const contractorView = document.getElementById("contractorView");

function resetViews() {
  adminView.style.display = "none";
  contractorView.style.display = "none";
  loginForm.style.display = "none";
}

function showDashboard(role) {
  resetViews();
  if (role === "admin") {
    adminView.style.display = "block";
    populateAdminJobs();
  } else if (role === "contractor") {
    contractorView.style.display = "block";
    populateContractorJobs(loggedInUser.username);
  }
  startPolling();
}
