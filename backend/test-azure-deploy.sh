#!/bin/bash
# Script to test deploying to Azure App Service using curl

# Replace with your password from the publish profile
PASSWORD="N1FfLS9X2q4bdf5wjwai86l5JgauK9uXctqGWyNtZrhS0exqGBm4tTzRnoa2"

# Create a simple test zip file
mkdir -p test_deploy
echo "print('Hello, Azure!')" > test_deploy/app.py
echo "web: python app.py" > test_deploy/Procfile
cd test_deploy
zip -r ../test_deploy.zip *
cd ..

# Test the deployment with verbose output
echo "Testing deployment to Azure App Service..."
curl -v -X POST -u "\$LiveCanvas:$PASSWORD" \
  --data-binary @test_deploy.zip \
  https://livecanvas-fjancxf4czdbcjg0.scm.canadacentral-01.azurewebsites.net/api/zipdeploy

echo -e "\n\nIf the above fails, try the alternative endpoint:"
echo "curl -v -X POST -u \"\$LiveCanvas:$PASSWORD\" --data-binary @test_deploy.zip https://livecanvas-fjancxf4czdbcjg0.scm.canadacentral-01.azurewebsites.net/deployments/latest"

# Clean up
rm -rf test_deploy
rm test_deploy.zip