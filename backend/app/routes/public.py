from flask import Blueprint, jsonify

bp = Blueprint("public", __name__)


@bp.route("/", methods=["GET"])
def public_index():
    return jsonify({"status": "Public API is working."})
