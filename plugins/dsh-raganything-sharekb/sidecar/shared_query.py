"""Trusted instance-to-instance shared query authentication and path filtering.

No public-folder wildcard exists in the installed shared/tree/file contract:
created_by or explicit members grant access; administrators can inspect all.
"""
import hashlib
import hmac
import json
import time
import uuid


def canonical_body(body):
    return json.dumps(body, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def signed_headers(secret, account, body, now=None):
    if not secret or not account:
        raise RuntimeError("Trusted shared query identity unavailable")
    stamp = str(int(time.time() if now is None else now))
    nonce = uuid.uuid4().hex
    digest = hashlib.sha256(canonical_body(body)).hexdigest()
    message = "\n".join((account, stamp, nonce, digest)).encode()
    signature = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    return {"Authorization": "Bearer " + secret, "x-rag-account": account,
            "x-rag-stamp": stamp, "x-rag-nonce": nonce, "x-rag-signature": signature}


def verify_headers(secret, headers, body, seen, now=None):
    now = time.time() if now is None else now
    account = headers.get("x-rag-account", "")
    stamp = headers.get("x-rag-stamp", "")
    nonce = headers.get("x-rag-nonce", "")
    signature = headers.get("x-rag-signature", "")
    if not secret or not account or len(account) > 100 or len(nonce) != 32:
        raise ValueError("Invalid shared query identity")
    try:
        timestamp = int(stamp)
    except (ValueError, TypeError):
        raise ValueError("Invalid shared query identity") from None
    if abs(now - timestamp) > 60:
        raise ValueError("Expired shared query identity")
    message = "\n".join((account, stamp, nonce, hashlib.sha256(canonical_body(body)).hexdigest())).encode()
    expected = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise ValueError("Invalid shared query signature")
    for key, until in list(seen.items()):
        if until < now:
            seen.pop(key, None)
    if nonce in seen:
        raise ValueError("Replayed shared query identity")
    seen[nonce] = now + 120
    return account


def owner_of(path, manifest):
    path = str(path).replace("\\", "/")
    candidates = [folder for folder in manifest.get("folders", [])
                  if folder.get("name") and path.startswith("共享/" + folder["name"] + "/")]
    return max(candidates, key=lambda folder: len(folder["name"])) if candidates else None


def authorized_hits(hits, manifest, account, admin=False):
    trashed_ids = {str(doc_id) for item in manifest.get("trash", []) for doc_id in item.get("doc_ids", [])}
    trashed_paths = ["共享/" + str(item.get("name") or "").strip("/") + "/"
                     for item in manifest.get("trash", []) if item.get("kind") == "folder"]
    result = []
    for hit in hits:
        path = str(hit.get("file_path") or "").replace("\\", "/")
        if not path.startswith("共享/"):
            continue
        if str(hit.get("full_doc_id") or hit.get("doc_id") or "") in trashed_ids:
            continue
        if any(path.startswith(prefix) for prefix in trashed_paths):
            continue
        folder = owner_of(path, manifest)
        if folder is None:
            continue
        if admin or account == folder.get("created_by") or account in folder.get("members", []):
            result.append(hit)
    return result
