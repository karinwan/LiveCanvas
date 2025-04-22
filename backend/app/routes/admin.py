from flask import Blueprint, jsonify

bp = Blueprint("admin", __name__)


@bp.route("/allusers", methods=["GET"])
def fetch_all_users():
    return jsonify({"users": ["User1", "User2"]})
