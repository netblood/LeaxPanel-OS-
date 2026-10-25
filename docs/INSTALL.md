# Install

For Ubuntu 22.04 or 24.04, review [deploy/ubuntu/install.sh](../deploy/ubuntu/install.sh), copy the repository to `/opt/leaxpanel`, and run the installer as root. The installer creates secrets, writes a mode-600 `.env`, enables Docker, and starts the minimal Compose stack.

For local preview, use `npm start`. It generates temporary development credentials when the required `.env` values are blank and prints the admin login. Preview mode reports PostgreSQL and Redis as unavailable rather than claiming they are healthy.
