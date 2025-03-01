// globals.js
export const G = {
  // Data
  users: [],
  jobs: [],
  pollingInterval: null,
  currentUserRole: null,

  // DOM Elements
  loginForm: document.getElementById("loginForm"),
  adminView: document.getElementById("adminView"),
  contractorView: document.getElementById("contractorView"),
  contractorJobList: document.getElementById("contractorJobList"),
  adminJobList: document.getElementById("adminJobList"),
   // NEW: Add references for the tech view
  techView: document.getElementById("techView"),
  techJobList: document.getElementById("techJobList"),
};
window.G = G;