# Publishing

The package is prepared but **not published**. Nothing here uploads anything
until you run the last command yourself.

## 0. Check the name is still free

`cooperative-marl-labs` was not taken when this package was written, but names
are claimed continuously. Confirm before you build:

```bash
python -m pip index versions cooperative-marl-labs
# or open https://pypi.org/project/cooperative-marl-labs/
```

A 404 on that page means the name is free. From the command line, the name is
free when `pip index` reports no distribution at all:

```
ERROR: No matching distribution found for cooperative-marl-labs
```

That was the result when this package was prepared, so the name was available
then. Check again immediately before you publish.

## 1. A clean environment

```bash
cd cooperative-marl-labs
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python -m pip install --upgrade pip
```

## 2. Install with the dev extras

```bash
python -m pip install -e ".[dev,learning]"
```

## 3. Run the tests and the linter

```bash
pytest
ruff check .
```

Both must be clean before you build. The test suite includes
`pettingzoo.test.parallel_api_test` for all three environments, so a
PettingZoo release that changes the API will fail here rather than in a
learner's notebook.

## 4. Build

```bash
python -m build
```

This writes `dist/cooperative_marl_labs-0.1.0.tar.gz` and the matching
`.whl`. The build needs `setuptools>=77`, which pip fetches into an isolated
build environment for you.

## 5. Check the artifacts

```bash
python -m twine check dist/*
```

Also confirm the sdist contains what you expect and nothing you do not:

```bash
tar -tzf dist/cooperative_marl_labs-0.1.0.tar.gz | head -40
```

## 6. Publish to TestPyPI first

```bash
python -m twine upload --repository testpypi dist/*
```

Then install it into a fresh environment, from TestPyPI, and check that the
imports a learner's first cell uses actually work:

```bash
python -m venv /tmp/check && source /tmp/check/bin/activate
python -m pip install --index-url https://test.pypi.org/simple/ \
  --extra-index-url https://pypi.org/simple/ cooperative-marl-labs
python -c "
from cooperative_marl_labs.envs import WirelessResourceAllocationEnv
env = WirelessResourceAllocationEnv(n_agents=4, n_channels=3)
env.reset(seed=42)
env.render()
"
```

The `--extra-index-url` matters: TestPyPI does not mirror numpy or PettingZoo.

## 7. Publish to PyPI

Only once step 6 worked. There are two routes.

### From CI, which is the intended one

`.github/workflows/publish-cooperative-marl-labs.yml` publishes on a push to
the **`release`** branch. It runs the tests, checks that `pyproject.toml` and
`__init__.py` declare the same version, builds, uploads through
[trusted publishing](https://docs.pypi.org/trusted-publishers/) so no token is
stored anywhere, then installs the published wheel from PyPI and runs the
documented imports against it.

One-time setup, before the first run:

1. Add a **pending publisher** at
   <https://pypi.org/manage/account/publishing/>:

   | Field | Value |
   | --- | --- |
   | PyPI project name | `cooperative-marl-labs` |
   | Owner | `rexsimiloluwah` |
   | Repository name | `marl-for-cooperative-environments` |
   | Workflow name | `publish-cooperative-marl-labs.yml` |
   | Environment name | `pypi` |

   Repeat at <https://test.pypi.org/manage/account/publishing/> with
   environment name `testpypi` if you want the dry run.

2. In the repository: **Settings → Environments → New environment → `pypi`**.
   Add yourself as a required reviewer if you want a manual approval gate
   before every upload. Repeat for `testpypi`.

Then, to release:

```bash
# bump the version in BOTH files first
#   cooperative-marl-labs/pyproject.toml
#   cooperative-marl-labs/src/cooperative_marl_labs/__init__.py

git add -A && git commit -m "cooperative-marl-labs 0.1.1"
git push origin main
git push origin main:release      # this is what publishes
```

A dry run to TestPyPI first: **Actions → publish cooperative-marl-labs → Run
workflow → target: testpypi**.

PyPI refuses to overwrite an existing version and the workflow passes
`skip-existing`, so pushing `release` twice without a version bump is harmless
rather than a failure.

### By hand

```bash
python -m twine upload dist/*
```

Username `__token__`, password an API token from
<https://pypi.org/manage/account/token/>.

## 8. After publishing

- Tag the release: `git tag cooperative-marl-labs-v0.1.0 && git push --tags`
- Check the notebooks install it: their first cell is
  `!pip install -q cooperative-marl-labs`, which falls back to installing from
  this repository while the package is unpublished. Once it is on PyPI the
  fallback stops being used.

## Version policy

Semantic versioning, starting at `0.1.0`.

- **Patch** for a fix that changes no behaviour a notebook depends on.
- **Minor** for new environments, agents or helpers.
- **Major** for anything that would break a notebook's imports or change a
  measured result. Numbers quoted in the course material are tied to the
  environment's physics, so a change there means re-measuring and updating the
  written material, not just bumping the version.

Bump `version` in `pyproject.toml` and `__version__` in
`src/cooperative_marl_labs/__init__.py` together. `tests/test_imports.py`
checks the second one exists.
