from pathlib import Path
p = Path('index.html')
t = p.read_text(encoding='utf-8')
old = '      grid-template-columns: 1fr auto auto;'
new = '      grid-template-columns: minmax(0, 1fr) auto auto auto;'
if old not in t:
    print('Layout already fixed or anchor missing')
    raise SystemExit(0)
p.write_text(t.replace(old, new, 1), encoding='utf-8')
print('Fixed person row layout')
