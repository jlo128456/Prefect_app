// utils.js
 export function formatForDisplay(dateInput) {
  if (!dateInput) return "Not Logged"; // Handle NULL values

  const date = new Date(dateInput);
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
  