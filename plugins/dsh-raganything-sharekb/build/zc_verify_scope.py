import json, urllib.request, urllib.error, time

BASE = "http://127.0.0.1:17321"
TARGET = "共享/01-算力一部/算力服务部研发资料/6.知识库与技术沉淀/技术分享/ZeroClaw记忆系统与上下文管理技术分享-修订版.docx"

def get(p):
    try:
        with urllib.request.urlopen(BASE+p, timeout=40) as r: return json.loads(r.read().decode())
    except urllib.error.HTTPError as e: return {"_http": e.code, "_body": e.read().decode("utf-8","replace")[:400]}
    except Exception as e: return {"_err": str(e)}

def post(p, body, timeout=180):
    data = json.dumps(body).encode()
    req = urllib.request.Request(BASE+p, data=data, headers={"Content-Type":"application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r: return json.loads(r.read().decode())
    except urllib.error.HTTPError as e: return {"_http": e.code, "_body": e.read().decode("utf-8","replace")[:400]}
    except Exception as e: return {"_err": str(e)}

print("===== A. /documents: ZeroClaw entries =====")
docs = get("/documents")
dl = docs.get("documents", docs) if isinstance(docs, dict) else docs
for d in dl:
    t = json.dumps(d, ensure_ascii=False)
    if "ZeroClaw" in t or "zcshare" in t:
        print(f"  id={d.get('id')} status={d.get('status')} chunks={d.get('chunks_count') or d.get('chunk_count')} title={(d.get('title') or '')[:70]!r}")

print("\n===== B. /index/files: target path status =====")
fjs = get("/index/files")
for f in fjs.get("files", []):
    if f.get("display") == TARGET:
        print(f"  EXACT TARGET -> status={f.get('status')} name={f.get('name')!r}")

print("\n===== C. SCOPED @ QUERY against exact target =====")
q = "ZeroClaw 是什么？它的记忆系统是怎么做上下文管理的？"
r = post("/tasks", {"op":"query","params":{"query": q, "scope":{"files":[TARGET],"folders":[]}, "mode":"hybrid"}}, timeout=240)
tid = r.get("task_id")
print("  submit:", json.dumps(r, ensure_ascii=False)[:200])
if tid:
    for _ in range(60):
        time.sleep(3)
        t = get(f"/tasks/{tid}")
        st = t.get("status")
        res = t.get("result") or {}
        if st in ("done","error","cancelled"):
            print("  status:", st, "| hits:", res.get("hits"), "| mode:", res.get("mode"))
            print("  answer[:600]:", (res.get("answer") or "")[:600].replace("\n"," "))
            err = t.get("error")
            if err: print("  error:", err)
            break
        else:
            print("  ...", st, t.get("progress"))
