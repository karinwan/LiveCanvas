def test_site_index(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.get_json() == {"message": "Site route works."}
