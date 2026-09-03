"""Put the shipped notebooks in one canonical shape.

A learner should open a notebook with no outputs, and a reviewer should get a
readable diff, so source is stored as a list of lines (the nbformat
convention) and every output and execution count is cleared.
"""
import json, pathlib, sys


def normalize(path: pathlib.Path) -> bool:
    nb = json.loads(path.read_text())
    changed = False
    for cell in nb["cells"]:
        src = cell["source"]
        if isinstance(src, str):
            cell["source"] = src.splitlines(keepends=True)
            changed = True
        if cell["cell_type"] == "code":
            if cell.get("outputs"):
                cell["outputs"] = []
                changed = True
            if cell.get("execution_count") is not None:
                cell["execution_count"] = None
                changed = True
    if changed:
        path.write_text(json.dumps(nb, indent=1, ensure_ascii=False) + "\n")
    print(f'  {"normalized" if changed else "already clean"}  {path.name}')
    return changed


if __name__ == "__main__":
    paths = [pathlib.Path(a) for a in sys.argv[1:]] or sorted(
        pathlib.Path("notebooks").glob("*.ipynb"))
    for p in paths:
        normalize(p)
