import time
import logging
from enum import Enum
from typing import Dict, Any, Optional

logger = logging.getLogger("floodtrace.circuit_breaker")

class CircuitBreakerState(str, Enum):
    CLOSED = "CLOSED"         # Normal operation: traffic flows through
    OPEN = "OPEN"             # Tripped: dependency failing, requests fail fast
    HALF_OPEN = "HALF_OPEN"   # Probing: testing dependency with cautious trial requests

class ErrorClassification(str, Enum):
    NETWORK_ERROR = "NETWORK_ERROR"
    TIMEOUT = "TIMEOUT"
    AUTH_ERROR = "AUTH_ERROR"
    RATE_LIMITED = "RATE_LIMITED"
    SOURCE_UNAVAILABLE = "SOURCE_UNAVAILABLE"
    INVALID_RESPONSE = "INVALID_RESPONSE"
    SCHEMA_CHANGED = "SCHEMA_CHANGED"
    LICENSE_BLOCKED = "LICENSE_BLOCKED"
    ACCESS_REQUIRED = "ACCESS_REQUIRED"
    STALE_DATA = "STALE_DATA"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"

class CircuitBreaker:
    """
    Master Prompt Section 4 & 24: Resilient Circuit Breaker for External Dependencies.
    Prevents hammering failing upstream endpoints and provides immediate graceful degradation.
    """
    def __init__(
        self,
        name: str,
        failure_threshold: int = 3,
        cooldown_seconds: float = 30.0,
        half_open_success_threshold: int = 2
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.half_open_success_threshold = half_open_success_threshold

        self.state: CircuitBreakerState = CircuitBreakerState.CLOSED
        self.failure_count: int = 0
        self.success_count: int = 0
        self.last_failure_time: Optional[float] = None
        self.last_state_change: float = time.time()
        self.last_error_message: Optional[str] = None
        self.last_error_class: Optional[ErrorClassification] = None

    def can_execute(self) -> bool:
        now = time.time()
        if self.state == CircuitBreakerState.CLOSED:
            return True

        if self.state == CircuitBreakerState.OPEN:
            # Check if cooldown has elapsed to attempt recovery probe
            if self.last_failure_time and (now - self.last_failure_time >= self.cooldown_seconds):
                logger.info(f"CircuitBreaker[{self.name}]: Cooldown elapsed. Entering HALF_OPEN.")
                self.state = CircuitBreakerState.HALF_OPEN
                self.last_state_change = now
                self.success_count = 0
                return True
            return False

        if self.state == CircuitBreakerState.HALF_OPEN:
            return True

        return False

    def record_success(self):
        now = time.time()
        if self.state == CircuitBreakerState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.half_open_success_threshold:
                logger.info(f"CircuitBreaker[{self.name}]: Probe succeeded. Restoring to CLOSED.")
                self.state = CircuitBreakerState.CLOSED
                self.failure_count = 0
                self.success_count = 0
                self.last_state_change = now
        elif self.state == CircuitBreakerState.CLOSED:
            self.failure_count = 0

    def record_failure(self, error: Exception, error_class: ErrorClassification = ErrorClassification.NETWORK_ERROR):
        now = time.time()
        self.failure_count += 1
        self.last_failure_time = now
        self.last_error_message = str(error)
        self.last_error_class = error_class

        if self.state == CircuitBreakerState.HALF_OPEN:
            logger.warning(f"CircuitBreaker[{self.name}]: Probe failed. Tripping back to OPEN.")
            self.state = CircuitBreakerState.OPEN
            self.last_state_change = now
        elif self.state == CircuitBreakerState.CLOSED and self.failure_count >= self.failure_threshold:
            logger.warning(f"CircuitBreaker[{self.name}]: Threshold ({self.failure_threshold}) reached. Tripping to OPEN.")
            self.state = CircuitBreakerState.OPEN
            self.last_state_change = now

    def get_status(self) -> Dict[str, Any]:
        now = time.time()
        cooldown_remaining = 0.0
        if self.state == CircuitBreakerState.OPEN and self.last_failure_time:
            cooldown_remaining = max(0.0, self.cooldown_seconds - (now - self.last_failure_time))

        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "cooldown_remaining_seconds": round(cooldown_remaining, 1),
            "last_error_class": self.last_error_class.value if self.last_error_class else None,
            "last_error_message": self.last_error_message,
            "healthy": self.state == CircuitBreakerState.CLOSED
        }

# Global registry of circuit breakers for external data sources
CIRCUIT_BREAKERS: Dict[str, CircuitBreaker] = {
    "openmeteo": CircuitBreaker("openmeteo", failure_threshold=3, cooldown_seconds=30.0),
    "thaiwater": CircuitBreaker("thaiwater", failure_threshold=3, cooldown_seconds=45.0),
    "rid": CircuitBreaker("rid", failure_threshold=3, cooldown_seconds=45.0),
    "gistda": CircuitBreaker("gistda", failure_threshold=3, cooldown_seconds=60.0),
    "diw": CircuitBreaker("diw", failure_threshold=3, cooldown_seconds=60.0),
}

def get_circuit_breaker(source_key: str) -> CircuitBreaker:
    if source_key not in CIRCUIT_BREAKERS:
        CIRCUIT_BREAKERS[source_key] = CircuitBreaker(source_key)
    return CIRCUIT_BREAKERS[source_key]
