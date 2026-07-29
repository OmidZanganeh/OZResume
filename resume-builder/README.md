# Resume Builder

This directory contains the code to generate Omid Zanganeh's professional resume in DOCX and PDF formats.

## Structure

```
resume-builder/
├── build_resume.py        # Core resume generation logic
├── generate_resume.py     # Main script (builds DOCX + PDF)
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## Usage

### Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Generate resume (creates DOCX and PDF)
python generate_resume.py
```

The script will:
1. Generate `Omid Zanganeh - Resume v2.docx`
2. Convert it to `Omid Zanganeh - Resume v2.pdf`
3. Copy the PDF to `public/Omid-Zanganeh-Resume.pdf` (for the website)

### Requirements

- Python 3.8+
- `python-docx` - for DOCX generation
- `docx2pdf` - for PDF conversion (requires LibreOffice or MS Word)

### PDF Conversion Notes

**Linux:**
```bash
# Install LibreOffice (required for docx2pdf)
sudo apt-get install libreoffice
```

**macOS:**
```bash
# Install LibreOffice via Homebrew
brew install libreoffice
```

**Windows:**
- Either install LibreOffice from [libreoffice.org](https://www.libreoffice.org)
- Or the script will use MS Word if available

### Manual Conversion

If automatic PDF conversion fails, you can manually convert the DOCX file:

1. Open `Omid Zanganeh - Resume v2.docx` in Word or LibreOffice
2. Save/Export as PDF
3. Rename to `Omid-Zanganeh-Resume.pdf`
4. Copy to `../public/` directory

## Customization

To update resume content, edit `build_resume.py`:

- **Personal info:** Lines 105-125 (header section)
- **Summary:** Lines 128-135
- **Experience:** Lines 138-225
- **Education:** Lines 228-270
- **Skills:** Lines 273-305

### Style Variables

Color palette (lines 14-19):
- `BLACK` - Body text
- `NAVY` - Headings & section titles
- `TEAL` - Accent color (website link)
- `GRAY_DIM`, `GRAY_MID`, `GRAY_LIGHT` - Secondary text

### Output Location

Generated files are saved to:
- DOCX: `resume-builder/Omid Zanganeh - Resume v2.docx`
- PDF: `resume-builder/Omid Zanganeh - Resume v2.pdf`
- Website copy: `public/Omid-Zanganeh-Resume.pdf`

## Integration with Website

The website references the resume at `/Omid-Zanganeh-Resume.pdf` in:
- `app/page.tsx` - Main resume page PDF modal
- `app/components/RecruiterTour.tsx` - Recruiter tour PDF link
- `app/components/PdfModal.tsx` - PDF viewer component

After generating a new resume, commit both:
- The source code in `resume-builder/`
- The generated PDF in `public/`

## Dependencies

### python-docx
Creates and styles the DOCX document with:
- Custom margins and spacing
- Formatted text runs (bold, colors, sizes)
- Section headers with borders
- Bullet lists
- Tabs and alignment

### docx2pdf
Converts DOCX to PDF using:
- LibreOffice (Linux/macOS)
- MS Word COM automation (Windows)
