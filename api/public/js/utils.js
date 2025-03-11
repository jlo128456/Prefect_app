// Format a Date for MySQL in UTC (YYYY-MM-DD HH:mm:ss)
export function formatForMySQLUTC(dateInput) {
  if (!dateInput) return null; // Handle null/undefined
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return null; // Handle invalid date

  // Use UTC getters
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Convert UTC datetime to local display in DD-MM-YYYY HH:mm:ss
export function formatForDisplayLocal(dateInput) {
  if (!dateInput) return "Not Logged"; // Handle null/undefined

  // Create a Date in the local time zone from the UTC string
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Invalid Date";

  // Local getters
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

  export function applyStatusColor(statusElement, status) {
    if (status === "Pending") {
      statusElement.style.backgroundColor = "Green";
      statusElement.style.color = "white";
    } else if (status === "In Progress") {
      statusElement.style.backgroundColor = "yellow";
      statusElement.style.color = "black";
    } else if (status === "Completed") {
      statusElement.style.backgroundColor = "Red";
      statusElement.style.color = "white";
    } else if (status === "Completed - Pending Approval") {
      statusElement.style.backgroundColor = "orange";
      statusElement.style.color = "white";
    }
  }
  