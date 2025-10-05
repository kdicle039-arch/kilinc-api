from pathlib import Path
import json
from typing import List, Dict, Any

_BASE_DIR = Path(__file__).resolve().parent
_PRODUCTS_PATH = _BASE_DIR.parent / "products.json"

def load_products() -> List[Dict[str, Any]]:
    with _PRODUCTS_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    assert isinstance(data, list), "products.json must contain a list"
    return data