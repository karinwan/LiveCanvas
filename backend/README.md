# Backend Service Documentation

## Setup and Installation

1. Create a virtual environment with conda:
   ```bash
   conda create -n ece651 python=3.12.8
   conda activate ece651
   ```

2. Install dependencies:
   ```bash
   cd ./backend
   pip install -r requirements.txt
   ```

## Running the Application

1. Start the Flask server:
   ```bash
   python run.py
   ```
   The server will start at `http://localhost:5000`
   If the sever not properly boost, try kill the port using
   
   ```bash
   lsof -i tcp:5000 
   kill -9 xxx 
   ```

2. For development with auto-reload:
   ```bash
   flask run --debug
   ```

## Running Tests

1. Run all tests:
   ```bash
   python -m pytest
   ```

2. Run tests with coverage:
   ```bash
   python -m pytest --cov=app tests/
   ```

## Development Guide

### Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── socketio_instance.py
│   ├── routes/
│   └── services/
├── tests/
├── static/
└── run.py
```

### Deployment:
az login
az webapp config set --resource-group LiveCanvas_group --name LiveCanvas --startup-file "startup.sh"
az webapp config set --resource-group LiveCanvas_group --name LiveCanvas --web-sockets-enabled true
az webapp config appsettings set --resource-group LiveCanvas_group --name LiveCanvas --settings "SECRET_KEY=ece657"       
On VSC Azure extension, deploy the backend code
Then, go to
https://livecanvas-fjancxf4czdbcjg0.canadacentral-01.azurewebsites.net/
And you shoud see:
{"message":"Site route works."}

### Adding New Endpoints

1. Create a new route file in `app/routes/` directory
2. Import necessary modules:
   ```python
   from flask import Blueprint, request, jsonify
   from app.models import db
   from app.services import YourService
   ```

3. Create a Blueprint:
   ```python
   your_route = Blueprint('your_route', __name__)
   ```

4. Define your endpoints:
   ```python
   @your_route.route('/your-endpoint', methods=['GET'])
   def get_something():
       try:
           # Your logic here
           return jsonify({"message": "Success"}), 200
       except Exception as e:
           return jsonify({"error": str(e)}), 400
   ```

5. Register the Blueprint in `app/__init__.py`:
   ```python
   from app.routes.your_route import your_route
   app.register_blueprint(your_route, url_prefix='/api')
   ```

### Best Practices

1. Keep routes clean and minimal
2. Put business logic in service classes
3. Use models for database operations
4. Write tests for new endpoints
5. Follow RESTful conventions
6. Handle errors appropriately
7. Document API endpoints using docstrings

## Linter

We use `black` as our linter. Please run the linter with the following command:

```bash
black backend
```

The setup is in `./backend/pyproject.toml`.

## Troubleshooting

Common issues and solutions:
- Database connection errors: Check DATABASE_URL in .env
- Import errors: Ensure virtual environment is activated
- Permission issues: Check file/directory permissions
- Port conflicts: Change port using `flask run -p <port>`

For more information, refer to the Flask documentation: https://flask.palletsprojects.com/
