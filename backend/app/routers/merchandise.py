import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.dependencies import get_supabase_client
from app.models.merchandise import MerchandiseOrderCreate

router = APIRouter(prefix="/merchandise", tags=["9. Merchandise & Swag Store"])

# Predefined swag catalog products for organizers
MERCH_CATALOG = [
    {
        "id": "prod-tshirt-premium",
        "name": "Premium Cotton T-Shirt",
        "category": "Apparel",
        "unitPrice": 12.00,
        "minOrderQuantity": 50,
        "availableColors": ["Black", "Navy Blue", "White", "Heather Gray"],
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "leadTimeDays": 7,
        "imageUrl": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80",
    },
    {
        "id": "prod-hoodie-heavyweight",
        "name": "Heavyweight Zip Hoodie",
        "category": "Apparel",
        "unitPrice": 28.00,
        "minOrderQuantity": 25,
        "availableColors": ["Black", "Charcoal", "Deep Navy"],
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "leadTimeDays": 10,
        "imageUrl": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80",
    },
    {
        "id": "prod-lanyards-eco",
        "name": "Eco-Friendly Recycled Lanyards",
        "category": "Badges & Credentials",
        "unitPrice": 1.50,
        "minOrderQuantity": 100,
        "availableColors": ["Black", "Teal", "Electric Violet"],
        "leadTimeDays": 5,
        "imageUrl": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80",
    },
    {
        "id": "prod-badges-pvc",
        "name": "NFC Smart Event Badge",
        "category": "Badges & Credentials",
        "unitPrice": 2.20,
        "minOrderQuantity": 100,
        "features": ["NFC Contact Sharing", "High-Gloss Waterproof Finish"],
        "leadTimeDays": 5,
        "imageUrl": "https://images.unsplash.com/photo-1589330694653-dad6bc0140ad?w=500&auto=format&fit=crop&q=80",
    },
    {
        "id": "prod-stickers-vinyl",
        "name": "Die-Cut Holographic Stickers (Pack of 100)",
        "category": "Accessories",
        "unitPrice": 35.00,
        "minOrderQuantity": 5,
        "leadTimeDays": 4,
        "imageUrl": "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=500&auto=format&fit=crop&q=80",
    },
    {
        "id": "prod-tote-canvas",
        "name": "Heavy Duty Canvas Swag Tote",
        "category": "Accessories",
        "unitPrice": 4.50,
        "minOrderQuantity": 50,
        "availableColors": ["Natural Canvas", "Jet Black"],
        "leadTimeDays": 6,
        "imageUrl": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=80",
    },
]


@router.get("/catalog")
async def get_merchandise_catalog():
    """
    9.1 GET /merchandise/catalog
    Fetch customizable event swag products (t-shirts, hoodies, badges, lanyards, stickers).
    """
    return {
        "catalog": MERCH_CATALOG,
        "totalProducts": len(MERCH_CATALOG),
    }


@router.get("/orders")
async def get_merchandise_orders(
    eventId: Optional[str] = Query(None),
    client=Depends(get_supabase_client),
):
    """
    List merchandise orders, optionally filtered by event ID.
    """
    try:
        query = client.from_("merchandise_orders").select("*")
        if eventId:
            query = query.eq("event_id", eventId)

        res = query.order("date", desc=True).execute()
        return res.data or []
    except Exception as e:
        print(f"Notice: Failed to fetch merchandise orders: {e}")
        return []


@router.post("/orders", status_code=status.HTTP_201_CREATED)
async def create_merchandise_order(
    payload: MerchandiseOrderCreate,
    client=Depends(get_supabase_client),
):
    """
    9.2 POST /merchandise/orders
    Place a bulk swag order for an event.
    """
    try:
        total_amount = sum(item.quantity * item.unitPrice for item in payload.items)

        evt_title = payload.eventTitle
        if not evt_title and payload.eventId:
            evt_res = client.from_("events").select("title").eq("id", payload.eventId).execute()
            if evt_res.data:
                evt_title = evt_res.data[0].get("title")

        order_id = f"MERCH-{uuid.uuid4().hex[:6].upper()}"
        items_json = [item.model_dump() for item in payload.items]

        insert_data = {
            "order_id": order_id,
            "event_id": payload.eventId,
            "event_title": evt_title or "Assemble Event",
            "items": items_json,
            "total_amount": total_amount,
            "status": "submitted",
        }

        res = client.from_("merchandise_orders").insert(insert_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to place merchandise order")

        order = res.data[0]
        order["shippingAddress"] = payload.shippingAddress

        return {
            "message": "Swag order placed successfully into production queue",
            "order": order,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating merchandise order: {str(e)}",
        )


@router.get("/orders/{order_id}")
async def get_merchandise_order(
    order_id: str,
    client=Depends(get_supabase_client),
):
    """
    9.3 GET /merchandise/orders/{order_id}
    Track swag production and shipping status (submitted, in-production, shipped, delivered).
    """
    try:
        query = client.from_("merchandise_orders").select("*")
        if "-" in order_id and not order_id.startswith("MERCH-"):
            query = query.eq("id", order_id)
        else:
            query = query.eq("order_id", order_id)

        res = query.execute()
        if not res.data:
            raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found")

        order = res.data[0]

        status_steps = ["submitted", "confirmed", "in-production", "quality_check", "shipped", "delivered"]
        current_status = str(order.get("status", "submitted")).lower()
        step_idx = status_steps.index(current_status) if current_status in status_steps else 0

        order["trackingTimeline"] = [
            {"step": s, "completed": i <= step_idx, "current": i == step_idx}
            for i, s in enumerate(status_steps)
        ]

        return order
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching order tracking: {str(e)}",
        )
