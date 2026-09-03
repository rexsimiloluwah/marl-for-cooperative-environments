/**
 * PYTHON TEST HARNESS
 *
 * Injected before an exercise's test code. It gives authors a small set of
 * assertion helpers whose failures carry an explanation, because the check
 * system's whole purpose is to tell a learner WHY something is wrong rather
 * than that it is wrong.
 *
 * Authors write ordinary Python:
 *
 *   expect("collision is penalised", team_reward(0, 0), -1,
 *          "Both agents chose the same channel, so the team should lose.")
 *
 *   expect_close("fairness of equal rates", jain([1, 1, 1]), 1.0,
 *                hint="Jain's index is 1 when every rate is identical.")
 *
 * Results are handed back as JSON rather than as a Python object, so no
 * proxy conversion is involved and the boundary stays a plain string.
 */
export const HARNESS = `
import json as _json

_checks = []

def _repr(value):
    try:
        text = repr(value)
    except Exception:
        text = "<unrepresentable>"
    return text if len(text) <= 200 else text[:197] + "..."

def _record(name, passed, actual, expected, hint):
    _checks.append({
        "name": str(name),
        "passed": bool(passed),
        "actual": _repr(actual),
        "expected": _repr(expected),
        "hint": str(hint or ""),
    })

def expect(name, actual, expected, hint=""):
    """Assert equality."""
    try:
        passed = bool(actual == expected)
    except Exception:
        passed = False
    _record(name, passed, actual, expected, hint)

def expect_close(name, actual, expected, tol=1e-6, hint=""):
    """Assert near-equality, for anything computed in floating point."""
    try:
        passed = abs(float(actual) - float(expected)) <= tol
    except Exception:
        passed = False
    _record(name, passed, actual, expected, hint)

def expect_true(name, condition, hint=""):
    """Assert a condition, when there is no natural 'expected' value."""
    _record(name, bool(condition), bool(condition), True, hint)

def expect_raises(name, exc_type, fn, hint=""):
    """Assert that calling fn() raises exc_type."""
    try:
        fn()
        _record(name, False, "no exception", exc_type.__name__, hint)
    except exc_type:
        _record(name, True, exc_type.__name__, exc_type.__name__, hint)
    except Exception as err:
        _record(name, False, type(err).__name__, exc_type.__name__, hint)
`;

/** Serialises the collected results. Run after the author's test code. */
export const HARNESS_COLLECT = `_json.dumps(_checks)`;
