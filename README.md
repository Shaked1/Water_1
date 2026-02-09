# 📝 Automatic Work Journal System - H.S.H.A

A web-based reporting system designed for field managers to document water infrastructure repairs. The system generates professional PDF reports with site photos and automatically saves them to a secure Google Shared Drive.



## 🚀 Key Features
* **Digital Reporting:** Mobile-friendly form optimized for field use.
* **Automated Calculations:** Instant calculation of waste volume, asphalt area, bedding, and sand based on excavation dimensions.
* **Visual Documentation:** Upload up to 5 field photos directly into the report.
* **Smart Cloud Storage:** Automatic upload to a designated Google Workspace Shared Drive.
* **Professional Output:** Generates a formatted A4 PDF report including all technical details and images.

## 🛠 Tech Stack
* **Backend:** Node.js & Express
* **PDF Generation:** `html-pdf-node` (Headless Chromium)
* **Cloud Storage:** Google Drive API v3
* **Hosting:** Railway.app
* **Authentication:** Google Service Account (OAuth2)

## ⚙️ Configuration & Deployment

### Environment Variables
To ensure security, sensitive credentials are not stored in the code. The following variable must be configured in your hosting environment (Railway):
* `GOOGLE_CREDENTIALS_JSON`: The full content of your Google Service Account JSON key.
* `PORT`: Server port (defaults to 8080).

### Project Structure
* `server.js`: Main server logic, Google Auth, and PDF generation.
* `form.html`: User interface and form validation.
* `package.json`: Dependency management and start scripts.
* `.gitignore`: Prevents sensitive files (like local credentials) from being uploaded to GitHub.

## 📂 Storage
Reports are stored in a centralized Shared Drive.


---
© 2026 Developed for H.S.H.A - Water Infrastructure Management.