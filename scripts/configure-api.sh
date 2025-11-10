#!/bin/bash

# Script to configure API endpoints for AWS Amplify deployment
# This script will be run during the build process

echo "Configuring API endpoints for production..."

# Get the API Gateway URL from Amplify environment (if available)
if [ -n "$AWS_BRANCH" ]; then
    echo "Detected Amplify build environment"
    
    # The API Gateway URL will be available after backend deployment
    # For now, we'll use relative paths which will work with Amplify's proxy setup
    export REACT_APP_API_URL="/api"
    echo "Set REACT_APP_API_URL to /api for production"
else
    echo "Using development configuration"
fi

echo "API configuration complete"
