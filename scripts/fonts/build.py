"""Turns the Google Fonts downloads into the Latin-only WOFF2 files in public/fonts that the tools use.
The brand fonts come from the second-drafts-kit brand skill instead, in brand/fonts.

    python3 -m venv .venv-fonts && .venv-fonts/bin/pip install fonttools brotli
    npm run fonts -- ~/Downloads/<fonts folder> [more folders...]

Each source path below is looked up in every folder given. Axes not mentioned in `axes` are kept whole;
a single value pins the axis, a (min, max) pair narrows it.
"""

import shutil
import sys
import tempfile
from pathlib import Path

from fontTools.subset import main as subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

OUTPUT = Path(__file__).resolve().parents[2] / "public" / "fonts"

# The latin range Google Fonts serves by default.
LATIN = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,"
    "U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
)

# Weights match the ones src/tools/teleprompter/lib/fonts.ts loads.
FONTS = [
    ("Inter/Inter-VariableFont_opsz,wght.ttf", "inter-400", {"wght": 400}),
    ("Inter/Inter-VariableFont_opsz,wght.ttf", "inter-700", {"wght": 700}),
    ("Source_Serif_4/SourceSerif4-VariableFont_opsz,wght.ttf", "source-serif-4-400", {"wght": 400}),
    ("Source_Serif_4/SourceSerif4-VariableFont_opsz,wght.ttf", "source-serif-4-700", {"wght": 700}),
    ("Atkinson_Hyperlegible/AtkinsonHyperlegible-Regular.ttf", "atkinson-hyperlegible-400", {}),
    ("Atkinson_Hyperlegible/AtkinsonHyperlegible-Bold.ttf", "atkinson-hyperlegible-700", {}),
    ("Barlow_Condensed/BarlowCondensed-Medium.ttf", "barlow-condensed-500", {}),
    ("Barlow_Condensed/BarlowCondensed-Bold.ttf", "barlow-condensed-700", {}),
    ("Archivo/Archivo-VariableFont_wdth,wght.ttf", "archivo-700", {"wght": 700, "wdth": 100}),
    ("Archivo/Archivo-VariableFont_wdth,wght.ttf", "archivo-900", {"wght": 900, "wdth": 100}),
    ("JetBrains_Mono/JetBrainsMono-VariableFont_wght.ttf", "jetbrains-mono-400", {"wght": 400}),
    ("JetBrains_Mono/JetBrainsMono-VariableFont_wght.ttf", "jetbrains-mono-700", {"wght": 700}),
]


def find(source: str, folders: list[Path]) -> Path:
    for folder in folders:
        if (folder / source).exists():
            return folder / source
    sys.exit(f"Missing {source} in {', '.join(map(str, folders))}")


def build(source: Path, name: str, axes: dict, scratch: Path) -> None:
    font = TTFont(source)
    if axes:
        font = instantiateVariableFont(font, axes, updateFontNames=False)
    trimmed = scratch / f"{name}.ttf"
    font.save(trimmed)
    output = OUTPUT / f"{name}.woff2"
    subset([str(trimmed), f"--unicodes={LATIN}", "--layout-features=*", "--flavor=woff2", f"--output-file={output}"])
    print(f"{output.relative_to(OUTPUT.parents[1])}  {output.stat().st_size // 1024}KB")


def copy_license(source: Path) -> None:
    family = source.parent.name.replace("_", "")
    shutil.copy(source.parent / "OFL.txt", OUTPUT / f"OFL-{family}.txt")


def main() -> None:
    folders = [Path(arg).expanduser() for arg in sys.argv[1:]]
    if not folders:
        sys.exit(__doc__)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as scratch:
        for source, name, axes in FONTS:
            path = find(source, folders)
            build(path, name, axes, Path(scratch))
            copy_license(path)


main()
