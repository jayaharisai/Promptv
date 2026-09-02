def setup_folder(client):
    workspace = client.post("/api/v1/workspaces/", json={
        "name": "Prompt team",
        "description": "A sufficiently detailed workspace for prompt API testing.",
    }).json()
    return client.post(f"/api/v1/workspaces/{workspace['id']}/folders", json={
        "name": "Support",
        "description": "Customer support prompts and response workflows live here.",
    }).json()


def prompt_payload(**overrides):
    payload = {"name": "reply", "description": "A customer reply prompt", "content": "Reply to {{issue}}", "status": "draft"}
    payload.update(overrides)
    return payload


def test_prompt_lifecycle_with_versions_and_status(client):
    folder = setup_folder(client)
    created = client.post(f"/api/v1/folders/{folder['id']}/prompts", json=prompt_payload())
    assert created.status_code == 201
    prompt = created.json()

    versions = client.get(f"/api/v1/prompts/{prompt['id']}/versions")
    assert [version["number"] for version in versions.json()] == [1]

    second_version = client.post(f"/api/v1/prompts/{prompt['id']}/versions", json={"content": "Updated reply to {{issue}}"})
    assert second_version.status_code == 201

    activated = client.patch(f"/api/v1/prompts/{prompt['id']}/active-version", json={"version_id": second_version.json()["id"]})
    assert activated.json()["active_version_id"] == second_version.json()["id"]

    published = client.patch(f"/api/v1/prompts/{prompt['id']}", json={"status": "published"})
    assert published.json()["status"] == "published"

    assert client.delete(f"/api/v1/prompts/{prompt['id']}").status_code == 204
    assert client.get(f"/api/v1/folders/{folder['id']}/prompts").json() == []


def test_prompt_validation(client):
    folder = setup_folder(client)
    response = client.post(f"/api/v1/folders/{folder['id']}/prompts", json=prompt_payload(content=""))
    assert response.status_code == 422
