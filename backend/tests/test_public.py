def test_public_index(client):
    response = client.get("/api/public/")
    assert response.status_code == 200
    assert "Public API is working." in response.get_json()["status"]
