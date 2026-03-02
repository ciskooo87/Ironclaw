import json
import os
import urllib.request
from typing import Any, Dict, List


def _call_deepseek(messages: List[Dict[str, str]], model: str = "deepseek-chat", temperature: float = 0.2) -> Dict[str, Any]:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY not set")

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }
    req = urllib.request.Request(
        "https://api.deepseek.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    content = body["choices"][0]["message"]["content"]
    return json.loads(content)


def enrich_risks_with_llm(risks: List[Dict[str, Any]], max_items: int = 10, model: str = "deepseek-chat") -> List[Dict[str, Any]]:
    out = []
    for r in risks[:max_items]:
        system = "Você é um analista de turnaround. Responda apenas JSON válido."
        user = {
            "risk": {
                "kpi": r.get("kpi"),
                "unidade": r.get("unidade"),
                "score": r.get("score"),
                "valor_atual": r.get("valor_atual"),
                "meta": r.get("meta"),
                "description": r.get("description"),
                "rules": r.get("triggered_rules", []),
            },
            "task": "Gere ação executiva com campos: cause_hypothesis, action_what, action_why, action_who, action_when, confidence (0-100).",
        }
        try:
            rec = _call_deepseek(
                [{"role": "system", "content": system}, {"role": "user", "content": json.dumps(user, ensure_ascii=False)}],
                model=model,
            )
            r2 = dict(r)
            r2["llm_action"] = rec
            # quality gate mínimo
            conf = float(rec.get("confidence", 0) or 0)
            if conf < 70:
                r2["llm_action_status"] = "low_confidence_fallback"
            else:
                r2["llm_action_status"] = "accepted"
            out.append(r2)
        except Exception as e:
            r2 = dict(r)
            r2["llm_action_status"] = f"error:{e.__class__.__name__}"
            out.append(r2)
    out.extend(risks[max_items:])
    return out
