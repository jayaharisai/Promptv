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

    audit_logs = client.get(f"/api/v1/workspaces/{key['workspace_id']}/audit-logs")
    assert audit_logs.status_code == 200
    assert audit_logs.json()["total"] == 2
    assert [(log["access_key_name"], log["action"], log["resource_name"], log["status_code"]) for log in audit_logs.json()["items"]] == [
        ("Production SDK key", "get_active_prompt", "Support/reply", 200),
        ("Production SDK key", "list_folders", None, 200),
    ]
    prompt_log = audit_logs.json()["items"][0]
    assert prompt_log["integration"] == "Direct API"
    assert prompt_log["system_prompt_tokens"] > 0
    usage = client.get(f"/api/v1/folders/{folder['id']}/token-usage").json()
    assert usage["total_requests"] == 1
    assert usage["total_system_prompt_tokens"] == prompt_log["system_prompt_tokens"]


def test_sdk_rejects_unknown_keys_and_unpublished_prompts(client):
    key, _, prompt = setup_published_prompt(client)
    assert client.get("/api/v1/sdk/folders").status_code == 401
    assert client.get("/api/v1/sdk/folders", headers={"X-API-Key": "pk_live_unknown"}).status_code == 401
    assert client.patch(f"/api/v1/prompts/{prompt['id']}", json={"status": "draft"}).status_code == 200
    assert client.get("/api/v1/sdk/prompts/Support/reply", headers={"X-API-Key": key["token"]}).status_code == 404
    assert client.get("/api/v1/sdk/prompts/Support/missing", headers={"X-API-Key": key["token"]}).status_code == 404

    logs = client.get(f"/api/v1/workspaces/{key['workspace_id']}/audit-logs").json()
    assert [(log["resource_name"], log["status_code"]) for log in logs["items"]] == [
        ("Support/missing", 404),
        ("Support/reply", 404),
    ]


def test_audit_log_stream_pushes_new_persisted_events(client):
    key, _, _ = setup_published_prompt(client)

    with client.websocket_connect(f"/api/v1/ws/workspaces/{key['workspace_id']}/audit-logs") as websocket:
        response = client.get("/api/v1/sdk/folders", headers={"X-API-Key": key["token"]})
        assert response.status_code == 200
        event = websocket.receive_json()

    assert event["access_key_id"] == key["id"]
    assert event["access_key_name"] == "Production SDK key"
    assert event["action"] == "list_folders"
    assert event["status_code"] == 200
    persisted = client.get(f"/api/v1/workspaces/{key['workspace_id']}/audit-logs").json()
    assert persisted["items"][0]["id"] == event["id"]


def test_audit_logs_are_paginated(client):
    key, _, _ = setup_published_prompt(client)
    headers = {"X-API-Key": key["token"]}
    for _ in range(3):
        assert client.get("/api/v1/sdk/folders", headers=headers).status_code == 200

    first_page = client.get(f"/api/v1/workspaces/{key['workspace_id']}/audit-logs?limit=2&offset=0").json()
    second_page = client.get(f"/api/v1/workspaces/{key['workspace_id']}/audit-logs?limit=2&offset=2").json()
    assert (first_page["total"], len(first_page["items"]), first_page["has_more"]) == (3, 2, True)
    assert (len(second_page["items"]), second_page["has_more"]) == (1, False)
