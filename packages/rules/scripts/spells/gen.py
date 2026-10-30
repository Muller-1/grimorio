"""Gera packages/rules/src/spells/data/level-N.ts (ADR-010).

Fontes (nesta pasta):
- srd-spells.json: as 339 magias do SRD 5.2 (CC BY 4.0), extraídas do PDF oficial;
- names-pt.json: nome em português de cada magia (termos do Livro do Jogador 2024, ADR-004);
- tr/*.json: textos escritos para o site a partir do SRD (nunca copiados do livro), material,
  e ajustes da automação (`auto` acrescenta/troca dados; `noAuto` remove o que o detector errou).

Uso: python3 gen.py            -> grava os arquivos e formata com o Prettier
     python3 gen.py --report   -> só lista magias sem texto e problemas
"""
import json, re, glob, sys, unicodedata, os, subprocess
HERE=os.path.dirname(os.path.abspath(__file__))
en=json.load(open(os.path.join(HERE,'srd-spells.json'))); names=json.load(open(os.path.join(HERE,'names-pt.json')))
tr={}
for f in sorted(glob.glob(os.path.join(HERE,'tr','*.json'))):
    tr.update(json.load(open(f)))
SCHOOL={'Abjuration':'abjuration','Conjuration':'conjuration','Divination':'divination','Enchantment':'enchantment','Evocation':'evocation','Illusion':'illusion','Necromancy':'necromancy','Transmutation':'transmutation'}
CLS={'Bard':'bard','Cleric':'cleric','Druid':'druid','Paladin':'paladin','Ranger':'ranger','Sorcerer':'sorcerer','Warlock':'warlock','Wizard':'wizard'}
DMG={'Acid':'acid','Bludgeoning':'bludgeoning','Cold':'cold','Fire':'fire','Force':'force','Lightning':'lightning','Necrotic':'necrotic','Piercing':'piercing','Poison':'poison','Psychic':'psychic','Radiant':'radiant','Slashing':'slashing','Thunder':'thunder'}
ABIL={'Strength':'str','Dexterity':'dex','Constitution':'con','Intelligence':'int','Wisdom':'wis','Charisma':'cha'}
def slug(n):
    n=n.replace('’',"'").replace("'",'')
    n=unicodedata.normalize('NFKD',n).encode('ascii','ignore').decode()
    return re.sub(r'[^a-z0-9]+','-',n.lower()).strip('-')
def m(ft):
    v=int(ft.replace(',',''))*0.3
    s=('%.1f'%v).rstrip('0').rstrip('.').replace('.',',')
    return s
def dist(t):
    t=re.sub(r'(\d[\d,]*)[- ](?:foot|feet)', lambda x: m(x.group(1))+' m', t)
    t=re.sub(r'\b1 mile\b','1,5 km',t); t=re.sub(r'(\d+) miles', lambda x: str(int(x.group(1))*3//2)+' km', t)
    return t
SHAPE={'Cone':'Cone','Cube':'Cubo','Emanation':'Emanação','Line':'Linha','Sphere':'Esfera','radius':'raio','Cylinder':'Cilindro'}
def rng(r):
    if r in ('Self','Touch','Sight','Unlimited','Special'):
        return {'Self':'Pessoal','Touch':'Toque','Sight':'Visão','Unlimited':'Ilimitado','Special':'Especial'}[r]
    mm=re.match(r'^Self \((\d+)-foot(?:-radius)? (Cone|Cube|Emanation|Line|Sphere|Cylinder)\)$', r)
    if mm: return f'Pessoal ({SHAPE[mm.group(2)]} de {m(mm.group(1))} m)'
    mm=re.match(r'^Self \((\d+)-foot-radius Sphere\)$', r)
    if mm: return f'Pessoal (Esfera de {m(mm.group(1))} m de raio)'
    mm=re.match(r'^([\d,]+) feet$', r)
    if mm: return f'{m(mm.group(1))} m'
    mm=re.match(r'^(\d+) miles?$', r)
    if mm: return dist(r)
    return None
UNIT={'minute':('minuto','minutos'),'hour':('hora','horas'),'day':('dia','dias'),'round':('rodada','rodadas'),'year':('ano','anos')}
def tunit(n,u):
    u=u.rstrip('s'); a,b=UNIT[u]; return f'{n} {a if n=="1" else b}'
def dur(d):
    d=d.replace('Concentration up to','Concentration, up to')
    if d=='Instantaneous': return 'Instantânea'
    if d=='Until dispelled': return 'Até ser dissipada'
    if d=='Until dispelled or triggered': return 'Até ser dissipada ou ativada'
    if d=='Special': return 'Especial'
    mm=re.match(r'^Concentration, up to (\d+) (\w+)$', d)
    if mm: return 'Concentração, até '+tunit(mm.group(1),mm.group(2))
    mm=re.match(r'^Up to (\d+) (\w+)$', d)
    if mm: return 'Até '+tunit(mm.group(1),mm.group(2))
    mm=re.match(r'^(\d+) (\w+)$', d)
    if mm: return tunit(mm.group(1),mm.group(2))
    return None
CT_SPECIAL={
 'Action (Overgrowth) or 8 hours (Enrichment)':'Ação (Crescimento) ou 8 horas (Enriquecimento)',
 'Bonus Action, which you take immediately after hitting a creature with a Melee weapon or an Unarmed Strike':'Ação Bônus, logo depois de acertar uma criatura com arma corpo a corpo ou Ataque Desarmado',
 'Bonus Action, which you take immediately after hitting a creature with a weapon':'Ação Bônus, logo depois de acertar uma criatura com uma arma',
 'Bonus Action, which you take immediately after hitting a target with a Melee weapon or an Unarmed Strike':'Ação Bônus, logo depois de acertar um alvo com arma corpo a corpo ou Ataque Desarmado',
 'Reaction, which you take in response to taking damage from a creature that you can see within 60 feet of yourself':'Reação, ao sofrer dano de uma criatura que você vê a até 18 m',
 'Reaction, which you take when you are hit by an attack roll or targeted by the Magic Missile spell':'Reação, ao ser atingido por uma jogada de ataque ou ser alvo de Mísseis Mágicos',
 'Reaction, which you take when you or a creature you can see within 60 feet of you falls':'Reação, quando você ou uma criatura que você vê a até 18 m cai',
 'Reaction, which you take when you see a creature within 60 feet of yourself casting a spell with Verbal, Somatic, or Material components':'Reação, ao ver uma criatura a até 18 m conjurar uma magia com componentes Verbais, Somáticos ou Materiais',
}
def ctime(c):
    if c in CT_SPECIAL: return CT_SPECIAL[c], False
    ritual=c.endswith(' or Ritual'); c=c.replace(' or Ritual','')
    base={'Action':'Ação','Bonus Action':'Ação Bônus'}.get(c)
    if base is None:
        mm=re.match(r'^(\d+) (minute|minutes|hour|hours)$', c)
        if mm: base=tunit(mm.group(1),mm.group(2))
    return base, ritual
def auto(s):
    text=s['text']; higher=s.get('higher','')
    a={}
    mm=re.search(r'\b(ranged|melee) spell attack', text)
    if mm: a['attack']='ranged' if mm.group(1)=='ranged' else 'melee'
    mm=re.search(r'\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw', text)
    if mm: a['save']=ABIL[mm.group(1)]
    dm=[]
    for x in re.finditer(r'(\d+d\d+(?: plus \d+)?) (Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder) damage', text):
        dice=x.group(1).replace(' plus ','+'); t=DMG[x.group(2)]
        if not any(d['type']==t for d in dm): dm.append({'dice':dice,'type':t})
    if dm: a['damage']=dm[:2]
    mm=re.search(r'Hit Points equal to (\d+d\d+) plus your spellcasting ability modifier', text)
    if mm: a['heal']={'dice':mm.group(1),'addMod':True}
    mm=re.search(r'increases by (\d+d\d+) for each spell slot level above (\d)', higher)
    if mm and s['level']>0: a['perSlot']=mm.group(1)
    if s['level']==0 and re.search(r'when you reach levels? 5', higher) and dm: a['cantripScaling']=True
    return a
out={}; missing=[]; problems=[]
for s in en:
    sid=slug(s['name'])
    t=tr.get(sid)
    if not t: missing.append(sid); continue
    ct,ritual=ctime(s['castingTime'])
    ct=t.get('castingTime',ct)
    r=t.get('range',rng(s['range']))
    d=t.get('duration',dur(s['duration']))
    if not ct or not r or not d: problems.append((sid,s['castingTime'],s['range'],s['duration']))
    comp=s['components']; mat=None
    mm=re.search(r'M \((.*)\)$', comp)
    if mm: mat=t.get('material')
    if mm and not mat: problems.append((sid,'material',mm.group(1)))
    hasM=bool(re.search(r'\bM\b', comp))
    a=auto(s); a.update(t.get('auto',{}))
    for k in t.get('noAuto',[]): a.pop(k,None)
    rec={'id':sid,'name':names[s['name']],'level':s['level'],'school':SCHOOL[s['school']],
         'classes':[CLS[c] for c in s['classes']],'castingTime':ct,'ritual':ritual,'range':r,
         'components':{'v':bool(re.search(r'\bV\b',comp)),'s':bool(re.search(r'\bS\b',comp)),**({'m':mat if mat else True} if hasM else {})},
         'duration':d,'concentration':s['duration'].lower().startswith('concentration'),
         'text':t['text']}
    if t.get('higher'): rec['higher']=t['higher']
    elif s.get('higher'): problems.append((sid,'higher missing'))
    rec.update(a)
    out.setdefault(s['level'],[]).append(rec)
if '--report' in sys.argv:
    print('missing', len(missing)); print('problems', problems[:50])
    sys.exit(0)
if missing or problems:
    print('MISSING', len(missing), missing[:10]); print('PROBLEMS', problems[:20]); 
    if '--partial' not in sys.argv: sys.exit(1)
outdir=os.path.normpath(os.path.join(HERE,'..','..','src','spells','data'))
for lvl,recs in out.items():
    body=json.dumps(recs,ensure_ascii=False,indent=2)
    with open(os.path.join(outdir,f'level-{lvl}.ts'),'w') as f:
        f.write('// Gerado por packages/rules/scripts/spells/gen.py — SRD 5.2 (CC BY 4.0), textos escritos para o site.\n')
        f.write('// Não edite aqui: mude tr/*.json e rode o gerador de novo (ADR-010).\n')
        f.write("import type { SpellDef } from '../types';\n\n")
        f.write(f'export const LEVEL_{lvl}: SpellDef[] = {body};\n')
# Efeitos numéricos das magias (Bênção, Escudo da Fé…): arquivo pequeno, que vai junto com o
# motor da ficha (o resto das magias só carrega ao abrir a parte de magias).
UNITS={'rodada':'round','minuto':'minute','hora':'hour','dia':'day'}
def dur_struct(d):
    # Mesma leitura de parseSpellDuration (src/spells/duration.ts): "Concentração, até 1 minuto".
    m=re.search(r'(\d+)\s*(rodada|minuto|hora|dia)s?\b', d, re.I)
    return {'amount':int(m.group(1)),'unit':UNITS[m.group(2).lower()]} if m else None
def eff_entry(r):
    e={'name':r['name'],'level':r['level'],'concentration':r['concentration']}
    if dur_struct(r['duration']): e['duration']=dur_struct(r['duration'])
    e['effects']=r['effects']
    return e
eff={r['id']:eff_entry(r) for recs in out.values() for r in recs if r.get('effects')}
effpath=os.path.normpath(os.path.join(outdir,'..','effects.ts'))
with open(effpath,'w') as f:
    f.write('// Gerado por packages/rules/scripts/spells/gen.py — SRD 5.2 (CC BY 4.0).\n')
    f.write('// Não edite aqui: mude tr/*.json e rode o gerador de novo (ADR-010).\n')
    f.write("import type { EffectDuration } from '@grimorio/shared';\n")
    f.write("import type { Effect } from '../classes/types';\n\n")
    f.write('export interface SpellEffectsDef {\n  name: string;\n  level: number;\n  concentration: boolean;\n  /** Ausente: Instantânea ou até ser dissipada. */\n  duration?: EffectDuration;\n  effects: Effect[];\n}\n\n')
    f.write('/** Magias com efeito que a ficha calcula quando estão ativas em você. */\n')
    f.write('export const SPELL_EFFECTS: Record<string, SpellEffectsDef> = ')
    f.write(json.dumps(dict(sorted(eff.items())),ensure_ascii=False,indent=2)+';\n')
files=[os.path.join(outdir,f'level-{l}.ts') for l in out]+[effpath]
subprocess.run(['pnpm','exec','prettier','--write',*files],check=True,cwd=HERE,stdout=subprocess.DEVNULL)
print('ok', {k:len(v) for k,v in sorted(out.items())})
