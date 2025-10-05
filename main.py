from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
from data.products_loader import load_products
from services.gold_price import fetch_gold_price_usd_per_gram
from services.pricing import calc_usd_price, popularity_to_stars
import asyncio
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Kılınç API")

# Serve fonts as static
app.mount("/avenir", StaticFiles(directory="avenir"), name="avenir")
app.mount("/montserrat", StaticFiles(directory="montserrat"), name="montserrat")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        # Frontend Render domain (production)
        "https://kilinc-api-frontend.onrender.com",
    ],
    # Allow any Render subdomain as origin
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/products")
async def get_products(
    minPrice: Optional[float] = Query(None),
    maxPrice: Optional[float] = Query(None),
    minPopularity: Optional[float] = Query(None),
    maxPopularity: Optional[float] = Query(None),
    sort: Optional[str] = Query(None, pattern="^(price|popularity|weight|name)$"),
    order: Optional[str] = Query("asc", pattern="^(asc|desc)$"),
    color: Optional[str] = Query(None, pattern="^(yellow|white|rose)$"),
):
    products = load_products()
    gold_price = await fetch_gold_price_usd_per_gram()

    enriched: List[Dict[str, Any]] = []
    for p in products:
        price = calc_usd_price(p, gold_price)
        stars = popularity_to_stars(float(p.get("popularityScore", 0)))
        image_url = None
        if isinstance(p.get("images"), dict):
            if color and color in p["images"]:
                image_url = p["images"][color]
            else:
                image_url = p["images"].get("yellow") or next(iter(p["images"].values()), None)

        enriched.append({
            "name": p.get("name"),
            "weight": p.get("weight"),
            "popularityScore": p.get("popularityScore"),
            "rating": stars,
            "priceUSD": price,
            "image": image_url,
            "images": p.get("images"),
        })

    # Filtering
    def within(x: Dict[str, Any]) -> bool:
        if minPrice is not None and x["priceUSD"] < minPrice:
            return False
        if maxPrice is not None and x["priceUSD"] > maxPrice:
            return False
        if minPopularity is not None and float(x["popularityScore"]) < minPopularity:
            return False
        if maxPopularity is not None and float(x["popularityScore"]) > maxPopularity:
            return False
        return True

    filtered = [x for x in enriched if within(x)]

    # Sorting
    if sort:
        reverse = order == "desc"
        key_map = {
            "price": lambda x: x["priceUSD"],
            "popularity": lambda x: float(x["popularityScore"]),
            "weight": lambda x: float(x["weight"]),
            "name": lambda x: str(x["name"]).lower(),
        }
        filtered.sort(key=key_map[sort], reverse=reverse)

    return {"goldPriceUSDPerGram": gold_price, "count": len(filtered), "items": filtered}

# Run: uvicorn main:app --reload --port 8000