#!/usr/bin/env python3
# kbFix-zcscope: clone the private ZeroClaw doc's fully-processed chunks under the
# EXACT shared target file_path, so @<target> scoped queries find content.
#
# The scoped @ path (_run_scoped_query_op -> _filtered_hits) queries chunks_vdb
# directly and filters by file_path. The target path never owned chunks => empty
# scope. The private doc has the same content with 13 processed chunks + vectors.
# We duplicate those chunks with a new doc_id and file_path = exact target,
# reusing the SAME vectors (no LLM/embedding call -> fast, no occamy dependency).
#
# Run with the sidecar venv python, sidecar STOPPED.
import os, json, time, re
import numpy as np
from nano_vectordb import NanoVectorDB

ST = "/home/lgsj/.dsh/raganything/storage"
PRIV = "doc-bcdfc02d353d9d4b8e49125d2cbfe8a7"
TARGET = "共享/01-算力一部/算力服务部研发资料/6.知识库与技术沉淀/技术分享/ZeroClaw记忆系统与上下文管理技术分享-修订版.docx"
NEW_DOC = "doc-zcshare-001"
NOW = time.time()
ISO = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime(NOW))

def lp(n): return os.path.join(ST, n)
def load(n):
    with open(lp(n), "r", encoding="utf-8") as f: return json.load(f)
def save(n, o):
    tmp = lp(n) + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(o, f, ensure_ascii=False)
    os.replace(tmp, lp(n))

report = {}

ds = load("kv_store_doc_status.json")
existing = [k for k, v in ds.items() if v.get("file_path") == TARGET]
if existing:
    print("[SKIP] target already owns doc(s):", existing); report["skip"] = existing
else:
    priv = ds[PRIV]
    chunk_ids = list(priv["chunks_list"])
    fd = load("kv_store_full_docs.json")
    tc = load("kv_store_text_chunks.json")

    vdb = NanoVectorDB(embedding_dim=1024, storage_file=lp("vdb_chunks.json"))
    store = vdb._NanoVectorDB__storage
    mat = store["matrix"]
    idx_of = {d["__id__"]: i for i, d in enumerate(store["data"])}
    missing = [c for c in chunk_ids if c not in idx_of]
    if missing: print("[WARN] chunks missing from vdb:", missing)

    # build new docs / chunks (reuse identical vectors)
    fd[NEW_DOC] = {
        "content": fd[PRIV]["content"], "file_path": TARGET,
        "create_time": NOW, "update_time": NOW, "_id": NEW_DOC,
    }
    new_map = []
    for i, cid in enumerate(chunk_ids):
        if cid not in idx_of: continue
        src = tc[cid]
        ncid = cid.replace("chunk-", "zcc-", 1)
        vec = mat[idx_of[cid]].astype(np.float32).copy()
        d = {k: v for k, v in src.items() if k != "_id"}
        d.update(full_doc_id=NEW_DOC, file_path=TARGET,
                 create_time=NOW, update_time=NOW, _id=ncid, chunk_order_index=i)
        tc[ncid] = d
        new_map.append((ncid, d, vec))
    save("kv_store_full_docs.json", fd)
    save("kv_store_text_chunks.json", tc)

    new_ds = dict(priv)
    new_ds.update(
        chunks_list=[n for n, _, _ in new_map], chunks_count=len(new_map),
        file_path=TARGET, created_at=ISO, updated_at=ISO,
        track_id="kbFix-zcscope-" + str(int(NOW)),
    )
    ds[NEW_DOC] = new_ds
    save("kv_store_doc_status.json", ds)

    ups = [{"__id__": n, "__vector__": v, "content": d["content"],
            "full_doc_id": NEW_DOC, "file_path": TARGET, "__created_at__": NOW}
           for n, d, v in new_map]
    res = vdb.upsert(ups)
    vdb.save()
    report.update(new_doc=NEW_DOC, new_chunk_count=len(new_map),
                  vdb_insert=len(res.get("insert", [])),
                  vdb_update=len(res.get("update", [])))

print(json.dumps(report, ensure_ascii=False, indent=2))
