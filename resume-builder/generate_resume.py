#!/usr/bin/env python3
"""
Main script to generate both DOCX and PDF resume files.
"""
import os
import sys
import shutil
import subprocess
import time
from build_resume import build

def convert_with_libreoffice(docx_path):
    """Convert DOCX to PDF using LibreOffice command line."""
    print('📝 Converting DOCX to PDF with LibreOffice...')
    
    output_dir = os.path.dirname(docx_path)
    
    try:
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
            raise Exception(f'LibreOffice error: {result.stderr}')
        
        time.sleep(0.5)  # Wait for file write
        
        pdf_path = docx_path.replace('.docx', '.pdf')
        if os.path.exists(pdf_path):
            return pdf_path
        else:
            raise Exception('PDF file was not created')
            
    except Exception as e:
        raise Exception(f'LibreOffice conversion failed: {e}')

def main():
    print('🚀 Generating resume...\n')
    
    # Generate DOCX
    docx_path = build()
    print(f'📄 DOCX created: {docx_path}\n')
    
    # Convert to PDF
    try:
        pdf_path = convert_with_libreoffice(docx_path)
        print(f'✅ PDF created: {pdf_path}\n')
        
        # Copy to public folder
        public_pdf = os.path.join(
            os.path.dirname(__file__), 
            '..', 
            'public', 
            'Omid-Zanganeh-Resume.pdf'
        )
        shutil.copy2(pdf_path, public_pdf)
        print(f'📁 Copied to: {public_pdf}\n')
        print('✨ Resume generation complete!')
        
    except Exception as e:
        print(f'❌ Error during PDF conversion: {e}')
        print('    DOCX file has been created successfully.')
        print('    Run convert_to_pdf.py separately or manually convert.')
        return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
