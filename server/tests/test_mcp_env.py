"""İçtihat MCP alt sürecinin ortamı: proxy ve sertifika ayarları kaybolmamalı (bulut/ağ geçidi ortamları)."""

from app import mcp_hub


def test_proxy_and_certificate_variables_are_passed_to_the_subprocess(monkeypatch):
    for k in ("HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "NO_PROXY", "SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "SSL_CERT_DIR"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("HTTPS_PROXY", "http://proxy.local:3128")
    monkeypatch.setenv("SSL_CERT_FILE", "/etc/ssl/ca.pem")
    monkeypatch.setenv("UNRELATED_SECRET", "gizli")
    env = mcp_hub._ictihat_env()
    assert env["HTTPS_PROXY"] == "http://proxy.local:3128" and env["SSL_CERT_FILE"] == "/etc/ssl/ca.pem"
    assert "UNRELATED_SECRET" not in env  # yalnız ağ ayarları geçer, ortamın geri kalanı değil
    assert "PATH" in env  # MCP SDK'nın güvenli varsayılan ortamı korunur


def test_environment_without_proxy_is_just_the_default(monkeypatch):
    for k in ("HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "NO_PROXY", "no_proxy", "SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "SSL_CERT_DIR"):
        monkeypatch.delenv(k, raising=False)
    assert "HTTPS_PROXY" not in mcp_hub._ictihat_env()
