import ssl

if not hasattr(ssl, "wrap_socket"):

    def legacy_wrap_socket(*args, **kwargs):
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        return context.wrap_socket(*args, **kwargs)

    ssl.wrap_socket = legacy_wrap_socket

import eventlet
import eventlet.wsgi

eventlet.monkey_patch()

from app import create_app
from app.socketio_instance import socketio

app = create_app()


@app.route("/")
def root():
    return "Hello from Root!"


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=3000, debug=True)
else:
    pass
