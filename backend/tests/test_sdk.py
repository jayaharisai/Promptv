def setup_published_prompt(client):
    workspace = client.post("/api/v1/workspaces/", json={
        "name": "SDK team",
        "description": "A sufficiently detailed workspace for SDK integration testing.",
    }).json()
    key = client.post(f"/api/v1/workspaces/{workspace['id']}/access-keys", json={
        "name": "Production SDK key",
        "description": "Used by the SDK integration test application.",
    }).json()
    folder = client.post(f"/api/v1/workspaces/{workspace['id']}/folders", json={
        "name": "Support",
        "description": "Customer support prompts and response workflows live here.",
    }).json()
    prompt = client.post(f"/api/v1/folders/{folder['id']}/prompts", json={
        "name": "reply",
        "description": "A customer reply prompt",
        "content": "Reply to {{issue}}",
        "status": "published",
    }).json()
    return key, folder, prompt


def test_sdk_endpoints_return_workspace_folders_and_active_prompt(client):
    key, folder, prompt = setup_published_prompt(client)
    headers = {"Authorization": f"Bearer {key['token']}"}

    folders = client.get("/api/v1/sdk/folders", headers=headers)
    assert folders.status_code == 200
    assert folders.json() == [{"id": folder["id"], "name": "Support", "description": folder["description"]}]

    response = client.get("/api/v1/sdk/prompts/Support/reply", headers=headers)
    assert response.status_code == 200
    assert response.json()["id"] == prompt["id"]
    assert response.json()["content"] == "Reply to {{issue}}"
    assert response.json()["version"] == 1

    key_detail = client.get(f"/api/v1/access-keys/{key['id']}").json()
    assert key_detail["request_count"] == 2
    assert key_detail["last_used_at"] is not None


def test_sdk_rejects_unknown_keys_and_unpublished_prompts(client):
    key, _, prompt = setup_published_prompt(client)
    assert client.get("/api/v1/sdk/folders").status_code == 401
    assert client.get("/api/v1/sdk/folders", headers={"X-API-Key": "pk_live_unknown"}).status_code == 401
    assert client.patch(f"/api/v1/prompts/{prompt['id']}", json={"status": "draft"}).status_code == 200
    assert client.get("/api/v1/sdk/prompts/Support/reply", headers={"X-API-Key": key["token"]}).status_code == 404
    assert client.get("/api/v1/sdk/prompts/Support/missing", headers={"X-API-Key": key["token"]}).status_code == 404
