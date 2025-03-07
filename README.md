# Job Management App

A web-based dashboard for managing and tracking job statuses. This application provides separate views for administrators, contractors, and technicians. Administrators can add new jobs, update job statuses, and view job details via an interactive dashboard with modal forms for input.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Setup & Configuration](#setup--configuration)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- **User Login:** Simple login form for authentication.
- **Admin Dashboard:** View and manage all jobs with an interactive table.
- **Modal Forms:** Use modal dialogs to add new jobs without reloading the page.
- **Job Status Updates:** Approve or reject jobs with dynamic UI updates.
- **Responsive UI:** Built with HTML, CSS, and JavaScript for a responsive experience.
- **Modular JavaScript:** Application logic is split across several modules for maintainability.

## Architecture

- **Frontend:**
  - **HTML/CSS:** The layout is defined in HTML and styled using CSS.
  - **JavaScript Modules:** The application logic is split into modules such as:
    - `globals.js`
    - `dashboard.js`
    - `api.js`
    - `utils.js`
    - `jobaction.js`
    - `main.js`
  - These modules handle user interface interactions, API requests, and dynamic updates to the dashboard.

- **Backend:**
  - The backend is a Node.js server (using `server.js`) that interfaces with a remote MySQL database hosted on a separate webserver.
  - The Node.js backend exposes endpoints (for example, `https://your-webserver.com/jobs/:id`) to retrieve and update job information.

## Setup & Configuration

- **No Repository Cloning Required:**  
  The application is deployed on a webserver and can be accessed directly via a URL.

- **Backend Configuration:**  
  The Node.js server (run using `node server.js`) connects to the MySQL database hosted on a different server. Ensure the backend is configured with the correct MySQL credentials and connection details.

- **Frontend Configuration:**  
  The web application is served from your webserver. Update the API endpoint in your JavaScript (e.g., in `api.js`) to point to:
For job-specific requests, append the job ID (e.g., `https://your-webserver.com/jobs/123`).

## Usage

- **Login:**  
Access the application in your browser and log in using your credentials.

- **Admin Dashboard:**  
Once logged in, administrators can view a table of jobs. Click the **"Create New Job"** button to open a modal form for adding a job.

- **Creating a Job:**  
Fill in the job details—including Work Order, Customer Name, Contractor/Tech Name, Work Required, and Role—then click **"Add Job"**. The application sends a POST request to the backend, and the job list updates automatically upon success.

- **Updating Job Status:**  
Use the **Approve** or **Reject** buttons next to each job to update its status. The dashboard will update the job’s status dynamically.

## API Endpoints

The backend server exposes endpoints on your webserver. For example:

- **GET `/jobs/:id`**  
Retrieves details for a specific job.

- **POST `/jobs`**  
Creates a new job. Expected JSON body:
- `work_order`: string
- `customer_name`: string
- `contractor`: string
- `work_required`: string
- `role`: string
- `status`: string (default is "Pending")

- **PUT/PATCH `/jobs/:id`**  
Updates job status or other details for a given job.

## Troubleshooting

- **404 Not Found Error:**  
If you encounter errors like `Error creating job: 404`, check the following:
- Verify the API endpoint URL in your JavaScript is correct.
- Ensure that the Node.js backend is running and that the route `/jobs` exists.
- Confirm that the backend server is accessible from your frontend.

- **Module Issues:**  
Ensure all JavaScript modules (e.g., `globals.js`, `dashboard.js`, etc.) are correctly loaded and that their file paths are accurate.

## License

This project is licensed under the Jeffrey Lo.