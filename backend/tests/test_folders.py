def workspace_payload():
    return {
        "name": "Product team",
        "description": "A sufficiently detailed workspace for folder API testing.",
    }


def folder_payload(**overrides):
    payload = {
        "name": "Support",
        "description": "Customer support prompts and response workflows live here.",
    }
    payload.update(overrides)
    return payload


def test_folder_crud_is_scoped_to_workspace(client):
    workspace = client.post("/api/v1/workspaces/", json=workspace_payload()).json()
    created = client.post(f"/api/v1/workspaces/{workspace['id']}/folders", json=folder_payload())

    assert created.status_code == 201
    folder = created.json()
    assert folder["workspace_id"] == workspace["id"]

    listed = client.get(f"/api/v1/workspaces/{workspace['id']}/folders")
    assert [item["id"] for item in listed.json()] == [folder["id"]]

    updated = client.patch(f"/api/v1/folders/{folder['id']}", json=folder_payload(name="Customer care"))
    assert updated.status_code == 200
    assert updated.json()["name"] == "Customer care"

    assert client.delete(f"/api/v1/folders/{folder['id']}").status_code == 204
    assert client.get(f"/api/v1/workspaces/{workspace['id']}/folders").json() == []


def test_folder_requires_a_valid_workspace_and_payload(client):
    missing_workspace = client.post("/api/v1/workspaces/missing/folders", json=folder_payload())
    invalid_folder = client.post("/api/v1/workspaces/missing/folders", json=folder_payload(name="x"))

    assert missing_workspace.status_code == 404
    assert invalid_folder.status_code == 422
