from flask_socketio import SocketIO, emit, send, join_room, leave_room
from app.socketio_instance import socketio
from flask import Blueprint, request
import uuid
import time
import json

# Set the room capacity limit
ROOM_CAPACITY = 5
MAX_REDO_HISTORY = 10

socketio_bp = Blueprint("socketio_bp", __name__)
# this variable stores all the rooms in form: {"created_by", "users", "type", "name"}
active_rooms = {}
# this variable stores drawing of each room, use roomId as the key
drawing_buffer = {}
# stores redo history of each room, with maximum {MAX_REDO_HISTORY} elements
redo_history = {}


@socketio.on("connect")
def connect():
    sid = request.sid
    print(f"Client connected with sid: {sid}")


@socketio.on("disconnect")
def disconnect():
    sid = request.sid
    print(f"Client disconnected with sid: {sid}")

    # Find which rooms this user is in and remove them
    rooms_to_update = []
    user_found = False
    disconnect_username = None

    # Search for this SID in all active rooms
    for room_name, room_data in active_rooms.items():
        users = room_data.get("users", [])
        for user in users:
            if user.get("sid") == sid:
                disconnect_username = user.get("username")
                user_found = True
                rooms_to_update.append((room_name, disconnect_username))
                break
        if user_found:
            break

    # Now process all rooms where this user was found
    for room_name, username in rooms_to_update:
        if room_name in active_rooms:
            # Remove user from the room
            active_rooms[room_name]["users"] = [
                u for u in active_rooms[room_name]["users"] if u.get("sid") != sid
            ]

            user_count = len(active_rooms[room_name]["users"])
            print(
                f"Disconnect: User '{username}' removed from room '{room_name}', Users: {user_count}"
            )

            # Broadcast to the room that a user left
            emit(
                "left_room",
                {
                    "room": room_name,
                    "userLeft": username,
                    "userList": active_rooms[room_name],
                    "userCount": user_count,
                },
                room=room_name,
            )

            # Broadcast updated user count
            emit(
                "room_users_update",
                {"roomId": room_name, "userCount": user_count},
                room=room_name,
            )


@socketio.on("message")
def handle_message(data):
    print(f"Received message: {data}")
    send(f"Echo: {data}")


@socketio.on("create_room")
def create_room(data):
    room_name = data.get("room")
    room_type = data.get("type")
    name = data.get("name")
    if not room_type or not name:
        emit("error", {"message": "Room type and name required for room creation. "})
        return
    if not room_name:
        room_name = str(uuid.uuid4())
    if room_name and room_name not in active_rooms:
        active_rooms[room_name] = {
            "created_by": request.sid,
            "users": [],
            "type": room_type,
            "name": name,
        }
        # initialize state storage for the room
        drawing_buffer[room_name] = []
        redo_history[room_name] = []
        print(f"Room '{room_name}' created.")
        emit("room_created", {"room": room_name, "type": room_type}, broadcast=True)


@socketio.on("join_room")
def join_room_handler(data):
    """
    Handles joining a room based on the provided data.
    This function expects a dictionary with at least the keys "room" and "username". It retrieves
    the client's session identifier (sid) from the request object and performs the following actions:
    - Validates that both "room" and "username" are provided, emitting an error if either is missing.
    - Checks if the specified room exists in the active_rooms dictionary.
        - If the room exists, it calls the join_room function.
        - It then checks if the username already exists in the room's user list:
            - If the user exists, it updates the user's sid.
            - Otherwise, it adds the new user with the provided username and sid.
        - Emits events to notify the room about the new user joining, including updating the user count.
        - If there is cached drawing data for the room, it sends the cached drawing to the new user.
    - If the room does not exist, emits an error to the client.
    """
    room_name = data.get("room")
    username = data.get("username")
    sid = request.sid
    if not room_name or not username:
        emit(
            "error", {"message": "Room name and username are required to join a room. "}
        )
        return
    if room_name in active_rooms:
        # Check if the user is already in the room (rejoining)
        existing_user_index = next(
            (
                i
                for i, user in enumerate(active_rooms[room_name]["users"])
                if user["username"] == username
            ),
            None,
        )

        # If user is not already in the room and room is at capacity, reject
        if (
            existing_user_index is None
            and len(active_rooms[room_name]["users"]) >= ROOM_CAPACITY
        ):
            emit(
                "room_full",
                {
                    "code": "ROOM_AT_CAPACITY",
                    "roomId": room_name,
                    "capacity": ROOM_CAPACITY,
                    "current": len(active_rooms[room_name]["users"]),
                },
                to=sid,
            )
            print(f"User '{username}' rejected from full room '{room_name}'")
            return

        join_room(room_name)

        if existing_user_index is not None:
            active_rooms[room_name]["users"][existing_user_index]["sid"] = sid
            print(f"Updated SID for existing user '{username}' in room '{room_name}'")
        else:
            active_rooms[room_name]["users"].append({"sid": sid, "username": username})
            print(f"Added new user '{username}' to room '{room_name}'")

        user_count = len(active_rooms[room_name]["users"])
        print(f"SID {sid} joined room '{room_name}', Users: {user_count}")

        # Broadcast to the room that a user joined, including user count
        emit(
            "joined_room",
            {
                "room": room_name,
                "name": active_rooms[room_name]["name"],
                "useJoined": username,
                "userList": active_rooms[room_name],
                "userCount": user_count,
            },
            room=room_name,
        )

        # Broadcast updated user count
        emit(
            "room_users_update",
            {"roomId": room_name, "userCount": user_count},
            room=room_name,
        )

        # Send the existing canvas/flowchart state to the new joined user
        if room_name in drawing_buffer and drawing_buffer[room_name]:
            # Check for JSON uploads first (backward compatibility)
            json_uploads = [
                item
                for item in drawing_buffer[room_name]
                if isinstance(item, dict) and item.get("type") == "json_upload"
            ]

            if json_uploads:
                latest_json = max(json_uploads, key=lambda x: x.get("timestamp", ""))
                emit(
                    "uploaded_json_content",
                    {
                        "roomId": room_name,
                        "jsonContent": latest_json["jsonContent"],
                        "timestamp": latest_json["timestamp"],
                    },
                    to=sid,
                )
                print(f"Sent cached JSON content to new user in room: {room_name}")
            else:
                # Try to send the most recent canvas state first
                latest_state = drawing_buffer[room_name][-1]
                if isinstance(latest_state, str):  # It's a canvas state (JSON string)
                    emit(
                        "canvas_state_update",
                        {
                            "roomId": room_name,
                            "canvasState": latest_state,
                            "isUndoRedo": False,
                        },
                        to=sid,
                    )
                    print(f"Sent latest canvas state to new user in room: {room_name}")
                else:
                    # Fall back to old cached_drawing for backward compatibility
                    emit("cached_drawing", drawing_buffer[room_name], to=sid)
                    print(f"Sent cached drawings to new user in room: {room_name}")
    else:
        emit("error", {"message": f"Room '{room_name}' does not exist."}, to=sid)


@socketio.on("leave_room")
def leave_room_handler(data):
    room_name = data.get("room")
    username = data.get("username")
    sid = request.sid

    print(f"trigger leave_room {room_name} {username} (sid: {sid})")

    if not room_name:
        emit("error", {"message": "Room name is required to leave a room."}, to=sid)
        return

    if not username:
        # Try to find the username from the sid
        for rm_name, rm_data in active_rooms.items():
            for user in rm_data.get("users", []):
                if user.get("sid") == sid:
                    username = user.get("username")
                    room_name = rm_name
                    print(
                        f"Found username {username} in room {room_name} for sid {sid}"
                    )
                    break
            if username:
                break

        if not username:
            emit("error", {"message": "Username is required to leave a room."}, to=sid)
            return

    if room_name in active_rooms:
        leave_room(room_name)

        # Find user by username instead of SID
        users = active_rooms[room_name]["users"]
        user = next((u for u in users if u["username"] == username), None)

        if user:
            active_rooms[room_name]["users"] = [
                u for u in users if u["username"] != username
            ]
            user_count = len(active_rooms[room_name]["users"])
            print(f"User '{username}' left room '{room_name}', Users: {user_count}")

            # Broadcast to the room that a user left, including user count
            emit(
                "left_room",
                {
                    "room": room_name,
                    "userLeft": username,
                    "userList": active_rooms[room_name],
                    "userCount": user_count,
                },
                room=room_name,
            )

            # Broadcast updated user count
            emit(
                "room_users_update",
                {"roomId": room_name, "userCount": user_count},
                room=room_name,
            )
        else:
            print(f"User '{username}' not found in room '{room_name}'")
    else:
        print(f"Room '{room_name}' does not exist")
        emit("error", {"message": f"Room '{room_name}' does not exist."}, to=sid)


@socketio.on("get_rooms")
def get_rooms():
    # Send the list of rooms to the requesting client
    sid = request.sid
    emit("rooms_list", {"rooms": list(active_rooms.keys())}, to=sid)


@socketio.on("get_room_type")
def get_room_type(data):
    # Send the room type to the requesting client
    sid = request.sid
    room = data.get("roomId")
    room_type = None
    if room in active_rooms:
        room_type = active_rooms[room]["type"]
    emit("room_type", {"type": room_type}, to=sid)


@socketio.on("get_room_name")
def get_room_name(data):
    # Send the room name to the requesting client
    sid = request.sid
    room = data.get("roomId")
    room_name = None
    if room in active_rooms:
        room_name = active_rooms[room]["name"]
    emit("room_name_updated", {"roomId": room, "newName": room_name}, to=sid)


@socketio.on("update_room_name")
def update_room_name(data):
    # Update the room name
    sid = request.sid
    room = data.get("roomId")
    new_name = data.get("newName")
    if room in active_rooms:
        active_rooms[room]["name"] = new_name
        emit("room_name_updated", {"roomId": room, "newName": new_name}, to=room)
        print(f"Room '{room}' name updated to '{new_name}'")
    else:
        emit("error", {"message": f"Room '{room}' does not exist."}, to=sid)


@socketio.on("canvas_state_update")
def handle_canvas_state(data):
    """Handle a complete canvas state update"""
    room = data.get("roomId")
    # This is a string, not a JSON object any more after we migrate to Konva
    canvas_state = data.get("canvasState")
    is_undo_redo = data.get("isUndoRedo", False)

    if not room or not canvas_state:
        emit("error", {"message": "Missing room ID or canvas state"}, to=request.sid)
        return

    # Only store state if this isn't from an undo/redo operation
    if not is_undo_redo:
        if room in drawing_buffer:
            # Check if the new state is actually different from the previous one
            should_add = True
            if (
                drawing_buffer[room]
                and isinstance(canvas_state, str)
                and drawing_buffer[room][-1] == canvas_state
            ):
                # Skip adding identical states to avoid duplicate undo steps
                should_add = False
                print(f"Skipped adding identical canvas state for room: {room}")

            if should_add:
                redo_history[room] = []
                drawing_buffer[room].append(canvas_state)
                if len(drawing_buffer[room]) > MAX_REDO_HISTORY:
                    drawing_buffer[room].pop(0)
                print(
                    f"Added canvas state to history for room: {room}, states: {len(drawing_buffer[room])}"
                )

    # Broadcast to all clients except sender
    emit(
        "canvas_state_update",
        {"roomId": room, "canvasState": canvas_state, "isUndoRedo": is_undo_redo},
        to=room,
        skip_sid=request.sid,
    )

    print(f"Broadcast canvas state to room: {room}, undo/redo: {is_undo_redo}")


@socketio.on("get_room_info")
def get_room_info(data):
    """Get information about a specific room, including user count"""
    room_name = data.get("room")
    sid = request.sid

    if not room_name:
        emit("error", {"message": "Room name is required"}, to=sid)
        return

    if room_name in active_rooms:
        user_count = len(active_rooms[room_name]["users"])
        is_full = user_count >= ROOM_CAPACITY

        emit(
            "room_info",
            {
                "roomId": room_name,
                "userCount": user_count,
                "capacity": ROOM_CAPACITY,
                "isFull": is_full,
            },
            to=sid,
        )
    else:
        emit("error", {"message": f"Room '{room_name}' does not exist."}, to=sid)


@socketio.on("client_drawing")
def handle_drawing(data):
    """
    Handle drawing data from client, including new shape types.
    This function processes all drawing types: lines, arrows, rectangles, text.
    """
    room = data["roomId"]

    # Add unique ID to all data types if missing
    if "lineData" in data and "id" not in data["lineData"]:
        data["lineData"]["id"] = str(uuid.uuid4())
    elif "arrowData" in data and "id" not in data["arrowData"]:
        data["arrowData"]["id"] = str(uuid.uuid4())
    elif "rectData" in data and "id" not in data["rectData"]:
        data["rectData"]["id"] = str(uuid.uuid4())
    elif "textData" in data and "id" not in data["textData"]:
        data["textData"]["id"] = str(uuid.uuid4())

    # Add timestamp for ordering
    data["timestamp"] = time.time()

    # Forward to other clients for immediate feedback
    emit("server_drawing", data, to=room, skip_sid=request.sid)

    print(f"Processed drawing in room {room}, type: {list(data.keys())}")


@socketio.on("client_canvasClear")
def handle_canvas_clear(data):
    room = data["roomId"]
    if room in drawing_buffer:
        # Save current state for undo before clearing
        if drawing_buffer[room]:
            # Clear and add empty state
            new_state = {"empty": True, "timestamp": time.time()}

            # Clear redo history
            redo_history[room] = []

            # Clear the drawing buffer for this room
            drawing_buffer[room] = []

            # Add empty state marker
            drawing_buffer[room].append(new_state)

        # Broadcast clear event to all clients in the room
        emit("server_canvasClear", {"roomId": room}, to=room)
        print(f"Cleared canvas for room: {room}")


@socketio.on("client_undo")
def handle_undo(data):
    """Handle undo request with special handling for JSON uploads"""
    room = data["roomId"]

    if room not in drawing_buffer:
        emit("error", {"message": "Room not found"}, to=request.sid)
        return

    # Check if we have states to undo
    if not drawing_buffer[room]:
        emit("error", {"message": "Nothing to undo"}, to=request.sid)
        return

    # Move current state to redo history
    current_state = drawing_buffer[room].pop()
    redo_history[room].append(current_state)

    # Get previous state
    if len(drawing_buffer[room]) > 0:
        previous_state = drawing_buffer[room][-1]
    else:
        previous_state = ""

    # Check if previous state is a JSON upload
    if isinstance(previous_state, dict) and previous_state.get("type") == "json_upload":
        # Send as uploaded_json_content for JSON uploads
        timestamp = str(uuid.uuid4())
        data_to_broadcast = {
            "roomId": room,
            "jsonContent": previous_state["content"],
            "timestamp": timestamp,
        }
        emit("uploaded_json_content", data_to_broadcast, to=room)
        print(f"Undo to JSON upload in room: {room}")
    else:
        # Normal canvas state
        emit(
            "canvas_state_update",
            {"roomId": room, "canvasState": previous_state, "isUndoRedo": True},
            to=room,
        )

        print(
            f"Undo performed in room: {room}, remaining states: {len(drawing_buffer[room])}"
        )


@socketio.on("client_redo")
def handle_redo(data):
    """Handle redo request with special handling for JSON uploads"""
    room = data["roomId"]

    if room not in redo_history or not redo_history[room]:
        emit("error", {"message": "Nothing to redo"}, to=request.sid)
        return

    # Get the next state to redo
    next_state = redo_history[room].pop()

    # Add to canvas states
    drawing_buffer[room].append(next_state)

    # Check if this is a JSON upload state
    if isinstance(next_state, dict) and next_state.get("type") == "json_upload":
        # Send as uploaded_json_content for JSON uploads
        timestamp = str(uuid.uuid4())
        data_to_broadcast = {
            "roomId": room,
            "jsonContent": next_state["content"],
            "timestamp": timestamp,
        }
        emit("uploaded_json_content", data_to_broadcast, to=room)
        print(f"Redo JSON upload in room: {room}")
    else:
        # Normal canvas state
        emit(
            "canvas_state_update",
            {"roomId": room, "canvasState": next_state, "isUndoRedo": True},
            to=room,
        )

    print(
        f"Redo performed in room: {room}, remaining redo states: {len(redo_history[room])}"
    )


@socketio.on("upload_json_content")
def handle_uploaded_json(data):
    """Handle JSON content uploaded by a client"""
    room = data.get("roomId")
    json_content = data.get("jsonContent")

    if not room or not json_content:
        emit("error", {"message": "Missing room ID or JSON content"}, to=request.sid)
        return

    # Store the JSON as a canvas state for undo/redo history
    if room in drawing_buffer:
        # Convert to string
        if not isinstance(json_content, str):
            try:
                json_string = json.dumps(json_content)
            except:
                json_string = str(json_content)
        else:
            json_string = json_content

        # This is a string now, no json anymore
        drawing_buffer[room].append(json_string)

        # Clear redo history
        redo_history[room] = []

        # Limit history size
        if len(drawing_buffer[room]) > MAX_REDO_HISTORY:
            drawing_buffer[room].pop(0)

    # Forward to all clients
    timestamp = str(uuid.uuid4())
    data_to_broadcast = {
        "roomId": room,
        "jsonContent": json_content,
        "timestamp": timestamp,
    }
    emit("uploaded_json_content", data_to_broadcast, to=room)

    print(f"Broadcast uploaded JSON content to all users in room: {room}")
