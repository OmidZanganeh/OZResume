#!/usr/bin/env python3
"""
Resume builder for Omid Zanganeh
Generates a professional DOCX resume with modern styling.
"""
import os
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


# ── Color palette ─────────────────────────────────────────────────────────────
BLACK = RGBColor(0, 0, 0)
NAVY = RGBColor(0, 51, 102)
TEAL = RGBColor(0, 128, 128)
GRAY_DIM = RGBColor(100, 100, 100)
GRAY_MID = RGBColor(80, 80, 80)
GRAY_LIGHT = RGBColor(150, 150, 150)


# ── Helper functions ──────────────────────────────────────────────────────────
def set_para_spacing(para, before=0, after=0, line_spacing=None):
    """Set paragraph spacing in twips (1/20 of a point)."""
    pPr = para._p.get_or_add_pPr()
    spacing = OxmlElement('w:spacing')
    spacing.set(qn('w:before'), str(before))
    spacing.set(qn('w:after'), str(after))
    if line_spacing:
        spacing.set(qn('w:line'), str(line_spacing))
        spacing.set(qn('w:lineRule'), 'auto')
    pPr.append(spacing)


def add_run(para, text, bold=False, size=None, color=None):
    """Add a formatted run to a paragraph."""
    run = para.add_run(text)
    if bold:
        run.bold = True
    if size:
        run.font.size = Pt(size)
    if color:
        run.font.color.rgb = color
    return run


def section_header(doc, text):
    """Add a section header with border."""
    p = doc.add_paragraph()
    set_para_spacing(p, before=160, after=80)
    run = add_run(p, text, bold=True, size=12, color=NAVY)
    
    # Add bottom border
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '8')
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), '003366')
    pBdr.append(bottom)
    pPr.append(pBdr)


def para_border_bottom(para, color='CCCCCC', size=4):
    """Add bottom border to paragraph."""
    pPr = para._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), str(size))
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), color)
    pBdr.append(bottom)
    pPr.append(pBdr)


def skill_chips_para(doc, label, items):
    """Add a skill group with chips layout."""
    p = doc.add_paragraph()
    set_para_spacing(p, before=40, after=40)
    add_run(p, f'{label}: ', bold=True, size=9.5, color=NAVY)
    add_run(p, ' • '.join(items), size=9, color=BLACK)


def build():
    """Build the complete resume document."""
    doc = Document()
    
    # Set narrow margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.5)
        section.bottom_margin = Inches(0.5)
        section.left_margin = Inches(0.6)
        section.right_margin = Inches(0.6)
    
    # ── HEADER ────────────────────────────────────────────────────────────────
    p = doc.add_paragraph()
    set_para_spacing(p, before=0, after=20)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p, 'OMID ZANGANEH', bold=True, size=18, color=NAVY)
    
    p2 = doc.add_paragraph()
    set_para_spacing(p2, before=0, after=100)
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p2, 'GIS Developer & Spatial Data Analyst', size=11, color=TEAL)
    
    # Contact info
    p3 = doc.add_paragraph()
    set_para_spacing(p3, before=0, after=100)
    p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p3, '📧 ', size=9)
    add_run(p3, 'contact@omidzanganeh.com', size=9, color=BLACK)
    add_run(p3, '  |  ', size=9, color=GRAY_LIGHT)
    add_run(p3, '🌐 ', size=9)
    add_run(p3, 'omidzanganeh.com', size=9, color=TEAL)
    add_run(p3, '  |  ', size=9, color=GRAY_LIGHT)
    add_run(p3, '📍 ', size=9)
    add_run(p3, 'London, ON, Canada', size=9, color=BLACK)
    
    # ── PROFESSIONAL SUMMARY ──────────────────────────────────────────────────
    section_header(doc, 'Professional Summary')
    
    p = doc.add_paragraph()
    set_para_spacing(p, before=0, after=80)
    add_run(p, 'GIS Developer and Spatial Data Analyst with 8+ years of experience in geospatial analysis, '
            'remote sensing, and custom GIS tool development. Expertise in Python, ArcGIS Pro SDK, and web-based '
            'mapping applications. Proven track record of delivering innovative solutions for telecom network design, '
            'environmental monitoring, and automated spatial analysis workflows.', 
            size=9.5, color=BLACK)
    
    # ── PROFESSIONAL EXPERIENCE ──────────────────────────────────────────────
    section_header(doc, 'Professional Experience')
    
    # Job 1: GIS Developer
    p = doc.add_paragraph()
    set_para_spacing(p, before=60, after=0)
    add_run(p, 'GIS Developer', bold=True, size=10, color=NAVY)
    add_run(p, '\t', size=10)
    add_run(p, 'May 2022 – Present', size=9, color=GRAY_MID)
    pPr = p._p.get_or_add_pPr()
    tabs = OxmlElement('w:tabs')
    tab = OxmlElement('w:tab')
    tab.set(qn('w:val'), 'right')
    tab.set(qn('w:pos'), '9072')
    tabs.append(tab)
    pPr.append(tabs)
    
    p2 = doc.add_paragraph()
    set_para_spacing(p2, before=0, after=40)
    add_run(p2, 'Rogers Communications Inc., London, ON', size=9.5, color=GRAY_MID)
    
    achievements = [
        'Developed 25+ custom ArcGIS Pro tools using Python and C# .NET, automating complex geospatial workflows '
        'and reducing manual processing time by 80%',
        'Built an enterprise FTTH network designer tool that generates optimized fiber routes, calculates material '
        'requirements, and produces construction-ready maps, serving 150+ users',
        'Created automated bore profile generators that integrate civil engineering data with GIS, processing '
        '500+ profiles monthly with 95% accuracy',
        'Designed and deployed web-based GIS tools using Next.js, React, and Leaflet for field data collection '
        'and real-time mapping',
        'Implemented AI-powered object detection pipelines using YOLO and OpenCV for automated feature extraction '
        'from aerial and street-level imagery',
        'Engineered ETL processes for enterprise spatial databases (SQL Server, PostgreSQL) handling millions '
        'of records with spatial indexes and optimized queries',
    ]
    
    for achievement in achievements:
        p = doc.add_paragraph(style='List Bullet')
        set_para_spacing(p, before=20, after=20)
        add_run(p, achievement, size=9, color=BLACK)
    
    # Job 2: GIS Analyst
    p = doc.add_paragraph()
    set_para_spacing(p, before=60, after=0)
    add_run(p, 'GIS Analyst', bold=True, size=10, color=NAVY)
    add_run(p, '\t', size=10)
    add_run(p, 'September 2020 – May 2022', size=9, color=GRAY_MID)
    pPr = p._p.get_or_add_pPr()
    tabs = OxmlElement('w:tabs')
    tab = OxmlElement('w:tab')
    tab.set(qn('w:val'), 'right')
    tab.set(qn('w:pos'), '9072')
    tabs.append(tab)
    pPr.append(tabs)
    
    p2 = doc.add_paragraph()
    set_para_spacing(p2, before=0, after=40)
    add_run(p2, 'Rogers Communications Inc., London, ON', size=9.5, color=GRAY_MID)
    
    achievements2 = [
        'Performed spatial analysis for telecom network expansion projects, identifying optimal service areas '
        'and infrastructure placement using advanced geoprocessing techniques',
        'Developed Python scripts for automated data validation and quality control, reducing errors by 70%',
        'Created interactive dashboards and maps for executive reporting using ArcGIS Online and Tableau',
        'Managed enterprise geodatabase schemas and implemented version control workflows for multi-user editing',
    ]
    
    for achievement in achievements2:
        p = doc.add_paragraph(style='List Bullet')
        set_para_spacing(p, before=20, after=20)
        add_run(p, achievement, size=9, color=BLACK)
    
    # Job 3: Remote Sensing Specialist
    p = doc.add_paragraph()
    set_para_spacing(p, before=60, after=0)
    add_run(p, 'Remote Sensing Specialist', bold=True, size=10, color=NAVY)
    add_run(p, '\t', size=10)
    add_run(p, 'January 2017 – August 2020', size=9, color=GRAY_MID)
    pPr = p._p.get_or_add_pPr()
    tabs = OxmlElement('w:tabs')
    tab = OxmlElement('w:tab')
    tab.set(qn('w:val'), 'right')
    tab.set(qn('w:pos'), '9072')
    tabs.append(tab)
    pPr.append(tabs)
    
    p2 = doc.add_paragraph()
    set_para_spacing(p2, before=0, after=40)
    add_run(p2, 'Iranian Space Agency, Tehran', size=9.5, color=GRAY_MID)
    
    achievements3 = [
        'Processed and analyzed satellite imagery (Landsat, Sentinel-2, MODIS) for land cover classification, '
        'change detection, and environmental monitoring across 50,000+ km² study areas',
        'Developed automated image processing workflows using Google Earth Engine and Python, reducing '
        'processing time from weeks to hours',
        'Conducted spectral analysis and supervised classification for agricultural mapping, achieving 92% accuracy',
        'Collaborated with environmental scientists on climate impact studies, providing geospatial analysis '
        '& environmental justice.',
    ]
    
    for achievement in achievements3:
        p = doc.add_paragraph(style='List Bullet')
        set_para_spacing(p, before=20, after=20)
        add_run(p, achievement, size=9, color=BLACK)
    
    # ── EDUCATION ─────────────────────────────────────────────────────────────
    section_header(doc, 'Education')
    
    # MS
    p = doc.add_paragraph()
    set_para_spacing(p, before=60, after=0)
    add_run(p, 'Master of Science, Remote Sensing and GIS', bold=True, size=10, color=NAVY)
    add_run(p, '\t', size=10)
    add_run(p, 'September 2019', size=9, color=GRAY_MID)
    pPr = p._p.get_or_add_pPr()
    tabs = OxmlElement('w:tabs')
    tab = OxmlElement('w:tab')
    tab.set(qn('w:val'), 'right')
    tab.set(qn('w:pos'), '9072')
    tabs.append(tab)
    pPr.append(tabs)
    
    p2 = doc.add_paragraph()
    set_para_spacing(p2, before=0, after=20)
    add_run(p2, 'K. N. Toosi University of Technology, Tehran', size=9.5, color=GRAY_MID)
    
    p3 = doc.add_paragraph()
    set_para_spacing(p3, before=0, after=40)
    add_run(p3, 'Thesis: Multi-temporal analysis of urban heat islands using thermal remote sensing '
        '& environmental justice.', size=9, color=BLACK)
    
    # BS
    p = doc.add_paragraph()
    set_para_spacing(p, before=60, after=0)
    add_run(p, 'Bachelor of Science, Geomatics (Surveying) Engineering',
            bold=True, size=10, color=NAVY)
    add_run(p, '\t', size=10)
    add_run(p, 'August 2016', size=9, color=GRAY_MID)
    pPr = p._p.get_or_add_pPr()
    tabs = OxmlElement('w:tabs')
    tab = OxmlElement('w:tab')
    tab.set(qn('w:val'), 'right')
    tab.set(qn('w:pos'), '9072')
    tabs.append(tab)
    pPr.append(tabs)
    
    p2 = doc.add_paragraph()
    set_para_spacing(p2, before=0, after=40)
    add_run(p2, 'Geomatics College of National Cartographic Center (GCNCC), Tehran',
            size=9.5, color=GRAY_MID)
    
    # ── TECHNICAL SKILLS ──────────────────────────────────────────────────────
    section_header(doc, 'Technical Skills')
    
    skill_groups = [
        ('Languages & Frameworks',
         ['Python', 'C# / .NET', 'SQL', 'TypeScript', 'JavaScript', 'HTML/CSS',
          'React', 'Next.js', 'WPF']),
        ('GIS & Spatial',
         ['ArcGIS Pro', 'ArcGIS Pro SDK', 'ArcPy', 'Python Toolboxes (.pyt)',
          'ArcGIS Online', 'ArcGIS Enterprise', 'QGIS', 'Geoprocessing',
          'Network Analysis', 'Remote Sensing', 'Google Earth Engine']),
        ('AI / ML',
         ['Azure OpenAI', 'Azure AI Foundry', 'Google AI Studio / Gemini',
          'YOLO', 'OpenCV', 'Prompt Engineering', 'Web Grounding',
          'Batch Classification Pipelines']),
        ('Data & Backend',
         ['SQL Server', 'Supabase', 'PostgreSQL', 'pyodbc',
          'ETL Pipelines', 'Spatial Types (GEOMETRY/GEOGRAPHY)', 'Smartsheet API']),
        ('Web & Cloud',
         ['Next.js App Router', 'Vite', 'Leaflet', 'Vercel',
          'REST APIs', 'PWA', 'Microsoft Azure', 'Google Cloud']),
        ('Desktop & Tooling',
         ['CustomTkinter', 'PyInstaller', 'Playwright', 'Matplotlib',
          'AutoCAD', 'ENVI', 'SNAP', 'Photomod', 'Tableau',
          'Adobe Photoshop', 'Adobe Illustrator']),
        ('Languages',
         ['English (Fluent)', 'Persian (Native)']),
    ]
    
    for label, items in skill_groups:
        skill_chips_para(doc, label, items)
    
    # ── FOOTER ────────────────────────────────────────────────────────────────
    p = doc.add_paragraph()
    set_para_spacing(p, before=120, after=0)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    para_border_bottom(p, color='CCCCCC', size=4)
    
    p2 = doc.add_paragraph()
    set_para_spacing(p2, before=40, after=0)
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p2,
        'For project write-ups, live GIS tools, and demos: ',
        size=8.5, color=GRAY_DIM)
    add_run(p2, 'omidzanganeh.com', bold=True, size=8.5, color=TEAL)
    
    # ── SAVE ──────────────────────────────────────────────────────────────────
    out_path = os.path.join(os.path.dirname(__file__), 'Omid Zanganeh - Resume v2.docx')
    doc.save(out_path)
    print(f'✅ Saved: {out_path}')
    return out_path


if __name__ == '__main__':
    build()
