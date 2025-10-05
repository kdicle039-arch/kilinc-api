from typing import Dict, Any


def calc_usd_price(product: Dict[str, Any], gold_price_usd_per_gram: float) -> float:
    popularity = float(product.get("popularityScore", 0))
    weight = float(product.get("weight", 0))
    price = (popularity + 1.0) * weight * gold_price_usd_per_gram
    return round(price, 2)


def popularity_to_stars(popularity: float) -> float:
    # popularity in [0,1]; map to [0,5]
    return round(max(0.0, min(1.0, float(popularity))) * 5.0, 1)