from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil

root = Path(__file__).resolve().parents[1]
target = root / "web/public/integrations"
target.mkdir(parents=True, exist_ok=True)
notes = ["SIM_LOBU_RESEARCH_AND_SETUP.md", "DEPARTMENT_WORKSPACES_GUIDE.md"]
for name in notes:
    shutil.copyfile(root / name, target / name)
archive = target / "ethikcorp-runtime-starter.zip"
with ZipFile(archive, "w", ZIP_DEFLATED) as out:
    for file in sorted((root / "integrations").rglob("*")):
        if file.is_symlink() or not file.is_file():
            continue
        relative = file.relative_to(root / "integrations")
        if relative.parts in {
            ("README.md",),
            ("sim", "WORKFLOW_MAP.example.json"),
            ("lobu", "lobu.config.ts"), ("lobu", "tsconfig.json"),
            ("lobu", "package.json"), ("lobu", "package-lock.json"),
            ("lobu", ".env.example"), ("lobu", ".gitignore"),
        } or (
            len(relative.parts) == 3 and relative.parts[:2] == ("sim", "workflows") and file.suffix == ".json"
        ) or (
            len(relative.parts) == 3 and relative.parts[:2] == ("sim", "briefs") and file.suffix == ".md"
        ) or (
            len(relative.parts) == 4 and relative.parts[:2] == ("lobu", "agents")
            and file.name in {"IDENTITY.md", "SOUL.md", "USER.md", "EVALUATION.md"}
        ):
            out.write(file, file.relative_to(root))
    for name in notes:
        out.write(root / name, name)
print(archive)
