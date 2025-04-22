#!/bin/bash

# Navigate to the backend folder, which is the actual location after extracting the compressed file
cd /home/site/wwwroot/backend

# Get the port specified by the environment variable or default to 8080
export PORT=${PORT:-8080}

# Add the current directory to the Python path
export PYTHONPATH=$PYTHONPATH:/home/site/wwwroot/backend

# Use eventlet but add an environment variable to resolve SSL errors
export EVENTLET_NO_GREENDNS=yes

# Display the current directory contents for debugging
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# Run the application
gunicorn --worker-class eventlet -w 1 --bind=0.0.0.0:$PORT "run:app" --timeout 600 --log-level debug