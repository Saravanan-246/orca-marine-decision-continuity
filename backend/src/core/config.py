from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "orca-intelligence"

    mongo_uri: str = Field(
        default="mongodb://localhost:27017",
        validation_alias="MONGODB_URI",
    )

    mongo_db: str = Field(
        default="orca",
        validation_alias="MONGODB_DB",
    )

    cors_origins: str = Field(
        default="*",
        validation_alias="CORS_ORIGINS",
    )

    incois_osf_base_url: str = Field(
        default="https://incois.gov.in",
        validation_alias="INCOIS_OSF_BASE_URL",
    )

    incois_osf_ww3_catalog_path: str = Field(
        default="/thredds/catalog/osf/ww3/catalog.xml",
        validation_alias="INCOIS_OSF_WW3_CATALOG_PATH",
    )

    incois_osf_timeout_seconds: float = Field(
        default=30.0,
        validation_alias="INCOIS_OSF_TIMEOUT_SECONDS",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def origins(self) -> list[str]:
        return [
            item.strip()
            for item in self.cors_origins.split(",")
            if item.strip()
        ]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()