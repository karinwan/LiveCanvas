import os
from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv
import logging
from app.socketio_instance import socketio
from app.services.web_socket import socketio_bp


def create_app():
    load_dotenv()
    app = Flask(__name__, static_folder="../static", template_folder="../templates")
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

    # Configure CORS properly
    CORS(
        app,
        resources={
            r"*": {
                "origins": [
                    "http://localhost:4430",
                    "http://127.0.0.1:4430",
                    "https://victorious-ground-0e3a36a0f.6.azurestaticapps.net",  # Your static web app URL
                ],
                "methods": ["GET", "POST", "OPTIONS"],
                "allow_headers": ["Content-Type"],
            }
        },
    )

    # Configure logging
    logging.basicConfig(level=logging.DEBUG)

    # Add more detailed logging
    @app.after_request
    def after_request(response):
        logging.info(
            f"Request: {request.method} {request.path} -> Status: {response.status}"
        )
        return response

    # Filter out unwanted requests
    @app.before_request
    def before_request():
        if "hybridaction/zybTrackerStatisticsAction" in request.path:
            return "", 204  # Return empty response with 204 status

    from .routes import admin, public
    from .routes.site import site_bp

    app.register_blueprint(admin.bp, url_prefix="/api/admin")
    app.register_blueprint(public.bp, url_prefix="/api/public")
    app.register_blueprint(site_bp)
    app.register_blueprint(socketio_bp)

    socketio.init_app(
        app,
        cors_allowed_origins=[
            "http://localhost:4430",
            "http://127.0.0.1:4430",
            "https://victorious-ground-0e3a36a0f.6.azurestaticapps.net",
            "https://livecanvas.z13.web.core.windows.net",
        ],
    )

    return app
