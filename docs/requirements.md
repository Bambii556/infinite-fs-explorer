# Technical Assessment – Requirements

1. **Backend API (Node.js)**

   - Develop a Node.js API that returns the **full directory listing** of a given directory path on the host machine's local filesystem.
   - Response must include for each entry:
     - filename
     - full path
     - file size
     - extension / file type
     - created date
     - file permissions / attributes
   - Must differentiate between files and directories.
   - Must support **large directories (at least 200 000 entries)** without crashing or excessive memory usage.
   - Clicking a directory must update the listing to show its contents (drill-down navigation).
   - The application must be fully **containerised** (Docker) and able to run on any system.
   - You may use **REST** or **GraphQL** (we are a GraphQL company, but use whatever you are most comfortable with).

2. **Frontend (Angular 15+)**

   - Build an Angular (v15 or higher) client that calls the API and displays the results.
   - UI does not need to be elaborate — Bootstrap or similar is acceptable.
   - Must be **responsive** and look good on most devices (mobile + desktop).

3. **General**
   - Try to **stay away from imperative-style coding as much as possible**.
   - **Stream is your partner** — solutions should be memory-efficient and streaming-aware.
   - Submit the complete solution in a public **GitHub or GitLab repository** and share the link.
