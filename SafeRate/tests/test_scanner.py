import io
import unittest
import zipfile
from scanner import scan, ScanError
from bot import Bot

def archive(items):
 b=io.BytesIO()
 with zipfile.ZipFile(b,'w') as z:
  for name,data in items: z.writestr(name,data)
 return b.getvalue()

class Tests(unittest.TestCase):
 def test_risks_and_redaction(self):
  secret='ghp_'+'a'*36
  r=scan('bad.py',('import subprocess\nsubprocess.run(user_input, shell=True)\ntoken="'+secret+'"').encode())
  self.assertIn('python-shell-true',{f['rule'] for f in r['findings']})
  self.assertIn('secret',{f['rule'] for f in r['findings']})
  self.assertNotIn(secret,str(r))
 def test_normal(self):
  r=scan('ok.py',b'print("hello")'); self.assertEqual(r['counts']['high'],0); self.assertEqual(r['checked'],['ok.py'])
 def test_traversal(self):
  with self.assertRaises(ScanError): scan('a.zip',archive([('../x.py','print(1)')]))
 def test_binary_and_nested(self):
  r=scan('a.zip',archive([('x.exe',b'abc'),('x.zip',b'abc'),('a.py','print(1)')]))
  self.assertEqual(len(r['skipped']),2); self.assertEqual(len(r['checked']),1)
 def test_invalid_zip(self):
  with self.assertRaises(ScanError): scan('a.zip',b'not zip')
 def test_bomb(self):
  b=io.BytesIO()
  with zipfile.ZipFile(b,'w',zipfile.ZIP_DEFLATED) as z: z.writestr('a.py','a'*100000)
  with self.assertRaises(ScanError): scan('a.zip',b.getvalue())
 def test_limit(self):
  with self.assertRaises(ScanError): scan('a.py',b'a'*(2*1024*1024+1))
 def test_invalid_python(self): self.assertTrue(scan('a.py',b'def :')['limitations'])
 def test_symlink(self):
  b=io.BytesIO(); e=zipfile.ZipInfo('link'); e.external_attr=0o120777<<16
  with zipfile.ZipFile(b,'w') as z: z.writestr(e,'target')
  with self.assertRaises(ScanError): scan('a.zip',b.getvalue())
 def test_bot_flow(self):
  class API:
   def __init__(self): self.messages=[]; self.docs=[]
   def message(self,*a): self.messages.append(a)
   def call(self,*a): pass
   def download(self,*a): return b'eval(input())'
   def document(self,*a): self.docs.append(a)
  api=API(); bot=Bot(api,{42}); msg={'from':{'id':42},'chat':{'id':42,'type':'private'},'document':{'file_id':'x','file_name':'a.py'}}
  bot.handle({'message':msg}); self.assertIn(42,bot.reports)
  bot.handle({'callback_query':{'id':'q','from':{'id':42},'message':msg,'data':'json'}}); self.assertEqual(len(api.docs),1)
  bot.handle({'callback_query':{'id':'q','from':{'id':42},'message':msg,'data':'delete'}}); self.assertFalse(bot.reports)
 def test_unauthorized(self):
  class API:
   def message(self,*a): raise AssertionError('unauthorized')
  Bot(API(),{42}).handle({'message':{'from':{'id':43},'chat':{'id':43,'type':'private'}}})

if __name__=='__main__': unittest.main()
