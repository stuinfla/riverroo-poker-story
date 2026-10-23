from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import shutil
p=Path('public'); dest=Path('/Users/stuartkerr/Documents/RiverRoo');dest.mkdir(exist_ok=True)
with ZipFile(p/'RiverRoo-Presentation.zip','w',ZIP_DEFLATED) as z:
 for f in p.rglob('*'):
  if f.is_file() and f.suffix!='.zip':
   if f.name=='index.html':
    content=f.read_text().replace('href="/','href="').replace('src="/','src="')
    z.writestr('index.html',content)
   else:z.write(f,f.relative_to(p))
shutil.copy2(p/'RiverRoo-Presentation.zip',dest/'RiverRoo-Presentation.zip')
shutil.copy2(p/'Presenter-Notes.txt',dest/'Presenter-Notes.txt')
(dest/'RiverRoo-Presentation.html').write_text((p/'index.html').read_text().replace('href="/','href="https://riverroo-poker-story.vercel.app/'))
print('Offline ZIP and standalone HTML saved in Documents/RiverRoo.')
