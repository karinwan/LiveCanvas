def test_fetch_all_users(client):
    response = client.get("/api/admin/allusers")
    assert response.status_code == 200
    data = response.get_json()
    assert "users" in data
    assert len(data["users"]) > 0
