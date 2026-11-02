from supabase import create_client, Client
from app.config import settings

# Clean URL: strip any trailing '/rest/v1' or trailing slash
base_url = settings.SUPABASE_URL.rstrip("/").removesuffix("/rest/v1")

# Attempt service role key first, fall back to anon key if invalid
api_key = settings.SUPABASE_SERVICE_ROLE_KEY if settings.SUPABASE_SERVICE_ROLE_KEY else settings.SUPABASE_ANON_KEY

try:
    supabase: Client = create_client(base_url, api_key)
except Exception as e:
    print(f"⚠️ Notice: service_role key could not be used ({e}). Falling back to SUPABASE_ANON_KEY...")
    supabase: Client = create_client(base_url, settings.SUPABASE_ANON_KEY)


