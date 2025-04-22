import pytest
import json
from unittest.mock import patch, MagicMock
from flask import Flask, request
from flask_socketio import SocketIO

from app.services.web_socket import active_rooms, drawing_buffer, redo_history
from app import create_app


class FakeRequest:
    """A fake request object that mimics Flask-SocketIO request"""

    def __init__(self, sid="test-sid"):
        self.sid = sid


@pytest.fixture(autouse=True)
def clear_globals():
    """Clear global variables before each test to ensure isolation"""
    active_rooms.clear()
    drawing_buffer.clear()
    yield


@pytest.fixture
def app():
    """Create a Flask app for testing"""
    app = create_app()
    app.config.update(
        {
            "TESTING": True,
            "SECRET_KEY": "test_key",
        }
    )
    return app


@pytest.fixture
def socket_app(app):
    """Create a Flask app with SocketIO for testing"""
    socket_io = SocketIO(app, json=json, manage_session=False)
    yield app, socket_io


def test_connect(capsys):
    """Test the connection event"""
    mock_sid = "test-sid-123"
    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import connect

        connect()

        # Check if message was printed
        captured = capsys.readouterr()
        assert captured.out.strip() == f"Client connected with sid: {mock_sid}"


def test_disconnect():
    """Test the disconnection event"""
    mock_sid = "test-sid-123"
    mock_username = "test_user"
    room = "test_room"
    active_rooms[room] = {
        "created_by": "creator_sid",
        "users": [{"sid": mock_sid, "username": mock_username}],
        "name": "test_name",
    }
    drawing_buffer[room] = []

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import disconnect

        disconnect()

        # Check if user was removed from the room
        assert len(active_rooms[room]["users"]) == 0

        assert mock_emit.call_count >= 2
        first_call = mock_emit.call_args_list[0][0]
        assert first_call[0] == "left_room"
        assert first_call[1]["room"] == room
        assert first_call[1]["userLeft"] == mock_username
        assert first_call[1]["userCount"] == 0

        second_call = mock_emit.call_args_list[1][0]
        assert second_call[0] == "room_users_update"
        assert second_call[1]["roomId"] == room
        assert second_call[1]["userCount"] == 0


def test_message():
    """Test the message event"""
    mock_sid = "test-sid-123"
    mock_message = "Hello, World!"

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.send"
    ) as mock_send:
        from app.services.web_socket import handle_message

        handle_message(mock_message)

        mock_send.assert_called_once_with(f"Echo: {mock_message}")


def test_create_room():
    """Test creating a room with a valid name and type"""
    mock_sid = "test-sid-123"
    room_data = {"room": "test_room", "type": "public", "name": "test_name"}

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import create_room

        create_room(room_data)

        assert "test_room" in active_rooms
        assert active_rooms["test_room"]["created_by"] == mock_sid
        assert active_rooms["test_room"]["type"] == "public"
        assert active_rooms["test_room"]["users"] == []
        assert active_rooms["test_room"]["name"] == "test_name"
        assert len(active_rooms) == 1  # Ensure only one room exists
        assert "test_room" in drawing_buffer
        assert "test_room" in redo_history

        mock_emit.assert_called_with(
            "room_created", {"room": "test_room", "type": "public"}, broadcast=True
        )


def test_create_room_without_type_or_name():
    """Test creating a room without specifying room type and name"""
    mock_sid = "test-sid-123"
    room_data = {"room": "test_room"}  # Missing 'type' and 'name'

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import create_room

        create_room(room_data)

        mock_emit.assert_called_with(
            "error", {"message": "Room type and name required for room creation. "}
        )
        assert "test_room" not in active_rooms


def test_auto_generated_room_name():
    """Test that room name is auto-generated if not provided"""
    mock_sid = "test-sid-456"
    room_data = {
        "type": "private",
        "name": "test_name",
    }  # No 'room' key, so it should generate a UUID

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import create_room

        create_room(room_data)

        # Check if a room was created
        assert active_rooms, "No rooms were created; check the room creation logic."

        generated_room_name = next(
            iter(active_rooms.keys())
        )  # Get the generated UUID-based room name
        assert generated_room_name in active_rooms
        assert active_rooms[generated_room_name]["created_by"] == mock_sid
        assert active_rooms[generated_room_name]["type"] == "private"

        mock_emit.assert_called_with(
            "room_created",
            {"room": generated_room_name, "type": "private"},
            broadcast=True,
        )


def test_join_room():
    mock_sid = "test-sid-789"
    room_name = "join_test_room"

    # Set up test room
    active_rooms[room_name] = {
        "created_by": "creator_sid",
        "users": [],
        "name": "test_name",
    }
    drawing_buffer[room_name] = []

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit, patch("app.services.web_socket.join_room") as mock_join_room:
        from app.services.web_socket import join_room_handler

        join_room_handler({"room": room_name, "username": "test_user"})
        assert len(active_rooms[room_name]["users"]) == 1
        assert active_rooms[room_name]["users"][0]["username"] == "test_user"
        assert active_rooms[room_name]["users"][0]["sid"] == mock_sid
        mock_join_room.assert_called_with(room_name)
        assert mock_emit.call_count >= 2
        first_call_args = mock_emit.call_args_list[0][0]
        assert first_call_args[0] == "joined_room"
        assert first_call_args[1]["room"] == room_name
        assert first_call_args[1]["name"] == "test_name"
        assert first_call_args[1]["useJoined"] == "test_user"
        assert first_call_args[1]["userCount"] == 1


def test_join_room_missing_data():
    """Test joining a room with missing username"""
    mock_sid = "sid-missing-user"
    active_rooms["roomA"] = {"created_by": mock_sid, "users": [], "name": "Room A"}

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import join_room_handler

        # Missing username
        join_room_handler({"room": "roomA"})
        mock_emit.assert_called_with(
            "error", {"message": "Room name and username are required to join a room. "}
        )


def test_join_nonexistent_room():
    """Test joining a non-existent room"""
    mock_sid = "sid-join-fail"

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import join_room_handler

        join_room_handler({"room": "no_room", "username": "ghost"})
        mock_emit.assert_called_with(
            "error", {"message": "Room 'no_room' does not exist."}, to=mock_sid
        )


def test_join_room_at_capacity():
    """Test user rejected when room is full"""
    mock_sid = "sid-capacity"
    room_name = "full_room"
    active_rooms[room_name] = {
        "created_by": "creator_sid",
        "users": [{"sid": f"user-{i}", "username": f"user{i}"} for i in range(5)],
        "name": "Full Room",
    }

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import join_room_handler

        join_room_handler({"room": room_name, "username": "extra_user"})
        mock_emit.assert_called_with(
            "room_full",
            {
                "code": "ROOM_AT_CAPACITY",
                "roomId": room_name,
                "capacity": 5,
                "current": 5,
            },
            to=mock_sid,
        )


def test_multiple_users():
    room_name = "multi_user_room"

    # Create test room
    active_rooms[room_name] = {
        "created_by": "creator_sid",
        "users": [],
        "name": "test_name",
    }
    drawing_buffer[room_name] = []

    with patch("app.services.web_socket.emit") as mock_emit, patch(
        "app.services.web_socket.join_room"
    ) as mock_join_room:
        # First user joins
        from app.services.web_socket import join_room_handler

        with patch("app.services.web_socket.request", FakeRequest("user1-sid")):
            join_room_handler({"room": room_name, "username": "user1"})

        # Reset mock to clear call history
        mock_emit.reset_mock()

        # Second user joins
        with patch("app.services.web_socket.request", FakeRequest("user2-sid")):
            join_room_handler({"room": room_name, "username": "user2"})

        # Verify both users are in room
        assert len(active_rooms[room_name]["users"]) == 2
        user_names = [u["username"] for u in active_rooms[room_name]["users"]]
        assert "user1" in user_names
        assert "user2" in user_names

        # Verify user count is correct in events
        for call in mock_emit.call_args_list:
            args = call[0]
            if args[0] == "room_users_update":
                assert args[1]["userCount"] == 2
                break


def test_leave_room():
    """Test leaving a room"""
    mock_sid = "test-sid-leave"
    mock_sid2 = "test-sid-leave2"
    room_name = "leave_test_room"
    username = "leaver_user"
    username2 = "leaver_user_2"

    # Set up test room with the user
    active_rooms[room_name] = {
        "created_by": "creator_sid",
        "users": [
            {"sid": mock_sid, "username": username},
            {"sid": mock_sid2, "username": username2},
        ],
    }

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit, patch("app.services.web_socket.leave_room") as mock_leave_room:
        # Call the leave_room_handler directly
        from app.services.web_socket import leave_room_handler

        leave_room_handler({"room": room_name, "username": username})

        # Verify leave_room was called
        mock_leave_room.assert_called_with(room_name)

        # Verify user was removed from room
        assert room_name in active_rooms
        assert len(active_rooms[room_name]["users"]) == 1

        # Verify left_room event was emitted
        assert mock_emit.call_count >= 2
        first_call = mock_emit.call_args_list[0][0]
        assert first_call[0] == "left_room"
        assert first_call[1]["room"] == room_name
        assert first_call[1]["userLeft"] == username
        assert first_call[1]["userCount"] == 1


def test_leave_room_missing_all():
    """Test leave_room when both room and username are missing"""
    mock_sid = "sid-no-data"
    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import leave_room_handler

        leave_room_handler({})  # No room or username provided

        mock_emit.assert_called_with(
            "error", {"message": "Room name is required to leave a room."}, to=mock_sid
        )


def test_leave_nonexistent_room():
    """Test leave_room for a room that does not exist"""
    mock_sid = "sid-nonexistent"
    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import leave_room_handler

        leave_room_handler({"room": "ghost_room", "username": "ghost"})

        mock_emit.assert_called_with(
            "error", {"message": "Room 'ghost_room' does not exist."}, to=mock_sid
        )


def test_get_rooms():
    """Test getting the list of active rooms"""
    mock_sid = "sid-get-rooms"
    active_rooms["room1"] = {"created_by": mock_sid, "users": []}

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import get_rooms

        get_rooms()
        mock_emit.assert_called_with(
            "rooms_list", {"rooms": list(active_rooms.keys())}, to=mock_sid
        )


def test_get_room_type():
    """Test getting the room type"""
    room_name = "type_room"
    mock_sid = "sid-room-type"
    active_rooms[room_name] = {"created_by": mock_sid, "users": [], "type": "public"}

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import get_room_type

        get_room_type({"roomId": room_name})
        mock_emit.assert_called_with("room_type", {"type": "public"}, to=mock_sid)


def test_get_room_name():
    """Test getting the room name"""
    room_name = "named_room"
    mock_sid = "sid-room-name"
    active_rooms[room_name] = {"created_by": mock_sid, "users": [], "name": "My Room"}

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import get_room_name

        get_room_name({"roomId": room_name})
        mock_emit.assert_called_with(
            "room_name_updated",
            {"roomId": room_name, "newName": "My Room"},
            to=mock_sid,
        )


def test_update_room_name():
    """Test updating the room name"""
    room_name = "update_room"
    mock_sid = "sid-update"
    active_rooms[room_name] = {"created_by": mock_sid, "users": [], "name": "Old Name"}

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import update_room_name

        update_room_name({"roomId": room_name, "newName": "New Name"})
        assert active_rooms[room_name]["name"] == "New Name"
        mock_emit.assert_called_with(
            "room_name_updated",
            {"roomId": room_name, "newName": "New Name"},
            to=room_name,
        )


def test_update_room_name_nonexistent_room():
    """Test update_room_name when the room does not exist"""
    mock_sid = "sid-update-nonexistent"

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import update_room_name

        update_room_name({"roomId": "ghost_room", "newName": "New Ghost Name"})

        mock_emit.assert_called_with(
            "error", {"message": "Room 'ghost_room' does not exist."}, to=mock_sid
        )


def test_canvas_state_update():
    """Test updating the canvas state"""
    room = "canvas_update_room"
    mock_sid = "test-sid-canvas"
    active_rooms[room] = {"created_by": mock_sid, "users": []}
    drawing_buffer[room] = ["state1"]

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_canvas_state

        # Same state should be ignored
        handle_canvas_state(
            {"roomId": room, "canvasState": "state1", "isUndoRedo": False}
        )
        assert drawing_buffer[room] == ["state1"]
        # New state should be added
        handle_canvas_state(
            {"roomId": room, "canvasState": "state2", "isUndoRedo": False}
        )
        assert drawing_buffer[room] == ["state1", "state2"]

        mock_emit.assert_called_with(
            "canvas_state_update",
            {"roomId": room, "canvasState": "state2", "isUndoRedo": False},
            to=room,
            skip_sid=mock_sid,
        )


def test_canvas_state_update_undo_redo_flag():
    """Test update with isUndoRedo=True should not modify history"""
    room = "canvas_room_undo"
    mock_sid = "sid-undo"
    prev_state = '{"background": "blue"}'
    active_rooms[room] = {"created_by": mock_sid, "users": []}
    drawing_buffer[room] = [prev_state]

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_canvas_state

        handle_canvas_state(
            {
                "roomId": room,
                "canvasState": '{"background": "green"}',
                "isUndoRedo": True,
            }
        )

        assert len(drawing_buffer[room]) == 1  # Not added
        mock_emit.assert_called_once()


def test_canvas_state_update_missing_data():
    """Test missing room ID or canvas state triggers error"""
    mock_sid = "sid-missing"

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_canvas_state

        handle_canvas_state({"canvasState": "someState"})  # No roomId
        mock_emit.assert_called_with(
            "error", {"message": "Missing room ID or canvas state"}, to=mock_sid
        )


def test_get_room_info():
    """Test getting room info"""
    room_name = "info_room"
    mock_sid = "sid-room-info"
    active_rooms[room_name] = {"created_by": mock_sid, "users": ["a", "b", "c"]}

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import get_room_info

        get_room_info({"room": room_name})
        mock_emit.assert_called_with(
            "room_info",
            {
                "roomId": room_name,
                "userCount": 3,
                "capacity": 5,
                "isFull": False,
            },
            to=mock_sid,
        )


def test_get_room_info_missing_room():
    """Test get_room_info with missing room name"""
    mock_sid = "sid-missing-room"

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import get_room_info

        get_room_info({})  # No 'room' key

        mock_emit.assert_called_with(
            "error", {"message": "Room name is required"}, to=mock_sid
        )


def test_get_room_info_nonexistent_room():
    """Test get_room_info for a room that does not exist"""
    mock_sid = "sid-nonexistent-room"

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import get_room_info

        get_room_info({"room": "ghost_room"})

        mock_emit.assert_called_with(
            "error", {"message": "Room 'ghost_room' does not exist."}, to=mock_sid
        )


def test_get_room_info_room_full():
    """Test get_room_info for a full room"""
    mock_sid = "sid-room-full"
    room_name = "full_room"
    active_rooms[room_name] = {
        "created_by": mock_sid,
        "users": [{"sid": f"user-{i}", "username": f"user{i}"} for i in range(5)],
        "name": "Maxed Room",
    }

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import get_room_info

        get_room_info({"room": room_name})

        mock_emit.assert_called_with(
            "room_info",
            {
                "roomId": room_name,
                "userCount": 5,
                "capacity": 5,
                "isFull": True,
            },
            to=mock_sid,
        )


def test_client_drawing_line():
    """Test client drawing events with lineData"""
    room = "draw_line_room"
    active_rooms[room] = {"created_by": "sid", "users": []}
    drawing_data = {
        "roomId": room,
        "lineData": {"x1": 10, "y1": 10, "x2": 20, "y2": 20},
    }

    with patch("app.services.web_socket.request", FakeRequest("sid")), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_drawing

        handle_drawing(drawing_data)
        assert "id" in drawing_data["lineData"]
        assert "timestamp" in drawing_data
        mock_emit.assert_called_once()
        assert mock_emit.call_args[0][0] == "server_drawing"
        assert mock_emit.call_args[1]["to"] == room


def test_client_drawing_rectangle():
    """Test client drawing events with rectData"""
    room = "draw_rect_room"
    active_rooms[room] = {"created_by": "sid", "users": []}
    drawing_data = {
        "roomId": room,
        "rectData": {"x": 10, "y": 10, "width": 100, "height": 50},
    }

    with patch("app.services.web_socket.request", FakeRequest("sid")), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_drawing

        handle_drawing(drawing_data)
        assert "id" in drawing_data["rectData"]
        assert "timestamp" in drawing_data
        mock_emit.assert_called_once()
        assert mock_emit.call_args[0][0] == "server_drawing"


def test_client_drawing_arrow():
    """Test client drawing events with arrowData"""
    room = "draw_arrow_room"
    active_rooms[room] = {"created_by": "sid", "users": []}
    drawing_data = {"roomId": room, "arrowData": {"start": [0, 0], "end": [100, 100]}}

    with patch("app.services.web_socket.request", FakeRequest("sid")), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_drawing

        handle_drawing(drawing_data)
        assert "id" in drawing_data["arrowData"]
        assert "timestamp" in drawing_data
        mock_emit.assert_called_once()


def test_client_drawing_text():
    """Test client drawing events with textData"""
    room = "draw_text_room"
    active_rooms[room] = {"created_by": "sid", "users": []}
    drawing_data = {"roomId": room, "textData": {"text": "Hello", "x": 50, "y": 50}}

    with patch("app.services.web_socket.request", FakeRequest("sid")), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_drawing

        handle_drawing(drawing_data)
        assert "id" in drawing_data["textData"]
        assert "timestamp" in drawing_data
        mock_emit.assert_called_once()


def test_canvas_clear():
    """Test clearing the canvas"""
    room_name = "clear_test_room"
    active_rooms[room_name] = {"created_by": "creator_sid", "users": []}
    drawing_buffer[room_name] = [
        {
            "roomId": room_name,
            "pathData": {
                "type": "Path",
                "path": "M 50 50 L 150 150",
            },
        }
    ]

    with patch("app.services.web_socket.emit") as mock_emit:
        # Call the canvas clear handler directly
        from app.services.web_socket import handle_canvas_clear

        handle_canvas_clear({"roomId": room_name})

        # Verify drawing buffer was cleared
        assert room_name in drawing_buffer
        assert len(drawing_buffer[room_name]) == 1

        # Verify clear events were emitted (checking calls)
        assert mock_emit.call_count == 1
        first_call_args = mock_emit.call_args_list[0][0]
        assert first_call_args[0] == "server_canvasClear"
        assert first_call_args[1]["roomId"] == room_name


def test_undo_canvas_state():
    """Test undo canvas state"""
    room = "undo_room"
    mock_sid = "test-sid-undo"
    # Add dummy history
    active_rooms[room] = {"created_by": mock_sid, "users": []}
    drawing_buffer[room] = ["state1", "state2"]
    redo_history[room] = []

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_undo

        handle_undo({"roomId": room})

        assert drawing_buffer[room] == ["state1"]
        assert redo_history[room] == ["state2"]

        # Ensure canvas_state_update was emitted
        mock_emit.assert_called_with(
            "canvas_state_update",
            {"roomId": room, "canvasState": "state1", "isUndoRedo": True},
            to=room,
        )


def test_undo_room_not_found():
    """Test undo when the room is not in drawing_buffer"""
    mock_sid = "sid-undo-not-found"

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_undo

        handle_undo({"roomId": "ghost_room"})

        mock_emit.assert_called_with(
            "error", {"message": "Room not found"}, to=mock_sid
        )


def test_undo_nothing_to_undo():
    """Test undo when there are no canvas states"""
    mock_sid = "sid-undo-empty"
    room = "undo_empty_room"
    drawing_buffer[room] = []

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_undo

        handle_undo({"roomId": room})

        mock_emit.assert_called_with(
            "error", {"message": "Nothing to undo"}, to=mock_sid
        )


def test_redo_canvas_state():
    """Test redo canvas state"""
    room = "redo_room"
    mock_sid = "test-sid-redo"
    active_rooms[room] = {"created_by": mock_sid, "users": []}
    drawing_buffer[room] = ["state1"]
    redo_history[room] = ["state2"]

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_redo

        handle_redo({"roomId": room})

        assert drawing_buffer[room] == ["state1", "state2"]
        assert redo_history[room] == []

        mock_emit.assert_called_with(
            "canvas_state_update",
            {"roomId": room, "canvasState": "state2", "isUndoRedo": True},
            to=room,
        )


def test_redo_room_not_found_or_empty():
    """Test redo when room not in redo_history or no states exist"""
    mock_sid = "sid-redo"
    room = "redo_room"

    # Case 1: Room not in redo_history
    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_redo

        handle_redo({"roomId": "ghost_room"})
        mock_emit.assert_called_with(
            "error", {"message": "Nothing to redo"}, to=mock_sid
        )

    # Case 2: Room exists but no redo states
    redo_history[room] = []

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        handle_redo({"roomId": room})
        mock_emit.assert_called_with(
            "error", {"message": "Nothing to redo"}, to=mock_sid
        )


def test_upload_json_content():
    """Test uploading JSON content, after the change this will no longer has its seperate type"""
    mock_sid = "test-sid-json"
    room_name = "json_test_room"

    # Set up test room
    active_rooms[room_name] = {"created_by": "creator_sid", "users": []}
    drawing_buffer[room_name] = []

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit, patch("uuid.uuid4", return_value="test-uuid"):
        # Call the JSON upload handler directly
        from app.services.web_socket import handle_uploaded_json

        # Prepare test JSON content
        test_json = {
            "version": "5.2.1",
            "objects": [
                {"type": "rect", "width": 100, "height": 100, "left": 50, "top": 50}
            ],
            "background": "#fff",
        }

        handle_uploaded_json({"roomId": room_name, "jsonContent": test_json})
        assert room_name in drawing_buffer
        assert len(drawing_buffer[room_name]) == 1
        assert drawing_buffer[room_name][0] == json.dumps(test_json)

        # Verify event was emitted
        mock_emit.assert_called_with(
            "uploaded_json_content",
            {"roomId": room_name, "jsonContent": test_json, "timestamp": "test-uuid"},
            to=room_name,
        )


def test_json_persistence():
    mock_sid = "test-sid-persistence"
    room_name = "persistence_test_room"

    # Set up test room with JSON content
    active_rooms[room_name] = {
        "created_by": "creator_sid",
        "users": [],
        "name": "test_name",
    }

    # Add JSON content to drawing buffer
    test_json = {"version": "5.2.1", "objects": [{"type": "rect"}]}
    drawing_buffer[room_name] = [
        {
            "type": "json_upload",
            "roomId": room_name,
            "jsonContent": test_json,
            "timestamp": "test-timestamp-123",
        }
    ]

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit, patch("app.services.web_socket.join_room") as mock_join_room:
        # Call join_room_handler
        from app.services.web_socket import join_room_handler

        join_room_handler({"room": room_name, "username": "new_user"})

        # Verify join_room was called
        mock_join_room.assert_called_with(room_name)

        # Verify user was added to room
        assert len(active_rooms[room_name]["users"]) == 1
        assert active_rooms[room_name]["users"][0]["username"] == "new_user"

        # Verify JSON content was sent to the new user
        json_emission = None
        for call in mock_emit.call_args_list:
            args = call[0]
            kwargs = call[1]
            if (
                args[0] == "uploaded_json_content"
                and "to" in kwargs
                and kwargs["to"] == mock_sid
            ):
                json_emission = args[1]
                break

        assert json_emission is not None
        assert json_emission["roomId"] == room_name
        assert json_emission["jsonContent"] == test_json


def test_upload_json_missing_room():
    """Test uploading JSON content with missing roomId"""
    mock_sid = "sid-json-missing-room"

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_uploaded_json

        handle_uploaded_json({"jsonContent": {"type": "canvas"}})

        mock_emit.assert_called_with(
            "error", {"message": "Missing room ID or JSON content"}, to=mock_sid
        )


def test_upload_json_missing_content():
    """Test uploading JSON content with missing jsonContent"""
    mock_sid = "sid-json-missing-content"

    with patch("app.services.web_socket.request", FakeRequest(mock_sid)), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_uploaded_json

        handle_uploaded_json({"roomId": "room1"})

        mock_emit.assert_called_with(
            "error", {"message": "Missing room ID or JSON content"}, to=mock_sid
        )


def test_upload_json_unserializable_object():
    """Test uploading JSON content that is not serializable"""
    room = "unserializable_room"
    active_rooms[room] = {"created_by": "sid", "users": []}
    drawing_buffer[room] = []

    class Unserializable:
        pass

    with patch("app.services.web_socket.request", FakeRequest("sid")), patch(
        "app.services.web_socket.emit"
    ) as mock_emit:
        from app.services.web_socket import handle_uploaded_json

        handle_uploaded_json({"roomId": room, "jsonContent": Unserializable()})

        # Despite failure, it should still convert to string and append
        assert len(drawing_buffer[room]) == 1
        assert isinstance(drawing_buffer[room][0], str)
        mock_emit.assert_called_once()
        assert mock_emit.call_args[0][0] == "uploaded_json_content"
