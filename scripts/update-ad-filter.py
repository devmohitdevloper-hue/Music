"""Bundle maintained hosts data, retaining upstream attribution and license."""
from pathlib import Path
import urllib.request,hashlib,json,datetime
root=Path(__file__).resolve().parents[1]
url='https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts'
request=urllib.request.Request(url,headers={'User-Agent':'MovieSansar-build'})
with urllib.request.urlopen(request,timeout=45) as r:data=r.read().decode('utf-8')
lines=[s for s in data.splitlines() if s.startswith('0.0.0.0 ')]
assert len(lines)>10000,'Incomplete ad-hosts list; stop the build'
local=(root/'ad-hosts.txt').read_text()
(root/'ad-hosts.txt').write_text(local+'\n# Bundled upstream hosts follow; source attribution retained.\n'+data)
(root/'licenses').mkdir(exist_ok=True)
with urllib.request.urlopen('https://raw.githubusercontent.com/StevenBlack/hosts/master/license.txt',timeout=30) as r:(root/'licenses/StevenBlack-license.txt').write_bytes(r.read())
(root/'ad-filter-meta.json').write_text(json.dumps({'source':url,'generated':datetime.datetime.now(datetime.timezone.utc).isoformat(),'upstream_sha256':hashlib.sha256(data.encode()).hexdigest(),'host_lines':len(lines)},indent=2))
print('Bundled ad/malware hosts:',len(lines))
