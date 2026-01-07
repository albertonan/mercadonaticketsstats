#!/usr/bin/env python3
"""
Script para leer todos los PDFs y concatenar su contenido en un archivo de texto.
"""

import subprocess
import sys
from pathlib import Path

# Instalar pypdf si no está disponible
try:
    from pypdf import PdfReader
except ImportError:
    print("📦 Instalando pypdf...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf", "-q"])
    from pypdf import PdfReader

# Configuración
SCRIPT_DIR = Path(__file__).parent
PDF_DIR = SCRIPT_DIR / "pdfs_extraidos"
OUTPUT_FILE = SCRIPT_DIR / "tickets_mercadona.txt"


def extract_text_from_pdf(pdf_path: Path) -> str:
    """
    Extrae el texto de un archivo PDF.
    
    Args:
        pdf_path: Ruta al archivo PDF
    
    Returns:
        Texto extraído del PDF
    """
    try:
        reader = PdfReader(pdf_path)
        text_parts = []
        
        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
        
        return "\n".join(text_parts)
    except Exception as e:
        return f"[Error leyendo PDF: {e}]"


def main():
    """Función principal."""
    print("=" * 60)
    print("📄 Concatenador de PDFs a Texto")
    print("=" * 60)
    
    # Verificar que existe el directorio de PDFs
    if not PDF_DIR.exists():
        print(f"\n❌ No se encontró el directorio: {PDF_DIR}")
        print("   Ejecuta primero extract_pdfs.py")
        return
    
    # Obtener lista de PDFs ordenados por nombre (que incluye la fecha)
    pdf_files = sorted(PDF_DIR.glob("*.pdf"))
    
    if not pdf_files:
        print(f"\n❌ No se encontraron archivos PDF en: {PDF_DIR}")
        return
    
    print(f"\n📁 Directorio de PDFs: {PDF_DIR}")
    print(f"📋 PDFs encontrados: {len(pdf_files)}")
    print(f"📝 Archivo de salida: {OUTPUT_FILE}")
    
    # Procesar cada PDF
    print("\n🔄 Procesando PDFs...")
    
    all_text = []
    processed = 0
    errors = 0
    
    for pdf_file in pdf_files:
        # Extraer texto
        text = extract_text_from_pdf(pdf_file)
        
        if text.startswith("[Error"):
            errors += 1
            print(f"  ✗ Error: {pdf_file.name}")
        else:
            processed += 1
            print(f"  ✓ {pdf_file.name}")
        
        # Agregar separador y contenido
        separator = "=" * 60
        header = f"\n{separator}\n📄 {pdf_file.name}\n{separator}\n"
        all_text.append(header + text)
    
    # Guardar archivo de texto
    OUTPUT_FILE.write_text("\n".join(all_text), encoding="utf-8")
    
    # Resumen
    print("\n" + "=" * 60)
    print(f"✅ Proceso completado!")
    print(f"   PDFs procesados: {processed}")
    if errors:
        print(f"   Errores: {errors}")
    print(f"   Archivo generado: {OUTPUT_FILE}")
    print(f"   Tamaño: {OUTPUT_FILE.stat().st_size / 1024:.1f} KB")
    print("=" * 60)


if __name__ == "__main__":
    main()
