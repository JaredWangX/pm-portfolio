"""Build compact card images; retain the original files for restaurant detail photos.

This changes encoding/size only. Existing manifest and credits describe the source images.
"""
from pathlib import Path
from PIL import Image, ImageOps
import json
ROOT=Path(__file__).resolve().parents[1]
sources=list((ROOT/'assets/wanso/catalog').glob('*.webp'))
sources += [ROOT/'assets/wanso/native'/name for name in ['order-moc.webp','order-quyen.webp']]
original_bytes=thumb_bytes=0
for source in sources:
    target=source.parent/'thumbs'/source.name
    target.parent.mkdir(exist_ok=True)
    with Image.open(source) as image:
        image=ImageOps.exif_transpose(image).convert('RGB')
        image.thumbnail((360,480),Image.Resampling.LANCZOS)
        image.save(target,'WEBP',quality=74,method=6)
    original_bytes+=source.stat().st_size
    thumb_bytes+=target.stat().st_size
print(json.dumps({'images':len(sources),'full_bytes':original_bytes,'card_bytes':thumb_bytes,'reduction_pct':round(100*(1-thumb_bytes/original_bytes),1)},indent=2))
