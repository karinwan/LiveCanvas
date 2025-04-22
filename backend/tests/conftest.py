import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import tempfile
import pytest
from app.__init__ import create_app


@pytest.fixture
def app():
    # Create a temporary file to isolate the database for each test
    db_fd, db_path = tempfile.mkstemp()

    app = create_app()
    app.config.update(
        {
            "TESTING": True,
        }
    )

    yield app

    # Clean up the temporary file
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def runner(app):
    return app.test_cli_runner()
