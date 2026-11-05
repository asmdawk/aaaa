"""Minimal private Telegram bot using the standard library, with bounded I/O."""
import io
import json
import logging
import os
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict
from scanner import MAX_UPLOAD, ScanError, scan, report_text

log=logging.getLogger('saferate')
MENU={'inline_keyboard':[[{'text':'Проверить код','callback_data':'upload'}],[{'text':'Возможности и ограничения','callback_data':'help'}],[{'text':'Удалить мой отчёт','callback_data':'delete'}]]}
HELP='Отправьте исходник UTF-8 или ZIP до 15 МиБ. До 300 записей, 30 МиБ после распаковки, 2 МиБ на файл. Проверки: команды, загрузка и выполнение, секреты, автозапуск, обфускация, TLS, десериализация, HTML-вставки и Python AST.\n\nЭто эвристический анализ: возможны пропуски и ложные срабатывания. Нет антивирусных движков, анализа бинарников, аудита зависимостей и запуска кода. Файлы передаются через Telegram. Не отправляйте действующие секреты и чужой конфиденциальный код. Отчёт хранится в памяти 15 минут; Telegram сохраняет отправленные сообщения согласно своим правилам.'

class Telegram:
 def __init__(self,token): self.base='https://api.telegram.org/bot'+token+'/'; self.token=token
 def call(self,method,params=None):
  req=urllib.request.Request(self.base+method,data=json.dumps(params or {}).encode(),headers={'Content-Type':'application/json'})
  with urllib.request.urlopen(req,timeout=45) as r: response=json.load(r)
  if not response.get('ok'): raise RuntimeError('Telegram API error')
  return response['result']
 def message(self,chat,text,buttons=MENU): return self.call('sendMessage',{'chat_id':chat,'text':text[:4000],'reply_markup':buttons})
 def document(self,chat,name,content):
  boundary=secrets.token_hex(24)
  body=(f'--{boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n{chat}\r\n--{boundary}\r\nContent-Disposition: form-data; name="document"; filename="{name}"\r\nContent-Type: application/octet-stream\r\n\r\n').encode()+content+f'\r\n--{boundary}--\r\n'.encode()
  req=urllib.request.Request(self.base+'sendDocument',data=body,headers={'Content-Type':'multipart/form-data; boundary='+boundary})
  with urllib.request.urlopen(req,timeout=45) as r:
   if not json.load(r).get('ok'): raise RuntimeError('Telegram upload failed')
 def download(self,file_id):
  info=self.call('getFile',{'file_id':file_id})
  if info.get('file_size',0)>MAX_UPLOAD: raise ScanError('Файл больше 15 МиБ.')
  url='https://api.telegram.org/file/bot'+self.token+'/'+info['file_path']
  with urllib.request.urlopen(url,timeout=45) as r: data=r.read(MAX_UPLOAD+1)
  if len(data)>MAX_UPLOAD: raise ScanError('Файл больше 15 МиБ.')
  return data

class Bot:
 def __init__(self,api,users): self.api=api; self.users=users; self.reports=OrderedDict(); self.last={}
 def handle(self,update):
  now=time.monotonic()
  for key,(stamp,_) in list(self.reports.items()):
   if now-stamp>900: del self.reports[key]
  cb=update.get('callback_query'); msg=(cb or {}).get('message') if cb else update.get('message')
  if not msg: return
  user=(cb or msg).get('from',{}).get('id'); chat=msg['chat']['id']
  if msg['chat'].get('type')!='private' or user not in self.users:
   if cb: self.api.call('answerCallbackQuery',{'callback_query_id':cb['id'],'text':'Доступ закрыт.'})
   return
  if cb:
   self.api.call('answerCallbackQuery',{'callback_query_id':cb['id']})
   action=cb.get('data')
   if action=='help': self.api.message(chat,HELP)
   elif action=='delete': self.reports.pop(user,None); self.api.message(chat,'Отчёт удалён из памяти бота.')
   elif action in ('txt','json'):
    item=self.reports.get(user)
    if not item: self.api.message(chat,'Отчёт отсутствует или срок хранения истёк.')
    else:
     r=item[1]; data=report_text(r) if action=='txt' else json.dumps(r,ensure_ascii=False,indent=2)
     self.api.document(chat,'report.'+action,data.encode())
   else: self.api.message(chat,'Отправьте файл исходного кода или ZIP-архив.')
   return
  doc=msg.get('document')
  if not doc:
   self.api.message(chat,'SafeRate\nСтатическая проверка исходного кода.\nВыберите действие или отправьте файл.'); return
  if now-self.last.get(user,-100)<10: self.api.message(chat,'Подождите 10 секунд между проверками.'); return
  self.last[user]=now
  if doc.get('file_size',0)>MAX_UPLOAD: self.api.message(chat,'Файл больше 15 МиБ.'); return
  self.api.message(chat,'Проверяю файл. Код не запускается.',{'inline_keyboard':[]})
  try: result=scan(doc.get('file_name','upload.txt'),self.api.download(doc['file_id']))
  except ScanError as exc: self.api.message(chat,str(exc)); return
  self.reports[user]=(now,result); self.reports.move_to_end(user)
  while len(self.reports)>20: self.reports.popitem(last=False)
  summary=report_text({**result,'findings':[],'skipped':result['skipped'][:5]})
  buttons={'inline_keyboard':[[{'text':'Отчёт TXT','callback_data':'txt'},{'text':'Отчёт JSON','callback_data':'json'}],[{'text':'Новая проверка','callback_data':'upload'}],[{'text':'Удалить отчёт','callback_data':'delete'}]]}
  self.api.message(chat,summary,buttons)

def main():
 token=os.environ.get('TELEGRAM_BOT_TOKEN',''); allowed=os.environ.get('ALLOWED_USER_IDS','')
 if not token or not allowed: raise SystemExit('Задайте TELEGRAM_BOT_TOKEN и ALLOWED_USER_IDS. Значения не выводятся.')
 try: users={int(x.strip()) for x in allowed.split(',') if x.strip()}
 except ValueError: raise SystemExit('ALLOWED_USER_IDS: нужны числовые ID через запятую.')
 if not users: raise SystemExit('Список пользователей пуст.')
 api=Telegram(token); bot=Bot(api,users); offset=0
 api.call('getMe')
 api.call('setMyName', {'name':'SafeRate'})
 # Long polling requires that no webhook is active. Do not discard queued updates.
 api.call('deleteWebhook',{'drop_pending_updates':False})
 log.info('Bot started')
 while True:
  try:
   updates=api.call('getUpdates',{'offset':offset,'timeout':30,'allowed_updates':['message','callback_query']})
   for update in updates:
    try: bot.handle(update)
    except Exception: log.error('Update failed; details hidden to protect credentials')
    offset=update['update_id']+1
  except (urllib.error.URLError,TimeoutError,RuntimeError,OSError):
   log.error('Telegram connection failed; retry in 5 seconds'); time.sleep(5)

if __name__=='__main__':
 logging.basicConfig(level=logging.INFO,format='%(levelname)s %(message)s')
 try: main()
 except KeyboardInterrupt: pass
