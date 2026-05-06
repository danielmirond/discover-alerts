# libros/

Aquí van los libros (zip / ePub / PDF / texto) para procesar.

## Workflow

1. **Subir libros**: copia el zip / ePub / PDF en esta carpeta.
2. **Si pesa < 100 MB**: `git add libros/<archivo> && git commit -m "Add libros" && git push`.
3. **Si pesa > 100 MB**: configurar Git LFS (`git lfs track "libros/*.zip"`) o subir trozos.
4. **Procesado por Claude**: una vez en el repo, hago `unzip`, extraigo texto (OCR si hace falta), busco pasajes y cito con paginación real en `docs/declaraciones-deportivas.xlsx`.

## Formatos soportados

- `.zip` (con cualquier formato dentro)
- `.epub` (descomprimido a HTML/XHTML)
- `.pdf` (extracción texto con pypdf, OCR si es escaneado)
- `.txt` / `.md` (directo)
- `.docx` (con python-docx)

## Procesado

```bash
# Extracción texto desde la carpeta
python3 tools/process-libros.py libros/<archivo>
```

## Privacidad

Si los libros son material con copyright y no quieres que queden públicos:
- Usar rama privada (no `main`)
- O añadir `libros/*.zip` a `.gitignore` global y subirlo a un fork privado.
