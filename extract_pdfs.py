#!/usr/bin/env python3
"""
Script para extraer PDFs de archivos .eml contenidos en archivos ZIP.
"""

import os
import zipfile
import email
from email import policy
from pathlib import Path

# Configuración
SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR / "pdfs_extraidos"
ZIP_FILES = list(SCRIPT_DIR.glob("*.zip"))


def extract_pdfs_from_eml(eml_content: bytes, output_dir: Path, prefix: str = "") -> list[str]:
    """
    Extrae todos los PDFs adjuntos de un archivo .eml.
    
    Args:
        eml_content: Contenido del archivo .eml en bytes
        output_dir: Directorio donde guardar los PDFs
        prefix: Prefijo para el nombre del archivo (evita colisiones)
    
    Returns:
        Lista de nombres de archivos PDF extraídos
    """
    extracted = []
    
    # Parsear el email
    msg = email.message_from_bytes(eml_content, policy=policy.default)
    
    # Recorrer todas las partes del email
    for part in msg.walk():
        content_type = part.get_content_type()
        filename = part.get_filename()
        
        # Buscar adjuntos PDF
        if content_type == "application/pdf" or (filename and filename.lower().endswith(".pdf")):
            if filename:
                # Limpiar nombre de archivo
                safe_filename = "".join(c for c in filename if c.isalnum() or c in "._- ")
                if prefix:
                    safe_filename = f"{prefix}_{safe_filename}"
                
                # Evitar sobrescribir archivos existentes
                output_path = output_dir / safe_filename
                counter = 1
                while output_path.exists():
                    name, ext = os.path.splitext(safe_filename)
                    output_path = output_dir / f"{name}_{counter}{ext}"
                    counter += 1
                
                # Guardar el PDF
                payload = part.get_payload(decode=True)
                if payload:
                    output_path.write_bytes(payload)
                    extracted.append(output_path.name)
                    print(f"  ✓ Extraído: {output_path.name}")
    
    return extracted


def process_zip_file(zip_path: Path, output_dir: Path) -> int:
    """
    Procesa un archivo ZIP y extrae los PDFs de todos los .eml que contiene.
    
    Args:
        zip_path: Ruta al archivo ZIP
        output_dir: Directorio donde guardar los PDFs
    
    Returns:
        Número de PDFs extraídos
    """
    total_extracted = 0
    
    print(f"\n📦 Procesando: {zip_path.name}")
    
    with zipfile.ZipFile(zip_path, 'r') as zf:
        # Buscar archivos .eml en el ZIP
        eml_files = [f for f in zf.namelist() if f.lower().endswith('.eml')]
        print(f"   Encontrados {len(eml_files)} archivos .eml")
        
        for eml_name in eml_files:
            # Crear prefijo único basado en el nombre del .eml
            prefix = Path(eml_name).stem[:20]  # Primeros 20 caracteres
            
            # Leer el contenido del .eml
            eml_content = zf.read(eml_name)
            
            # Extraer PDFs
            extracted = extract_pdfs_from_eml(eml_content, output_dir, prefix)
            total_extracted += len(extracted)
    
    return total_extracted


def main():
    """Función principal."""
    print("=" * 60)
    print("🔍 Extractor de PDFs desde archivos EML en ZIPs")
    print("=" * 60)
    
    # Crear directorio de salida
    OUTPUT_DIR.mkdir(exist_ok=True)
    print(f"\n📁 Directorio de salida: {OUTPUT_DIR}")
    
    # Verificar que hay archivos ZIP
    if not ZIP_FILES:
        print("\n❌ No se encontraron archivos ZIP en el directorio.")
        return
    
    print(f"\n📋 Archivos ZIP encontrados: {len(ZIP_FILES)}")
    for zf in ZIP_FILES:
        print(f"   - {zf.name}")
    
    # Procesar cada ZIP
    total_pdfs = 0
    for zip_file in ZIP_FILES:
        count = process_zip_file(zip_file, OUTPUT_DIR)
        total_pdfs += count
    
    # Resumen
    print("\n" + "=" * 60)
    print(f"✅ Proceso completado!")
    print(f"   Total de PDFs extraídos: {total_pdfs}")
    print(f"   Ubicación: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
