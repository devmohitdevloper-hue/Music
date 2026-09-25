"""Exercise real APK navigation on an emulator and capture screens for review."""
import pathlib,re,subprocess,time,xml.etree.ElementTree as ET
out=pathlib.Path('qa');out.mkdir(exist_ok=True)
pkg='com.kud.music.dev'
def adb(*args,check=True):
 result=subprocess.run(['adb',*args],capture_output=True,timeout=90)
 if check and result.returncode:
  diagnostic=result.stdout.decode(errors='replace')+result.stderr.decode(errors='replace')
  (out/'adb-failure.txt').write_text(diagnostic)
  print(diagnostic,flush=True)
  result.check_returncode()
 return result.stdout

def dump():
 adb('shell','uiautomator','dump','/sdcard/kud-window.xml')
 raw=adb('shell','cat','/sdcard/kud-window.xml').decode()
 return ET.fromstring(raw),raw

def capture(name,expected):
 time.sleep(3)
 root,raw=dump()
 (out/(name+'.xml')).write_text(raw)
 (out/(name+'.png')).write_bytes(adb('exec-out','screencap','-p'))
 assert expected in raw, f'{name}: missing {expected}'
 assert adb('shell','pidof',pkg).strip(), 'App process exited'
 return root

def tap(label):
 root,_=dump()
 nodes=[n for n in root.iter('node') if n.get('text')==label or n.get('content-desc')==label]
 assert nodes, f'Control missing: {label}'
 # Navigation labels are the lowest matching nodes.
 node=max(nodes,key=lambda n: int(re.findall(r'\d+',n.get('bounds'))[1]))
 x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
 adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
 time.sleep(2)

adb('logcat','-c')
apk=next(pathlib.Path('app/build/outputs/apk/dev/debug').glob('*x86_64*.apk'))
adb('install','-r',str(apk))
for permission in ['POST_NOTIFICATIONS','READ_MEDIA_AUDIO']:
 adb('shell','pm','grant',pkg,'android.permission.'+permission,check=False)
adb('shell','am','start','-W','-n',pkg+'/com.music.bitchord.MainActivity')
time.sleep(12)
capture('01-home','Find your next favourite.')
tap('Search');capture('02-search','What moves you?')
tap('Chill & focus');capture('03-query','lofi chill')
tap('Library');capture('04-library','Keep it close.')
tap('Downloads');capture('05-downloads','Downloads')
adb('shell','input','keyevent','4');time.sleep(2)
tap('Explore');capture('06-explore','Follow your mood.')
tap('Home')
adb('shell','settings','put','system','font_scale','1.3')
time.sleep(4);capture('07-home-large-text','Find your next favourite.')
adb('shell','settings','put','system','font_scale','1.0')
logs=adb('logcat','-d','-s','AndroidRuntime:E').decode()
(out/'runtime.log').write_text(logs)
assert 'FATAL EXCEPTION' not in logs, 'Runtime crash detected'
(out/'result.txt').write_text('PASS: APK launch, Home, Search, mood query, Library, Downloads, Explore, and large-text Home. No fatal runtime exceptions. Live streaming not verified.\n')
print((out/'result.txt').read_text())
