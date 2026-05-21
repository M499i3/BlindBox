from fastapi import APIRouter
from supabase import create_client
import os

router = APIRouter()

supabase = create_client(
    os.getenv("VITE_SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

@router.post("/")
def create_order(order: dict):

    result = supabase.table("orders").insert({
        "listing_id": order["listing_id"],
        "buyer_id": order["buyer_id"],
        "seller_id": order["seller_id"],
        "status": order["status"],
        "amount": order["amount"],
        "currency": order["currency"],
        "shipping_method": order["shipping_method"],
    }).execute()

    return {
        "success": True,
        "data": result.data
    }