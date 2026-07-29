#!/usr/bin/env python3
"""
Convert DOCX to PDF using LibreOffice command line.
"""
import os
import sys
import subprocess
import shutil
import time

def convert_docx_to_pdf(docx_path):
    """Convert DOCX to PDF using LibreOffice."""
    if not os.path.exists(docx_path):
        print(f'❌ Error: File not found: {docx_path}')
        return False
    
    print(f'📝 Converting {os.path.basename(docx_path)} to PDF...')
    
    output_dir = os.path.dirname(docx_path)
    
    try:
        # Run LibreOffice in headless mode to convert
        cmd = [
            'libreoffice',
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', output_dir,
            docx_path
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            print(f'❌ LibreOffice error: {result.stderr}')
            return False
        
        # Wait a moment for file to be written
        time.sleep(0.5)
        
        # Check if PDF was created
        pdf_path = docx_path.replace('.docx', '.pdf')
        if os.path.exists(pdf_path):
            print(f'✅ PDF created: {pdf_path}')
            return pdf_path
        else:
            print('❌ PDF file was not created')
            return False
            
    except subprocess.TimeoutExpired:
        print('❌ Conversion timed out')
        return False
    except Exception as e:
        print(f'❌ Conversion error: {e}')
        return False

def main():
    # Get DOCX path
    docx_path = os.path.join(
        os.path.dirname(__file__),
        'Omid Zanganeh - Resume v2.docx'
    )
    
    # Convert to PDF
    pdf_path = convert_docx_to_pdf(docx_path)
    
    if not pdf_path:
        return 1
    
    # Copy to public folder
    try:
        public_pdf = os.path.join(
            os.path.dirname(__file__),
            '..',
            'public',
            'Omid-Zanganeh-Resume.pdf'
        )
        shutil.copy2(pdf_path, public_pdf)
        print(f'📁 Copied to: {public_pdf}')
        print('\n✨ Resume PDF is ready for the website!')
        return 0
    except Exception as e:
        print(f'❌ Error copying to public folder: {e}')
        return 1

if __name__ == '__main__':
    sys.exit(main())
