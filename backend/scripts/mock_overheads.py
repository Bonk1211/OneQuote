import asyncio
import os
import sys
from typing import List, Dict, Any

# Add the backend directory to sys.path to allow importing from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from supabase import create_client, Client

async def seed_overheads():
    print(f"Connecting to Supabase at {settings.supabase_url}...")
    supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)

    # 1. Fetch all users
    users_resp = supabase.table("users").select("id, email").execute()
    users = users_resp.data

    if not users:
        print("No users found in the database. Please create a user first.")
        return

    print(f"Found {len(users)} users. Seeding overhead data...")

    mock_overheads = [
        {
            "insurance_monthly": 150,
            "vehicle_monthly": 350,
            "tools_equipment_monthly": 200,
            "software_monthly": 50,
            "rent_workspace_monthly": 1000,
            "phone_internet_monthly": 60,
            "accounting_monthly": 120,
            "marketing_monthly": 300,
            "training_monthly": 100,
            "other_fixed_monthly": 0,
            "other_fixed_description": "None",
            "income_tax_rate": 0.20,
            "national_insurance_rate": 0.09,
            "vat_registered": True,
            "vat_rate": 0.20,
            "corporation_tax_rate": 0.00,
            "working_days_per_week": 5,
            "working_weeks_per_year": 46,
            "working_hours_per_day": 8.0,
            "desired_annual_salary": 60000,
            "desired_profit_margin": 0.25,
        },
        {
            "insurance_monthly": 80,
            "vehicle_monthly": 0,
            "tools_equipment_monthly": 50,
            "software_monthly": 120,
            "rent_workspace_monthly": 0,
            "phone_internet_monthly": 40,
            "accounting_monthly": 80,
            "marketing_monthly": 150,
            "training_monthly": 50,
            "other_fixed_monthly": 200,
            "other_fixed_description": "Co-working space membership",
            "income_tax_rate": 0.20,
            "national_insurance_rate": 0.09,
            "vat_registered": False,
            "vat_rate": 0.20,
            "corporation_tax_rate": 0.00,
            "working_days_per_week": 4,
            "working_weeks_per_year": 48,
            "working_hours_per_day": 7.0,
            "desired_annual_salary": 45000,
            "desired_profit_margin": 0.20,
        }
    ]

    for i, user in enumerate(users):
        user_id = user["id"]
        email = user["email"]
        
        # Cycle through mock data if more users than mock data samples
        overhead_data = mock_overheads[i % len(mock_overheads)].copy()
        overhead_data["user_id"] = user_id

        print(f"Upserting overheads for user: {email} ({user_id})...")
        
        try:
            resp = supabase.table("base_overheads").upsert(
                overhead_data, on_conflict="user_id"
            ).execute()
            print(f"Successfully seeded overheads for {email}.")
        except Exception as e:
            print(f"Error seeding overheads for {email}: {e}")

    print("Seeding complete.")

if __name__ == "__main__":
    asyncio.run(seed_overheads())
