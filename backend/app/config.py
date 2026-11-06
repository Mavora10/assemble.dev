from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: Optional[str] = None
    
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = ""
    
    JWT_SECRET: str = "super_secret_jwt_random_signing_key_event_horizon_2027"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def port(self) -> int:
        return self.PORT

settings = Settings()

