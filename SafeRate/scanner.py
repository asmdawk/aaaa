"""Offline source inspection. Submitted code is never imported or executed."""
import ast
import hashlib
import io
import json
import re
import zipfile
from pathlib import PurePosixPath

MAX_UPLOAD = 15 * 1024 * 1024
MAX_EXPANDED = 30 * 1024 * 1024
MAX_FILE = 2 * 1024 * 1024
MAX_ENTRIES = 300
EXTENSIONS = {'.py','.js','.ts','.jsx','.tsx','.html','.php','.sh','.bash','.ps1','.go','.rb','.java','.cs','.c','.cpp','.json','.yaml','.yml','.toml','.txt','.sql','.env','.dockerfile'}
RULES = [
 ('dynamic-code','high',r'\b(eval|exec|Function)\s*\(', 'Динамическое выполнение кода. Проверьте происхождение входных данных.'),
 ('shell','high',r'\b(os\.system|subprocess\.(?:run|Popen|call)|child_process|shell_exec|passthru|Invoke-Expression)\b|\bexec\s*\(', 'Запуск команд или процессов. Проверьте аргументы и возможность инъекции.'),
 ('download-execute','critical',r'(curl|wget).{0,180}\|\s*(sh|bash|python)|DownloadString\s*\(|\bIEX\b', 'Возможна загрузка и немедленное выполнение удалённого содержимого.'),
 ('credentials-access','high',r'\.ssh[/\\]|id_rsa|Login Data|Cookies.sqlite|\.aws[/\\]credentials|/etc/shadow|wallet\.dat', 'Доступ к файлам с ключами, паролями или кошельками.'),
 ('network','info',r'https?://|\b(fetch|requests\.(?:post|get)|socket\.connect|XMLHttpRequest)\s*\(', 'Сетевой адрес или запрос. Проверьте получателя и отправляемые данные.'),
 ('obfuscation','medium',r'\b(atob|b64decode|fromCharCode|FromBase64String)\s*\(|(?:\\x[0-9a-fA-F]{2}){8,}', 'Кодирование или обфускация. Может скрывать исполняемый код.'),
 ('persistence','high',r'CurrentVersion\\Run|schtasks\b|crontab\b|LaunchAgents|systemctl\s+enable', 'Настройка автозапуска или постоянного присутствия.'),
 ('destructive','critical',r'rm\s+-[rf]{1,2}\s+/|shutil\.rmtree\s*\(|format\s+[cC]:|Remove-Item.{0,100}-Recurse', 'Удаление данных. Проверьте путь, условия и подтверждение операции.'),
 ('tls-disabled','high',r'verify\s*=\s*False|rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*[\"\x27]?0', 'Отключена проверка сертификатов TLS.'),
 ('unsafe-deserialization','high',r'pickle\.loads?\s*\(|yaml\.load\s*\(|unserialize\s*\(', 'Десериализация может выполнить код при недоверенном вводе.'),
 ('secret','high',r'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\b\d{8,12}:[A-Za-z0-9_-]{35}\b', 'Возможный секрет. Значение скрыто; при подтверждении отзовите его.'),
 ('credential-literal','medium',r'(?i)\b(?:api_key|password|secret|access_token)\s*[:=]\s*[\"\x27][^\"\x27\s]{8,}[\"\x27]', 'Возможный секрет в исходном коде. Значение не включено в отчёт.'),
 ('install-hook','high',r'[\"](?:preinstall|postinstall|prepare)[\"]\s*:', 'Скрипт жизненного цикла пакета. Прочитайте его перед установкой зависимостей.'),
 ('html-injection','medium',r'\.innerHTML\s*=|document\.write\s*\(|dangerouslySetInnerHTML', 'HTML-вставка: недоверенные данные могут привести к XSS.'),
]
COMPILED = [(a,b,re.compile(c,re.I),d) for a,b,c,d in RULES]

class ScanError(ValueError): pass

def files_from_upload(name, data):
 if len(data)>MAX_UPLOAD: raise ScanError('Файл больше 15 МиБ.')
 if name.lower().endswith('.zip'):
  try:
   with zipfile.ZipFile(io.BytesIO(data)) as z:
    entries=z.infolist()
    if len(entries)>MAX_ENTRIES: raise ScanError('В архиве больше 300 записей.')
    total=0; result=[]; seen=set()
    for e in entries:
     p=PurePosixPath(e.filename)
     if '\\' in e.filename or p.is_absolute() or '..' in p.parts or ':' in e.filename or any(ord(c)<32 for c in e.filename): raise ScanError('Небезопасный путь внутри ZIP.')
     if e.filename in seen: raise ScanError('Повторяющийся путь в ZIP.')
     seen.add(e.filename)
     if e.is_dir(): continue
     if (e.external_attr>>16)&0o170000 == 0o120000: raise ScanError('Символические ссылки в ZIP запрещены.')
     if e.flag_bits&1: raise ScanError('Зашифрованные ZIP не поддерживаются.')
     total+=e.file_size
     if total>MAX_EXPANDED or e.file_size>MAX_FILE or e.file_size/max(e.compress_size,1)>200: raise ScanError('Превышен безопасный лимит распаковки ZIP.')
     with z.open(e) as f: content=f.read(MAX_FILE+1)
     if len(content)>MAX_FILE: raise ScanError('Файл в ZIP слишком большой.')
     result.append((e.filename,content))
    return result
  except (zipfile.BadZipFile, RuntimeError, NotImplementedError, EOFError, OSError) as exc: raise ScanError('Не удалось прочитать ZIP.') from exc
 if len(data)>MAX_FILE: raise ScanError('Отдельный исходник больше 2 МиБ.')
 return [(PurePosixPath(name).name,data)]

def scan(name,data):
 findings=[]; skipped=[]; checked=[]; limitations=[]
 for filename, raw in files_from_upload(name,data):
  ext=PurePosixPath(filename).suffix.lower()
  if ext not in EXTENSIONS and PurePosixPath(filename).name not in {'Dockerfile','.env','Makefile'}:
   skipped.append({'file':filename,'reason':'Неподдерживаемый тип; бинарные файлы и вложенные архивы не анализируются.'}); continue
  try: source=raw.decode('utf-8-sig')
  except UnicodeDecodeError:
   skipped.append({'file':filename,'reason':'Требуется текст UTF-8.'}); continue
  if '\0' in source:
   skipped.append({'file':filename,'reason':'Бинарное содержимое.'}); continue
  checked.append(filename)
  for number,line in enumerate(source.splitlines(),1):
   for rule,severity,pattern,message in COMPILED:
    if pattern.search(line):
     if len(findings)<2000: findings.append({'rule':rule,'severity':severity,'file':filename,'line':number,'message':message})
     elif 'Лимит 2000 находок достигнут.' not in limitations: limitations.append('Лимит 2000 находок достигнут.')
  if ext=='.py':
   try:
    tree=ast.parse(source)
    for node in ast.walk(tree):
     if isinstance(node,ast.Call) and any(k.arg=='shell' and isinstance(k.value,ast.Constant) and k.value.value is True for k in node.keywords):
      if len(findings)<2000: findings.append({'rule':'python-shell-true','severity':'high','file':filename,'line':node.lineno,'message':'AST: shell=True включает интерпретатор команд. Исключите недоверенный ввод.'})
   except (SyntaxError,ValueError,RecursionError): limitations.append(f'{filename}: AST Python не разобран; текстовые правила выполнены.')
 counts={s:sum(f['severity']==s for f in findings) for s in ('critical','high','medium','info')}
 verdict='Требует проверки' if any(counts[s] for s in ('critical','high','medium')) else 'Сигнатуры риска не найдены'
 if not checked: verdict='Анализ не выполнен'
 return {'verdict':verdict,'sha256':hashlib.sha256(data).hexdigest(),'checked':checked,'skipped':skipped,'counts':counts,'findings':findings,'limitations':limitations,'notice':'Эвристический статический анализ, не антивирус и не доказательство безопасности. Код не запускался. Зависимости, бинарники и потоки данных не проверены. Исходники и секреты не включены в отчёт; имена файлов сохранены.'}

def report_text(r):
 lines=[r['verdict'], 'Проверено файлов: '+str(len(r['checked'])), 'Пропущено: '+str(len(r['skipped'])), 'Риски: '+', '.join(f'{k}: {v}' for k,v in r['counts'].items()),'',r['notice'],'']
 for f in r['findings']: lines.append(f"{f['severity'].upper()} | {f['file']}:{f['line']} | {f['rule']}\n{f['message']}\n")
 for f in r['skipped']: lines.append(f"Пропущен {f['file']}: {f['reason']}")
 lines.extend(r['limitations'])
 return '\n'.join(lines)

if __name__=='__main__':
 import argparse
 from pathlib import Path
 p=argparse.ArgumentParser(); p.add_argument('file'); args=p.parse_args(); path=Path(args.file)
 if path.stat().st_size>MAX_UPLOAD: p.error('Файл больше 15 МиБ')
 print(json.dumps(scan(path.name,path.read_bytes()),ensure_ascii=False,indent=2))
