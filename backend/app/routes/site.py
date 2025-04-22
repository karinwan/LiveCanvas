from flask import Blueprint, jsonify

site_bp = Blueprint("site", __name__)


@site_bp.route("/", methods=["GET"])
def site_index():
    return jsonify({"message": "Site route works."})
