from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
HTML=ROOT/'dist-review'/'EKV-Kernfall-Fachpruefung.html'

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1280,'height':900},accept_downloads=True)
        errors=[]
        page.on('pageerror',lambda exc: errors.append(str(exc)))
        page.on('console',lambda msg: errors.append(f'console:{msg.type}:{msg.text}') if msg.type=='error' else None)
        html=HTML.read_text(encoding='utf-8')
        memory="""<script>(()=>{const m=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.has(String(k))?m.get(String(k)):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>Array.from(m.keys())[i]??null,get length(){return m.size;}}});})();</script>"""
        html=html.replace('<script id="review-data"',memory+'<script id="review-data"')
        page.set_content(html,wait_until='load')
        assert page.locator('.case-btn').count()==24
        assert page.locator('#case > h2').inner_text()=='INV-2024-050'
        assert 'Technik: passed' in page.locator('#case').inner_text()
        assert 'Erwartetes Ergebnis' in page.locator('#case').inner_text()
        assert 'Tatsächliches Ergebnis' in page.locator('#case').inner_text()
        page.fill('#reviewer-name','Fachperson Test')
        page.fill('#reviewer-role','Fachexperte Rente')
        page.fill('#rule-assessment','Die angewendete Regel wurde fachlich geprüft und ist korrekt.')
        page.fill('#result-assessment','Das erwartete Ergebnis wurde fachlich geprüft und ist korrekt.')
        page.fill('#source-reference','Interne Fachprüfung')
        page.fill('#evidence','Vier-Augen-Prüfung')
        page.click('#approve')
        assert '1 / 24 entschieden' in page.locator('#progress').inner_text()
        assert page.locator('.case-btn.approved').count()==1
        with page.expect_download() as info:
            page.click('#export')
        dl=info.value
        body=json.loads(Path(dl.path()).read_text(encoding='utf-8'))
        assert body['bundleType']=='human-certification-review'
        assert body['recordCount']==1
        assert body['records'][0]['caseId']=='INV-2024-050'
        assert body['records'][0]['reviewedBy']['actorType']=='human'
        assert len(body['records'][0]['dossierFingerprint'])==64
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth')
        assert not errors, errors
        browser.close()
    print(json.dumps({'status':'ok','phase_d_alpha4':'human review tool, bundle export, responsive'}))

if __name__=='__main__':
    main()
