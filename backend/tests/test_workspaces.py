def workspace_payload(**overrides):
    payload = {
        "name": "Workspace one",
        "description": "A description with enough detail for a valid workspace record.",
    }
    payload.update(overrides)
    return payload


def test_workspace_crud(client):
    initial = client.get("/api/v1/workspaces/")
    assert initial.status_code == 200
    assert initial.json()[0]["name"] == "Default"

    created = client.post("/api/v1/workspaces/", json=workspace_payload())

    assert created.status_code == 201
    workspace = created.json()
    assert workspace["name"] == "Workspace one"

    listed = client.get("/api/v1/workspaces/")
    assert listed.status_code == 200
    assert workspace["id"] in [item["id"] for item in listed.json()]

    updated = client.patch(
        f"/api/v1/workspaces/{workspace['id']}",
        json=workspace_payload(name="Workspace two"),
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Workspace two"

    deleted = client.delete(f"/api/v1/workspaces/{workspace['id']}")
    assert deleted.status_code == 204
    assert [item["name"] for item in client.get("/api/v1/workspaces/").json()] == ["Default"]


def test_workspace_validation_and_missing_record(client):
    invalid = client.post("/api/v1/workspaces/", json=workspace_payload(name="bad"))
    missing = client.get("/api/v1/workspaces/missing")

    assert invalid.status_code == 422
    assert missing.status_code == 404


def test_default_workspace_cannot_be_deleted(client):
    default_workspace = client.get("/api/v1/workspaces/").json()[0]

    response = client.delete(f"/api/v1/workspaces/{default_workspace['id']}")

    assert response.status_code == 409
