from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    openai_api_key: str
    onechain_rpc_url: str = "https://rpc.onechain.io"
    escrow_package_id: str = ""
    usdc_type: str = ""
    gas_sponsor_private_key: str = ""
    frontend_url: str = "http://localhost:3000"

    model_config = {"env_file": ".env"}


settings = Settings()
