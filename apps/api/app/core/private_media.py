"""Fail-closed storage helpers for sanitized citizen media."""

import os
import re
import stat
from pathlib import Path

from apps.api.app.core.config import settings


_SAFE_REFERENCE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}\.(?:jpg|jpeg|png|webp)", re.IGNORECASE)
_NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)
_DIRECTORY = getattr(os, "O_DIRECTORY", 0)


class PrivateMediaUnavailable(Exception):
    pass


class PrivateMediaNotFound(Exception):
    pass


def private_media_root() -> Path:
    root = Path(settings.PRIVATE_MEDIA_ROOT).expanduser().absolute()
    try:
        metadata = root.lstat()
    except OSError as exc:
        raise PrivateMediaUnavailable from exc
    if (
        stat.S_ISLNK(metadata.st_mode)
        or not stat.S_ISDIR(metadata.st_mode)
        or metadata.st_uid != os.getuid()
        or stat.S_IMODE(metadata.st_mode) != 0o700
        or not os.access(root, os.W_OK | os.X_OK)
    ):
        raise PrivateMediaUnavailable
    return root


def private_media_ready() -> bool:
    try:
        private_media_root()
        return True
    except PrivateMediaUnavailable:
        return False


def normalize_media_reference(reference: str | None) -> str:
    if not isinstance(reference, str):
        raise PrivateMediaNotFound
    candidate = reference.strip()
    if candidate.startswith("/uploads/"):
        candidate = candidate[len("/uploads/"):]
    if (
        not candidate
        or "/" in candidate
        or "\\" in candidate
        or ".." == candidate
        or not _SAFE_REFERENCE.fullmatch(candidate)
    ):
        raise PrivateMediaNotFound
    return candidate


def _open_root() -> tuple[Path, int]:
    root = private_media_root()
    try:
        descriptor = os.open(root, os.O_RDONLY | _DIRECTORY | _NOFOLLOW)
    except OSError as exc:
        raise PrivateMediaUnavailable from exc
    return root, descriptor


def write_private_media(content: bytes, reference: str) -> str:
    filename = normalize_media_reference(reference)
    _, root_fd = _open_root()
    file_fd = None
    try:
        file_fd = os.open(
            filename,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | _NOFOLLOW,
            0o600,
            dir_fd=root_fd,
        )
        os.fchmod(file_fd, 0o600)
        with os.fdopen(file_fd, "wb", closefd=True) as stored:
            file_fd = None
            stored.write(content)
            stored.flush()
            os.fsync(stored.fileno())
    except FileExistsError as exc:
        raise PrivateMediaNotFound from exc
    except OSError as exc:
        try:
            os.unlink(filename, dir_fd=root_fd)
        except OSError:
            pass
        raise PrivateMediaUnavailable from exc
    finally:
        if file_fd is not None:
            os.close(file_fd)
        os.close(root_fd)
    return filename


def read_private_media(reference: str | None) -> tuple[bytes, str]:
    filename = normalize_media_reference(reference)
    _, root_fd = _open_root()
    file_fd = None
    try:
        file_fd = os.open(filename, os.O_RDONLY | _NOFOLLOW, dir_fd=root_fd)
        metadata = os.fstat(file_fd)
        if (
            not stat.S_ISREG(metadata.st_mode)
            or stat.S_IMODE(metadata.st_mode) != 0o600
            or metadata.st_size > settings.MAX_UPLOAD_SIZE_BYTES
        ):
            raise PrivateMediaNotFound
        with os.fdopen(file_fd, "rb", closefd=True) as stored:
            file_fd = None
            content = stored.read(settings.MAX_UPLOAD_SIZE_BYTES + 1)
    except (FileNotFoundError, NotADirectoryError, PermissionError, OSError) as exc:
        raise PrivateMediaNotFound from exc
    finally:
        if file_fd is not None:
            os.close(file_fd)
        os.close(root_fd)
    extension = filename.rsplit(".", 1)[-1].lower()
    media_type = "image/png" if extension == "png" else "image/jpeg"
    return content, media_type
