"""Bounded public text retrieval. DNS is validated and pinned for each redirect hop."""
import asyncio
import hashlib
import http.client
import ipaddress
import re
import socket
import ssl
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, urlunsplit, parse_qsl, quote, unquote


MAX_BYTES = 256 * 1024
MAX_TEXT = 16000
FETCH_TIMEOUT = 10
MAX_REDIRECTS = 4
TEXT_TYPES = {"text/html", "text/plain", "application/rss+xml", "application/atom+xml", "application/xml", "text/xml"}


class ResearchFetchError(Exception):
    def __init__(self, reason, invalid_url=False):
        self.reason = reason
        self.invalid_url = invalid_url
        super().__init__(reason)


def canonical_url(value: str) -> str:
    if not isinstance(value, str) or len(value) > 2048 or re.search(r"[\s\x00-\x1f\x7f\\]", value):
        raise ResearchFetchError("INVALID_URL", True)
    if redact_private_coordinates(unquote(value))[1]:
        raise ResearchFetchError("PRIVATE_LOCATION_URL", True)
    try:
        parts = urlsplit(value)
        host = (parts.hostname or "").encode("idna").decode("ascii").lower().rstrip(".")
        port = parts.port
    except (ValueError, UnicodeError):
        raise ResearchFetchError("INVALID_URL", True)
    if parts.scheme.lower() not in {"http", "https"} or not host or parts.username is not None or parts.password is not None:
        raise ResearchFetchError("INVALID_URL", True)
    if "%" in host or host == "localhost" or host.endswith((".localhost", ".local", ".internal", ".test")) or "." not in host and ":" not in host:
        raise ResearchFetchError("PRIVATE_DESTINATION", True)
    if port not in {None, 80 if parts.scheme.lower() == "http" else 443}:
        raise ResearchFetchError("UNSUPPORTED_PORT", True)
    if any(key.casefold() in {"token", "key", "access_token", "api_key", "signature", "password", "auth", "email", "phone", "lat", "lon", "latitude", "longitude", "gps"} for key, _ in parse_qsl(parts.query)):
        raise ResearchFetchError("CREDENTIAL_URL", True)
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        address = None
    if address is not None and not public_address(address):
        raise ResearchFetchError("PRIVATE_DESTINATION", True)
    netloc = f"[{host}]" if ":" in host else host
    result = urlunsplit((parts.scheme.lower(), netloc, quote(parts.path or "/", safe="/%:@-._~!$&'()*+,;="), quote(parts.query, safe="%=&?/:@-._~!$'()*+,;"), ""))
    if len(result) > 2048:
        raise ResearchFetchError("INVALID_URL", True)
    return result


def public_address(address):
    return address.is_global and not (address.is_multicast or address.is_reserved or address.is_unspecified)


def resolve_public_destination(url):
    url = canonical_url(url)
    parts = urlsplit(url)
    port = 443 if parts.scheme == "https" else 80
    try:
        answers = socket.getaddrinfo(parts.hostname, port, type=socket.SOCK_STREAM)
    except OSError:
        raise ResearchFetchError("DNS_UNAVAILABLE")
    addresses = {answer[4][0] for answer in answers}
    if not addresses or any(not public_address(ipaddress.ip_address(address)) for address in addresses):
        raise ResearchFetchError("PRIVATE_DESTINATION", True)
    return url, sorted(addresses)[0]


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, hostname, address, timeout):
        super().__init__(hostname, timeout=timeout, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        raw = socket.create_connection((self.address, 443), timeout=self.timeout)
        try:
            self.sock = self._context.wrap_socket(raw, server_hostname=self.host)
        except Exception:
            raw.close()
            raise


def _request_once(url, address, timeout):
    parts = urlsplit(url)
    connection = (_PinnedHTTPSConnection(parts.hostname, address, timeout)
                  if parts.scheme == "https" else http.client.HTTPConnection(address, 80, timeout=timeout))
    try:
        connection.request("GET", urlunsplit(("", "", parts.path, parts.query, "")), headers={
            "Host": parts.netloc, "User-Agent": "Ruwaigon-Research/1.0", "Accept-Encoding": "identity",
            "Accept": "text/html, text/plain, application/rss+xml, application/atom+xml, application/xml, text/xml",
        })
        response = connection.getresponse()
        headers = {key.lower(): value for key, value in response.getheaders()}
        if response.status in {301, 302, 303, 307, 308}:
            return response.status, headers, b""
        if response.status != 200:
            raise ResearchFetchError("SOURCE_UNAVAILABLE")
        if headers.get("content-type", "").split(";", 1)[0].strip().lower() not in TEXT_TYPES:
            raise ResearchFetchError("UNSUPPORTED_CONTENT")
        try:
            length = int(headers.get("content-length", "0"))
        except ValueError:
            raise ResearchFetchError("MALFORMED_CONTENT")
        if length < 0:
            raise ResearchFetchError("MALFORMED_CONTENT")
        if length > MAX_BYTES:
            raise ResearchFetchError("RESPONSE_TOO_LARGE")
        if headers.get("content-encoding", "identity").lower() not in {"", "identity"}:
            raise ResearchFetchError("UNSUPPORTED_ENCODING")
        deadline = time.monotonic() + timeout
        chunks, size = [], 0
        while True:
            if time.monotonic() >= deadline:
                raise ResearchFetchError("TIMEOUT")
            chunk = response.read1(min(8192, MAX_BYTES + 1 - size))
            if not chunk:
                break
            chunks.append(chunk)
            size += len(chunk)
            if size > MAX_BYTES:
                raise ResearchFetchError("RESPONSE_TOO_LARGE")
        body = b"".join(chunks)
        return response.status, headers, body
    finally:
        connection.close()


@dataclass
class FetchResult:
    url: str
    content_type: str
    body: bytes


def _fetch_public_text(url):
    deadline = time.monotonic() + FETCH_TIMEOUT
    for _ in range(MAX_REDIRECTS + 1):
        url, address = resolve_public_destination(url)
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise ResearchFetchError("TIMEOUT")
        status, headers, body = _request_once(url, address, remaining)
        if status in {301, 302, 303, 307, 308}:
            location = headers.get("location")
            if not location:
                raise ResearchFetchError("INVALID_REDIRECT")
            url = canonical_url(urljoin(url, location))
            continue
        content_type = headers.get("content-type", "").split(";", 1)[0].strip().lower()
        if content_type not in TEXT_TYPES:
            raise ResearchFetchError("UNSUPPORTED_CONTENT")
        return FetchResult(url, content_type, body)
    raise ResearchFetchError("TOO_MANY_REDIRECTS")


async def fetch_public_text(url):
    try:
        return await asyncio.wait_for(asyncio.to_thread(_fetch_public_text, url), FETCH_TIMEOUT + 2)
    except ResearchFetchError:
        raise
    except (asyncio.TimeoutError, TimeoutError, socket.timeout):
        raise ResearchFetchError("TIMEOUT")
    except (OSError, http.client.HTTPException, ValueError):
        raise ResearchFetchError("SOURCE_UNAVAILABLE")


def safe_text(value, limit=MAX_TEXT):
    value, _ = redact_private_coordinates(str(value or ""))
    value = re.sub(r"[\x00-\x1f\x7f]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    value = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[email redacted]", value)
    value = re.sub(r"(?<!\d)(?:\+66|0)[\d ()-]{8,15}\d(?!\d)", "[phone redacted]", value)
    value = re.sub(r"(?i)(?:api[_-]?key|password|access[_-]?token)\s*[:=]\s*\S+", "[credential redacted]", value)
    return value[:limit] or None


_PRIVATE_CONTEXT = re.compile(
    r"(?i)\bpersonal\b|\bprivate\b|\bhome\b|\bresidence\b|\bresidential\b|\bhouse\b|"
    r"\b(?:reporter|citizen|user)(?:'s)?\s+(?:private|personal|home|residential|location|gps|coordinates?|latitude|longitude|lat|lon)\b|"
    r"\b(?:gps|coordinates?|coordinate|latitude|longitude|lat|lon)\s+(?:for|of)\s+(?:reporter|citizen|user)\b|"
    r"ผู้รายงาน.{0,12}(?:พิกัด|ตำแหน่ง|บ้าน)|ผู้แจ้ง.{0,12}(?:พิกัด|ตำแหน่ง|บ้าน)|ส่วนบุคคล|ส่วนตัว|บ้าน|ที่พัก|ที่อยู่อาศัย"
)
_STATEMENT_BREAK = re.compile(r"(?:[!?]\s+|\.\s+(?=[A-Za-z\u0E00-\u0E7F])|;|\n\s*\n)")
_COORD_NUMBER = r"[-+]?\d{1,3}(?:\.\d{1,})?"
_LABELLED_COORDINATE = re.compile(
    r"(?i)\b(?:latitude|longitude|lat|lon)\b\s*(?:=|:)?\s*" + _COORD_NUMBER
)
_GPS_PAIR = re.compile(
    r"(?i)\b(?:gps|coordinates?|coordinate|พิกัด)\b\s*(?:=|:)?\s*(" + _COORD_NUMBER + r")\s*[,;/ ]+\s*(" + _COORD_NUMBER + r")"
)


def redact_private_coordinates(value):
    """Redact precise coordinates only when nearby text identifies a private place/person."""
    text = str(value or "")
    spans = []

    def private_context(start, end):
        left = 0
        right = len(text)
        for boundary in _STATEMENT_BREAK.finditer(text, 0, start):
            left = boundary.end()
        boundary = _STATEMENT_BREAK.search(text, end)
        if boundary:
            right = boundary.start()
        return bool(_PRIVATE_CONTEXT.search(text[left:right]))

    for match in _GPS_PAIR.finditer(text):
        if private_context(*match.span()):
            spans.append(match.span())
    for match in _LABELLED_COORDINATE.finditer(text):
        if private_context(*match.span()):
            spans.append(match.span())
    if not spans:
        return text, False
    output, cursor = [], 0
    for start, end in sorted(spans):
        if start < cursor:
            continue
        output.extend((text[cursor:start], "[PRIVATE_LOCATION_REDACTED]"))
        cursor = end
    output.append(text[cursor:])
    return "".join(output), True


def safe_source_text(value, limit=MAX_TEXT):
    """Sanitize source prose while retaining paragraph boundaries for location checks."""
    text, _ = redact_private_coordinates(str(value or ""))
    lines = [safe_text(line, max(limit, len(line) + 1)) for line in text.splitlines()]
    text = "\n".join(line for line in lines if line)
    return text[:limit] or None


class _TextParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.in_title = False
        self.title = []
        self.text = []
        self.publisher = None
        self.published = None

    def handle_starttag(self, tag, attrs):
        if tag in {"address", "article", "blockquote", "br", "dd", "div", "dl", "dt", "h1", "h2", "h3", "h4", "li", "ol", "p", "section", "tr", "ul"}:
            self.text.append("\n")
        if tag in {"script", "style", "noscript", "svg", "iframe", "object"}:
            self.skip += 1
        if tag == "title":
            self.in_title = True
        if tag == "meta" and not self.skip:
            attrs = dict(attrs)
            name = (attrs.get("property") or attrs.get("name") or "").lower()
            if name == "og:site_name":
                self.publisher = safe_text(attrs.get("content"), 200)
            if name == "article:published_time":
                self.published = parse_date(attrs.get("content"))

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript", "svg", "iframe", "object"} and self.skip:
            self.skip -= 1
        if tag == "title":
            self.in_title = False
        if tag in {"address", "article", "blockquote", "dd", "div", "dl", "dt", "h1", "h2", "h3", "h4", "li", "ol", "p", "section", "tr", "ul"}:
            self.text.append("\n")

    def handle_data(self, data):
        if not self.skip:
            (self.title if self.in_title else self.text).append(data)


def parse_date(value):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = parsedate_to_datetime(value)
        except (ValueError, TypeError, IndexError):
            return None
    return parsed.astimezone(timezone.utc) if parsed.tzinfo else None


def extract_document(result):
    if len(result.body) > MAX_BYTES:
        raise ResearchFetchError("RESPONSE_TOO_LARGE")
    if result.content_type not in {"text/html", "text/plain"}:
        raise ResearchFetchError("UNSUPPORTED_CONTENT")
    try:
        text = result.body.decode("utf-8-sig", errors="strict")
    except UnicodeError:
        raise ResearchFetchError("UNSUPPORTED_ENCODING")
    parser = _TextParser()
    if result.content_type == "text/html":
        parser.feed(text)
        excerpt = safe_source_text("".join(parser.text))
        title = safe_text(" ".join(parser.title), 300)
    else:
        excerpt, title = safe_source_text(text), None
    if not excerpt:
        raise ResearchFetchError("MALFORMED_CONTENT")
    flags = []
    if any("redacted]" in (value or "") for value in (excerpt, title, parser.publisher)):
        flags.append("PERSONAL_DATA_REVIEW_REQUIRED")
    if any("[PRIVATE_LOCATION_REDACTED]" in (value or "") for value in (excerpt, title, parser.publisher)):
        flags.append("PRIVATE_LOCATION_REVIEW_REQUIRED")
    if re.search(r"(?i)(factory|company|โรงงาน|บริษัท|บุคคล).{0,100}(caused|pollut|ก่อ|ปล่อย|ปนเปื้อน)", excerpt):
        flags.append("SOURCE_ALLEGATION_REVIEW_REQUIRED")
    return {"safe_title": title, "safe_excerpt": excerpt, "publisher": parser.publisher,
            "published_at": parser.published, "privacy_legal_flags": flags,
            "content_fingerprint": hashlib.sha256(excerpt.encode()).hexdigest()}


def parse_feed(result):
    try:
        if len(result.body) > MAX_BYTES:
            raise ValueError("large XML")
        text = result.body.decode("utf-8-sig", errors="strict")
        if "\x00" in text or re.search(r"<!\s*(DOCTYPE|ENTITY)", text, re.I):
            raise ValueError("unsafe XML")
        root = ET.fromstring(text)
        if len(list(root.iter())) > 2500:
            raise ValueError("large XML")
    except (UnicodeError, ValueError, ET.ParseError):
        raise ResearchFetchError("MALFORMED_FEED")
    entries = []
    if root.tag == "rss":
        channel = root.find("channel")
        if channel is None:
            raise ResearchFetchError("MALFORMED_FEED")
        publisher = safe_text(channel.findtext("title"), 200)
        items = channel.findall("item")
        for item in items[:50]:
            entries.append((item.findtext("link"), item.findtext("title"), item.findtext("description"), item.findtext("pubDate"), publisher))
    elif root.tag == "{http://www.w3.org/2005/Atom}feed":
        ns = "{http://www.w3.org/2005/Atom}"
        publisher = safe_text(root.findtext(ns + "title"), 200)
        for item in root.findall(ns + "entry")[:50]:
            links = [link.get("href") for link in item.findall(ns + "link") if link.get("rel", "alternate") == "alternate"]
            entries.append((links[0] if links else None, item.findtext(ns + "title"), item.findtext(ns + "summary"), item.findtext(ns + "published"), publisher))
    else:
        raise ResearchFetchError("MALFORMED_FEED")
    output = []
    for link, title, excerpt, published, publisher in entries:
        if not link:
            continue
        parser = _TextParser()
        parser.feed(excerpt or "")
        safe_excerpt = safe_source_text("".join(parser.text))
        safe_title = safe_text(title, 300)
        flags = []
        if any("redacted]" in (value or "") for value in (safe_excerpt, safe_title, publisher)):
            flags.append("PERSONAL_DATA_REVIEW_REQUIRED")
        if any("[PRIVATE_LOCATION_REDACTED]" in (value or "") for value in (safe_excerpt, safe_title, publisher)):
            flags.append("PRIVATE_LOCATION_REVIEW_REQUIRED")
        output.append({"url": canonical_url(urljoin(result.url, link)), "safe_title": safe_title,
                       "safe_excerpt": safe_excerpt, "published_at": parse_date(published), "publisher": publisher,
                       "privacy_legal_flags": flags})
    return output
