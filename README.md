# Infinite-FS-Explorer

Infinitely and explore files on System Fast

## Running the Application with Docker Compose

This project provides a flexible setup to run the frontend and backend services using Docker Compose, accommodating both local development and full Dockerized deployment.

### Prerequisites

- Docker Desktop (or Docker Engine) installed and running.
- Node.js and npm (or yarn) installed locally for frontend development (if using Option 1).

### Setup Steps

1.  **Create the `data` directory**:
    The backend service expects a `data` directory at the project root to serve files.
    ```bash
    mkdir data
    # Optionally, add some test files to 'data/' for the backend to serve.
    # Example:
    # echo "Hello from Docker!" > data/example.txt
    ```

### Running The Application

This method runs both frontend and backend services entirely within Docker containers, suitable for testing the full stack in a production-like environment.

1.  **Ensure you are in the project root directory**:
    ```bash
    cd ~/infinite-fs-explorer
    ```
2.  **Map the 'Data' directory you want to be mapped into the API container**:
    ```bash
    services:
      api:
        volumes:
          - ./data:/data:ro # Mount data directory as read-only
        environment:
          DATA_ROOT: /data
    ```
3.  **Build and run all Docker services**:

    ```bash
    docker compose up --build
    ```

    The `--build` flag ensures both images are rebuilt with the latest changes (including the frontend Dockerfile and Nginx configuration).

4.  **Access the applications**:
    - The **backend API** will be accessible on your host machine at `http://localhost:4000`.
    - The **frontend application** will be accessible on your host machine at `http://localhost:4200`. Nginx inside the frontend container will correctly proxy `/api` requests to the `api` service within the Docker network.
