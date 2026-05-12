from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )
    PORT: Optional[int] = 8008
    APP_HOST: Optional[str] = "0.0.0.0"
    APP_ROOT_PATH: Optional[str] = "/dss"

    MEDIA_PROVIDER: Optional[str] = "mediamtx"
    MEDIA_HOST: Optional[str] = None
    MEDIA_PORT: Optional[int] = None
    IP_MEDIA_MTX: Optional[str] = "localhost"
    PORT_MEDIA_MTX: Optional[int] = 8554
    MEDIA_PATH_TEMPLATE_MEDIAMTX: Optional[str] = "/live/liveStream_{id_camera_vms}_0_{stream_index}"
    MEDIA_PATH_TEMPLATE_GO2RTC: Optional[str] = "/liveStream_{id_camera_vms}_0_{stream_index}"
    MEDIA_PATH_TEMPLATE_CUSTOM: Optional[str] = None

    DAHUA_USERNAME: Optional[str] = "system"
    DAHUA_PASSWORD: Optional[str] = "Oryza@123"
    DAHUA_URL_BASE: Optional[str] = "http://192.168.105.15:8000"
    DAHUA_PORT_REPLACE: Optional[int] = None
    DAHUA_IP_REPLACE: Optional[str] = None
    DB_PATH: Optional[str] = "smart-signal.db"

    def get_media_host(self):
        return self.MEDIA_HOST if self.MEDIA_HOST else self.IP_MEDIA_MTX

    def get_media_port(self):
        return self.MEDIA_PORT if self.MEDIA_PORT else self.PORT_MEDIA_MTX

    def get_media_provider(self):
        if not self.MEDIA_PROVIDER:
            return "mediamtx"
        return self.MEDIA_PROVIDER.lower()

    def build_output_url(self, id_camera_vms: str, stream_type: str):
        stream_index = "0" if stream_type == "1" else "1"
        provider = self.get_media_provider()

        if provider == "go2rtc":
            template = self.MEDIA_PATH_TEMPLATE_GO2RTC
        elif provider == "custom" and self.MEDIA_PATH_TEMPLATE_CUSTOM:
            template = self.MEDIA_PATH_TEMPLATE_CUSTOM
        else:
            template = self.MEDIA_PATH_TEMPLATE_MEDIAMTX

        path = template.format(id_camera_vms=id_camera_vms, stream_index=stream_index)
        if not path.startswith("/"):
            path = f"/{path}"
        return f"rtsp://{self.get_media_host()}:{self.get_media_port()}{path}"


settings = Settings()
