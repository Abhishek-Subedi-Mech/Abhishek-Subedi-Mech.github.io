#!/usr/bin/env python3
"""
Generate index_thermal.html from index.html.

index_thermal.html is a targeted landing page for thermal-modeling roles. It is
identical to the main page apart from the framing copy below, so it is generated
rather than hand-maintained: edit index.html, then run

    python3 tools/build-variant.py

Both files are committed. GitHub Pages still serves plain static HTML; this
script is a local authoring tool, not a deploy step.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC  = ROOT / "index.html"
OUT  = ROOT / "index_thermal.html"

BANNER = ("<!-- GENERATED FILE. Do not edit by hand.\n"
          "     Source: index.html · Regenerate: python3 tools/build-variant.py -->\n")

# (description, exact source string, replacement): every one must match once.
EDITS = [
    ("page title",
     "<title>Abhishek Subedi | Mechanical Engineer</title>",
     "<title>Abhishek Subedi | Thermal Modeling Engineer</title>"),

    ("meta description",
     '<meta name="description" content="Abhishek Subedi, Mechanical Engineer and MS candidate at the University of Toledo. Supersonic wind tunnel design, Schlieren imaging and PIV, thermal systems, and SolidWorks CAD.">',
     '<meta name="description" content="Abhishek Subedi, MS Mechanical Engineering candidate (Dec 2026) specializing in thermal modeling, CFD simulation, EV battery thermal management, and experimental fluid mechanics.">'),

    # a targeted landing page should not compete with the main page in search
    ("canonical to robots",
     '<link rel="canonical" href="https://abhisheksubedi.name.np/">',
     '<meta name="robots" content="noindex, follow">'),

    ("og:url",
     '<meta property="og:url" content="https://abhisheksubedi.name.np/">',
     '<meta property="og:url" content="https://abhisheksubedi.name.np/index_thermal.html">'),

    ("og:title",
     '<meta property="og:title" content="Abhishek Subedi | Mechanical Engineer">',
     '<meta property="og:title" content="Abhishek Subedi | Thermal Modeling Engineer">'),

    ("og:description",
     '<meta property="og:description" content="Supersonic wind tunnel design, Schlieren imaging and PIV, thermal systems, and SolidWorks CAD. MS Mechanical Engineering, University of Toledo, December 2026.">',
     '<meta property="og:description" content="Thermal modeling, CFD simulation, and EV battery thermal management, backed by experimental fluid mechanics. MS Mechanical Engineering, University of Toledo, December 2026.">'),

    ("twitter:title",
     '<meta name="twitter:title" content="Abhishek Subedi | Mechanical Engineer">',
     '<meta name="twitter:title" content="Abhishek Subedi | Thermal Modeling Engineer">'),

    ("twitter:description",
     '<meta name="twitter:description" content="Supersonic wind tunnel design, Schlieren imaging and PIV, thermal systems, and SolidWorks CAD.">',
     '<meta name="twitter:description" content="Thermal modeling, CFD simulation, and EV battery thermal management, backed by experimental fluid mechanics.">'),

    ("JSON-LD job title",
     '"jobTitle": "Mechanical Engineer",',
     '"jobTitle": "Thermal Modeling Engineer",'),

    ("hero lede",
     '<p class="hero-lede">I design and build the instruments that measure <strong>supersonic flow</strong>, then turn what they see into numbers.</p>',
     '<p class="hero-lede">I model and measure how <strong>heat and fluids move</strong>, from battery packs in Ansys Fluent to supersonic jets in a tunnel I built.</p>'),

    ("hero focus line",
     '<dd>Experimental fluids · Thermal systems · CAD</dd>',
     '<dd>Thermal modeling · CFD · Experimental fluids</dd>'),
]


def main() -> int:
    html = SRC.read_text(encoding="utf-8")

    for label, old, new in EDITS:
        n = html.count(old)
        if n != 1:
            print(f"error: '{label}' matched {n} times in index.html, expected 1.\n"
                  f"       The source markup changed. Update EDITS in {__file__}.",
                  file=sys.stderr)
            return 1
        html = html.replace(old, new, 1)

    html = re.sub(r"^<!DOCTYPE html>\n", "<!DOCTYPE html>\n" + BANNER, html, count=1)
    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(EDITS)} substitutions)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
