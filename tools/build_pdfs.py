#!/usr/bin/env python3
"""Build designed, complete PDFs from the five final Markdown deliverables."""
from __future__ import annotations

import html
import os
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, KeepTogether, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle, Preformatted
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)
FONT_DIR = Path(os.getenv("SUPERBRAIN_PDF_FONT_DIR", "/System/Library/Fonts/Supplemental"))
pdfmetrics.registerFont(TTFont("ArialU", str(FONT_DIR / "Arial Unicode.ttf")))
pdfmetrics.registerFont(TTFont("ArialBold", str(FONT_DIR / "Arial Bold.ttf")))
pdfmetrics.registerFontFamily("ArialU", normal="ArialU", bold="ArialBold")

PAGE_W, PAGE_H = A4
INK = colors.HexColor("#19343d")
DEEP = colors.HexColor("#102e38")
TEAL = colors.HexColor("#126b67")
MUTED = colors.HexColor("#536a6b")
LINE = colors.HexColor("#d9e4e2")
PALE = colors.HexColor("#eff5f2")
WHITE = colors.white
TABLE_PADDING = 5

STYLES = {
    "h1": ParagraphStyle("h1", fontName="ArialBold", fontSize=20, leading=24, textColor=INK, spaceBefore=20, spaceAfter=9, keepWithNext=True),
    "h2": ParagraphStyle("h2", fontName="ArialBold", fontSize=14, leading=18, textColor=INK, spaceBefore=19, spaceAfter=7, keepWithNext=True),
    "h3": ParagraphStyle("h3", fontName="ArialBold", fontSize=11.2, leading=15, textColor=TEAL, spaceBefore=14, spaceAfter=6, keepWithNext=True),
    "body": ParagraphStyle("body", fontName="ArialU", fontSize=9, leading=13.4, textColor=INK, spaceAfter=7, allowWidows=0, allowOrphans=0),
    "small": ParagraphStyle("small", fontName="ArialU", fontSize=8, leading=11.2, textColor=INK, spaceAfter=3),
    "label": ParagraphStyle("label", fontName="ArialBold", fontSize=7.2, leading=10, textColor=TEAL),
    "rowtitle": ParagraphStyle("rowtitle", fontName="ArialBold", fontSize=9.2, leading=12.5, textColor=INK, spaceBefore=9, spaceAfter=5, keepWithNext=True),
    "bullet": ParagraphStyle("bullet", fontName="ArialU", fontSize=9, leading=13.4, textColor=INK, leftIndent=14, firstLineIndent=-11, spaceAfter=5),
    "code": ParagraphStyle("code", fontName="Courier", fontSize=7.4, leading=10.2, textColor=INK, backColor=PALE, leftIndent=9, rightIndent=8, spaceBefore=3, spaceAfter=3),
}


def inline(text: str) -> str:
    text = html.escape(text.strip())
    # ReportLab's Paragraph accepts basic HTML-style tags.
    text = re.sub(r"\[([^\]]+)\]\(&lt;([^&]+)&gt;\)", lambda m: f'<link href="{html.unescape(m.group(2))}" color="#126b67">{m.group(1)}</link>', text)
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", lambda m: f'<link href="{m.group(2)}" color="#126b67">{m.group(1)}</link>', text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", lambda m: m.group(1), text)
    text = re.sub(r"`([^`]+)`", lambda m: f'<font name="Courier" size="8">{m.group(1)}</font>', text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", text)
    return text


def clean_cell(cell: str) -> str:
    return cell.strip().replace("<br>", " ")


def table_rows(lines: list[str], index: int) -> tuple[list[list[str]], int]:
    rows = []
    while index < len(lines) and lines[index].lstrip().startswith("|"):
        row = [clean_cell(x) for x in lines[index].strip().strip("|").split("|")]
        if not all(re.fullmatch(r"[:\-\s]+", cell or "-") for cell in row):
            rows.append(row)
        index += 1
    return rows, index


def table_flowables(rows: list[list[str]]) -> list[Flowable]:
    if len(rows) < 2:
        return []
    headers = rows[0]
    result: list[Flowable] = []
    for count, row in enumerate(rows[1:], 1):
        if len(row) < len(headers):
            row += [""] * (len(headers) - len(row))
        title = row[0] or f"Record {count}"
        details = []
        for label, value in zip(headers[1:], row[1:]):
            if value:
                details.append([
                    Paragraph(inline(label), STYLES["label"]),
                    Paragraph(inline(value), STYLES["small"]),
                ])
        if not details:
            continue
        width = PAGE_W - 100
        card = Table(details, colWidths=[112, width - 112], hAlign="LEFT", repeatRows=0)
        card.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PALE if count % 2 else WHITE),
            ("BOX", (0, 0), (-1, -1), .45, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), TABLE_PADDING),
            ("BOTTOMPADDING", (0, 0), (-1, -1), TABLE_PADDING),
            ("LINEBELOW", (0, 0), (-1, -2), .25, LINE),
        ]))
        result.extend([Paragraph(inline(title), STYLES["rowtitle"]), card, Spacer(1, 5)])
    return result


def parse_markdown(text: str) -> list[Flowable]:
    lines = text.splitlines()
    result: list[Flowable] = []
    i = 0
    first_heading = True
    while i < len(lines):
        raw = lines[i]
        line = raw.strip()
        if not line:
            i += 1
            continue
        if line.startswith("<!--"):
            i += 1
            continue
        if line.startswith("|"):
            rows, i = table_rows(lines, i)
            result.extend(table_flowables(rows))
            continue
        if line.startswith("```"):
            i += 1
            block = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                block.extend([lines[i][j:j+90] for j in range(0, max(len(lines[i]), 1), 90)])
                i += 1
            result.append(Spacer(1, 3))
            result.append(Preformatted("\n".join(block), STYLES["code"], maxLineLength=90))
            result.append(Spacer(1, 5))
            i += 1
            continue
        if line.startswith("# "):
            if first_heading:
                first_heading = False
            else:
                result.append(Paragraph(inline(line[2:]), STYLES["h1"]))
            i += 1
            continue
        if line.startswith("## "):
            result.append(Paragraph(inline(line[3:]), STYLES["h2"]))
            i += 1
            continue
        if line.startswith("### "):
            result.append(Paragraph(inline(line[4:]), STYLES["h3"]))
            i += 1
            continue
        if re.match(r"^[-*] ", line):
            result.append(Paragraph("• " + inline(line[2:]), STYLES["bullet"]))
            i += 1
            continue
        number = re.match(r"^(\d+)\.\s+(.+)", line)
        if number:
            result.append(Paragraph(number.group(1) + ". " + inline(number.group(2)), STYLES["bullet"]))
            i += 1
            continue
        if line.startswith(">"):
            result.append(Paragraph(inline(line.lstrip("> ")), STYLES["body"]))
            i += 1
            continue
        if line == "---":
            result.append(Spacer(1, 9))
            i += 1
            continue
        # Join wrapped prose lines until a structural boundary.
        para = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r"^(#|[-*] |\d+\. |\||```|>)", lines[i].strip()):
            para.append(lines[i].strip())
            i += 1
        result.append(Paragraph(inline(" ".join(para)), STYLES["body"]))
    return result


class Cover(Flowable):
    def __init__(self, title: str, subtitle: str, number: str):
        super().__init__()
        self.title, self.subtitle, self.number = title, subtitle, number
        self.width, self.height = PAGE_W - 100, PAGE_H - 116

    def draw(self):
        c = self.canv
        c.setFillColor(DEEP)
        c.rect(-50, -58, PAGE_W, PAGE_H, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor("#3c6d70"))
        c.setLineWidth(.7)
        base_x, base_y = 65, 178
        for i in range(9):
            x = base_x + (i % 3) * 70
            y = base_y + (i // 3) * 70
            c.circle(x, y, 18 if i == 4 else 12, fill=0, stroke=1)
            c.circle(x, y, 3, fill=0, stroke=1)
            if i % 3 < 2:
                c.line(x + 19, y, x + 51, y)
            if i < 6:
                c.line(x, y + 19, x, y + 51)
        c.setFillColor(colors.HexColor("#8bc9bd"))
        c.setFont("ArialBold", 10)
        c.drawString(10, self.height - 29, "AQIONCLOUD  /  ETHIKCORP")
        c.setFont("ArialU", 9)
        c.setFillColor(colors.HexColor("#a8c4bf"))
        c.drawString(10, self.height - 52, "BUSINESS SUPERBRAIN")
        y = self.height - 148
        c.setFillColor(WHITE)
        for part in self.title.split(" / "):
            words = part.split()
            current = ""
            for word in words:
                candidate = (current + " " + word).strip()
                if pdfmetrics.stringWidth(candidate, "ArialBold", 31) > PAGE_W - 120 and current:
                    c.setFont("ArialBold", 31); c.drawString(10, y, current); y -= 40; current = word
                else:
                    current = candidate
            if current:
                c.setFont("ArialBold", 31); c.drawString(10, y, current); y -= 42
        c.setFillColor(colors.HexColor("#bcd5cf"))
        c.setFont("ArialU", 11)
        for line in [self.subtitle[i:i+75] for i in range(0, len(self.subtitle), 75)]:
            c.drawString(10, y - 13, line); y -= 17
        c.setStrokeColor(colors.HexColor("#4e7778"))
        c.line(10, 67, self.width - 10, 67)
        c.setFillColor(colors.HexColor("#9fc4bc"))
        c.setFont("ArialU", 8)
        c.drawString(10, 48, "RESEARCH AND DESIGN  /  18 OCTOBER 2026")
        c.drawRightString(self.width - 10, 48, self.number)


def on_body_page(canvas, doc):
    if doc.page == 1:
        return
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(.5)
    canvas.line(50, PAGE_H - 47, PAGE_W - 50, PAGE_H - 47)
    canvas.setFont("ArialBold", 7.5)
    canvas.setFillColor(TEAL)
    canvas.drawString(50, PAGE_H - 36, "SUPERBRAIN  /  ETHIKCORP")
    canvas.setFont("ArialU", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(PAGE_W - 50, PAGE_H - 36, doc.short_title)
    canvas.line(50, 46, PAGE_W - 50, 46)
    canvas.drawString(50, 32, "Research and design draft  •  18 October 2026")
    canvas.drawRightString(PAGE_W - 50, 32, f"{doc.page}")
    canvas.restoreState()


class ReportDoc(BaseDocTemplate):
    def __init__(self, filename, short_title):
        super().__init__(filename, pagesize=A4, leftMargin=50, rightMargin=50, topMargin=65, bottomMargin=60)
        self.short_title = short_title
        frame = Frame(50, 58, PAGE_W - 100, PAGE_H - 116, leftPadding=0, bottomPadding=0, rightPadding=0, topPadding=0)
        self.addPageTemplates(PageTemplate(id="body", frames=[frame], onPage=on_body_page))


def build_document(filename: str, title: str, subtitle: str, number: str, compact: bool = False):
    global TABLE_PADDING
    source = ROOT / filename
    output = OUT / source.with_suffix(".pdf").name
    text = source.read_text(encoding="utf-8")
    previous = {key: (style.spaceBefore, style.spaceAfter, style.leading) for key, style in STYLES.items()}
    if compact:
        TABLE_PADDING = 3.5
        for key, style in STYLES.items():
            style.spaceBefore *= .75
            style.spaceAfter *= .65
            if key in ("body", "bullet"):
                style.leading = 13
    try:
        story = [Cover(title, subtitle, number), PageBreak()]
        story += parse_markdown(text)
        ReportDoc(str(output), title[:43]).build(story)
    finally:
        TABLE_PADDING = 5
        for key, (before, after, leading) in previous.items():
            STYLES[key].spaceBefore, STYLES[key].spaceAfter, STYLES[key].leading = before, after, leading
    print(output)


def build_visual_canvas():
    from reportlab.pdfgen import canvas
    output = OUT / "SUPERBRAIN_DESIGN_PHILOSOPHY.pdf"
    c = canvas.Canvas(str(output), pagesize=A4)
    c.setFillColor(DEEP); c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#e9f8f4"))
    c.setFont("ArialBold", 29); c.drawString(54, PAGE_H - 105, "Measured Signal")
    c.setFont("ArialU", 9); c.setFillColor(colors.HexColor("#a5c3bd"))
    c.drawString(55, PAGE_H - 124, "NINE INTERVALS  /  ONE VERIFIED FIELD")
    origin_x, origin_y = 95, 250
    coords = [(origin_x + (i % 3) * 165, origin_y + (i // 3) * 145) for i in range(9)]
    c.setLineWidth(1.1)
    c.setStrokeColor(colors.HexColor("#4e807e"))
    for i, (x,y) in enumerate(coords):
        if i % 3 < 2:
            c.line(x + 27, y, x + 138, y)
        if i < 6:
            c.line(x, y + 27, x, y + 118)
    for i, (x,y) in enumerate(coords):
        c.setStrokeColor(colors.HexColor("#7bc7b9") if i in (0,4,8) else colors.HexColor("#5d8886"))
        c.setLineWidth(2 if i == 4 else 1)
        c.circle(x, y, 24 if i == 4 else 18, stroke=1, fill=0)
        c.setFillColor(colors.HexColor("#a0d6c9") if i in (0,4,8) else colors.HexColor("#567b7b"))
        c.circle(x, y, 4, stroke=0, fill=1)
        c.setFont("ArialU", 7); c.setFillColor(colors.HexColor("#9fc2ba"))
        c.drawString(x - 9, y - 39, f"{i+1:02d}")
    c.setStrokeColor(colors.HexColor("#587c79")); c.line(55, 105, PAGE_W - 55, 105)
    c.setFillColor(colors.HexColor("#b2d0c8")); c.setFont("ArialU", 8)
    c.drawString(55, 83, "SPACE  /  PROVENANCE  /  CONTROL")
    c.drawRightString(PAGE_W - 55, 83, "AQIONCLOUD")
    c.showPage()
    c.setFillColor(WHITE); c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(TEAL); c.setFont("ArialBold", 8)
    c.drawString(55, PAGE_H - 54, "DESIGN PHILOSOPHY  /  MEASURED SIGNAL")
    c.setStrokeColor(LINE); c.line(55, PAGE_H - 64, PAGE_W - 55, PAGE_H - 64)
    c.setFillColor(INK); c.setFont("ArialBold", 22)
    c.drawString(55, PAGE_H - 110, "Measured Signal")
    prose = (ROOT / "SUPERBRAIN_DESIGN_PHILOSOPHY.md").read_text(encoding="utf-8").split("\n\n")[1:]
    y = PAGE_H - 145
    for paragraph in prose:
        item = Paragraph(inline(paragraph.replace("\n", " ")), STYLES["body"])
        width, height = item.wrap(PAGE_W - 110, PAGE_H)
        item.drawOn(c, 55, y - height)
        y -= height + 18
    c.setStrokeColor(LINE); c.line(55, 58, PAGE_W - 55, 58)
    c.setFillColor(MUTED); c.setFont("ArialU", 8)
    c.drawString(55, 43, "Research and design draft  •  17 October 2026")
    c.drawRightString(PAGE_W - 55, 43, "2")
    c.showPage(); c.save()
    print(output)


if __name__ == "__main__":
    build_document("BUSINESS_SUPERBRAIN_SPEC.md", "AqionCloud Business Superbrain", "Ethikcorp pilot specification and UAE deployment decision", "01 / 04")
    build_document("TECHNICAL_COMPARISON_APPENDIX.md", "Technical Comparison", "Fifteen business brain products reviewed on a common structure", "02 / 04")
    build_document("ETHIKCORP_TEST_PLAN.md", "Ethikcorp Test Plan", "Proposed access and answer-quality evaluation protocol", "03 / 04")
    build_document("SUPERBRAIN_PM_GUIDE.md", "Superbrain PM Guide", "Nine-stage creation workspace and GitHub source handoff", "04 / 04")
    build_visual_canvas()
