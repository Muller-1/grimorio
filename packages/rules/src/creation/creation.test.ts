import { ABILITY_KEYS, LocalSheetSchema, type SkillKey } from '@grimorio/shared';
import { describe, expect, it } from 'vitest';
import { seededRng } from '../dice/rng';
import { checkSheetInvariants } from '../sheet/invariants';
import { deriveSheet } from '../sheet/derive';
import {
  finalScores,
  pointBuyCost,
  pointBuySpent,
  rollAbilityScores,
  STANDARD_ARRAY,
  suggestBackgroundBonus,
  validateBackgroundBonus,
  validateBaseScores,
} from './abilities';
import { buildCharacterSheet } from './build';
import {
  BACKGROUNDS,
  CLASS_ORDER,
  CLASSES,
  SPECIES,
  SPECIES_ORDER,
  WEAPONS,
  type ClassId,
  type WeaponId,
} from './content';
import { masteryOptions, suggestedMasteries } from './mastery';
import {
  emptyDraft,
  firstIncompleteStep,
  overlappingSkills,
  sanitizeDraft,
  stepIssues,
  withBackground,
  withClass,
  type CreationDraft,
} from './draft';

let counter = 0;
const ctx = { newId: () => `id-${++counter}` };

/** Um rascunho completo e válido para a classe, com as sugestões do livro. */
function completeDraft(
  classId: ClassId,
  edit: (d: CreationDraft) => void = () => {},
): CreationDraft {
  const cls = CLASSES[classId];
  let d = withClass(emptyDraft(), classId);
  d = withBackground(d, 'soldier');
  const bg = BACKGROUNDS.soldier!;
  const from =
    cls.skills.from === 'any' ? (['arcana', 'history', 'nature'] as SkillKey[]) : cls.skills.from;
  d.classSkills = from.filter((s) => !bg.skills.includes(s)).slice(0, cls.skills.count);
  if (cls.option) d.classOptionId = cls.option.choices[0]!.id;
  if (cls.fightingStyle) d.fightingStyleId = 'defense';
  d.speciesId = 'orc';
  d.languages = ['Anão', 'Élfico', 'Gigante'].slice(0, 2 + (cls.languages?.choose ?? 0));
  d.abilityMethod = 'standard-array';
  d.baseScores = { ...cls.standardArray };
  d.backgroundBonus = suggestBackgroundBonus(bg.abilities, cls.primary);
  d.name = 'Teste';
  if (cls.expertise) d.expertise = d.classSkills.slice(0, cls.expertise);
  if (cls.weaponMastery) d.weaponMasteries = masteryOptions(cls).slice(0, cls.weaponMastery.count);
  edit(d);
  return d;
}

describe('atributos (Livro do Jogador, passo 3)', () => {
  it('custos da compra de pontos', () => {
    expect([8, 9, 10, 11, 12, 13, 14, 15].map(pointBuyCost)).toEqual([0, 1, 2, 3, 4, 5, 7, 9]);
    expect(pointBuyCost(16)).toBeNull();
    expect(pointBuySpent({ str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 })).toBe(27);
  });

  it('compra de pontos: 27 é o limite e os valores ficam entre 8 e 15', () => {
    const ok = { str: 15, dex: 14, con: 14, int: 10, wis: 10, cha: 8 }; // 9+7+7+2+2+0 = 27
    expect(validateBaseScores('point-buy', ok, null)).toEqual([]);
    expect(validateBaseScores('point-buy', { ...ok, cha: 9 }, null)).toEqual([
      'point-buy-over-budget',
    ]);
    expect(validateBaseScores('point-buy', { ...ok, str: 16 }, null)).toEqual([
      'point-buy-out-of-range',
    ]);
  });

  it('conjunto padrão: cada valor usado uma vez', () => {
    const ok = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
    expect(validateBaseScores('standard-array', ok, null)).toEqual([]);
    expect(validateBaseScores('standard-array', { ...ok, cha: 10 }, null)).toEqual([
      'standard-array-mismatch',
    ]);
    expect(validateBaseScores('standard-array', { ...ok, cha: null }, null)).toEqual([
      'incomplete',
    ]);
  });

  it('4d6 descartando o menor: reproduzível pela semente e sempre entre 3 e 18', () => {
    const a = rollAbilityScores(seededRng(42));
    const b = rollAbilityScores(seededRng(42));
    expect(a).toEqual(b);
    for (const roll of a) {
      const kept = roll.dice.filter((_, i) => i !== roll.dropped);
      expect(roll.total).toBe(kept.reduce((s, x) => s + x, 0));
      expect(roll.dice[roll.dropped]).toBe(Math.min(...roll.dice));
      expect(roll.total).toBeGreaterThanOrEqual(3);
      expect(roll.total).toBeLessThanOrEqual(18);
    }
    const totals = a.map((r) => r.total);
    const assigned = Object.fromEntries(ABILITY_KEYS.map((k, i) => [k, totals[i]!]));
    expect(validateBaseScores('rolled', assigned as never, totals)).toEqual([]);
    expect(validateBaseScores('rolled', assigned as never, null)).toEqual(['rolled-not-rolled']);
  });

  it('bônus do antecedente: +2/+1 ou +1/+1/+1, só nos atributos dele, até 20', () => {
    const base = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
    const soldier = BACKGROUNDS.soldier!.abilities;
    expect(validateBackgroundBonus({ str: 2, con: 1 }, soldier, base)).toEqual([]);
    expect(validateBackgroundBonus({ str: 1, dex: 1, con: 1 }, soldier, base)).toEqual([]);
    expect(validateBackgroundBonus({ str: 2, dex: 2 }, soldier, base)).toEqual([
      'bonus-wrong-shape',
    ]);
    expect(validateBackgroundBonus({ cha: 2, str: 1 }, soldier, base)).toEqual([
      'bonus-outside-background',
    ]);
    expect(validateBackgroundBonus({ str: 2, con: 1 }, soldier, { ...base, str: 19 })).toEqual([
      'bonus-over-cap',
    ]);
    expect(finalScores(base, { str: 2, con: 1 })).toMatchObject({ str: 17, con: 14 });
  });

  it('sugestão de bônus segue o atributo primário da classe', () => {
    expect(suggestBackgroundBonus(['str', 'dex', 'con'], ['dex', 'wis'])).toEqual({
      dex: 2,
      str: 1,
    });
  });
});

describe('validação das etapas', () => {
  it('rascunho vazio: falta a classe', () => {
    expect(firstIncompleteStep(emptyDraft())).toBe('class');
    expect(stepIssues(emptyDraft(), 'class')).toEqual(['class-missing']);
  });

  it('cada etapa diz o que falta', () => {
    const d = completeDraft('fighter', (x) => {
      x.fightingStyleId = null;
      x.classSkills = ['athletics'];
      x.languages = ['Anão'];
      x.name = ' ';
    });
    expect(stepIssues(d, 'class')).toEqual(['fighting-style-missing', 'class-skills-count']);
    expect(stepIssues(d, 'origin')).toEqual(['languages-count']);
    expect(stepIssues(d, 'details')).toEqual(['name-missing']);
    expect(buildCharacterSheet(d, ctx)).toBeNull();
  });

  it('espécies com escolha exigem a escolha (linhagem, perícia, talento)', () => {
    const elf = completeDraft('wizard', (x) => (x.speciesId = 'elf'));
    expect(stepIssues(elf, 'origin')).toEqual(['species-option-missing', 'species-skills-count']);
    const human = completeDraft('wizard', (x) => (x.speciesId = 'human'));
    expect(stepIssues(human, 'origin')).toEqual(['species-skills-count', 'species-feat-missing']);
  });

  it('Habilidoso pede 3 perícias; Ladino escolhe 1 idioma a mais', () => {
    const d = completeDraft('rogue', (x) => {
      x.speciesId = 'human';
      x.speciesSkills = ['medicine'];
      x.speciesFeatId = 'skilled';
    });
    expect(stepIssues(d, 'origin')).toEqual(['feat-skills-count']);
    d.featSkills = ['arcana', 'history', 'nature'];
    expect(stepIssues(d, 'origin')).toEqual([]);
    expect(d.languages).toHaveLength(3);
  });

  it('perícia repetida entre classe e antecedente é apontada', () => {
    const d = completeDraft('fighter', (x) => (x.classSkills = ['athletics', 'perception']));
    expect(overlappingSkills(d)).toEqual(['athletics']);
  });

  it('trocar de classe limpa as escolhas que dependiam dela', () => {
    const d = withClass(completeDraft('cleric'), 'fighter');
    expect(d).toMatchObject({ classOptionId: null, classSkills: [], fightingStyleId: null });
  });
});

describe('ficha montada', () => {
  it.each(CLASS_ORDER)('%s: ficha válida, PV cheios e invariantes ok', (classId) => {
    const sheet = buildCharacterSheet(completeDraft(classId), ctx);
    expect(sheet).not.toBeNull();
    expect(LocalSheetSchema.safeParse(sheet).success).toBe(true);
    const d = deriveSheet(sheet!);
    expect(sheet!.state.hp.current).toBe(d.hpMax.value);
    expect(d.hpMax.value).toBe(CLASSES[classId].hitDie + d.abilities.con.mod);
    expect(sheet!.build.saveProficiencies).toEqual(CLASSES[classId].saves);
    expect(checkSheetInvariants(sheet!)).toEqual([]);
    expect(sheet!.creation?.classId).toBe(classId);
    expect(d.warnings).toEqual([]);
  });

  it.each(SPECIES_ORDER)('espécie %s monta ficha válida', (speciesId) => {
    const species = SPECIES[speciesId]!;
    const d = completeDraft('wizard', (x) => {
      x.speciesId = speciesId;
      if (species.option) x.speciesOptionId = species.option.choices[0]!.id;
      if (species.skillChoice) {
        const from =
          species.skillChoice.from === 'any'
            ? (['medicine'] as SkillKey[])
            : species.skillChoice.from;
        x.speciesSkills = from.slice(0, species.skillChoice.count);
      }
      if (species.extraOriginFeat) x.speciesFeatId = 'alert';
    });
    expect(stepIssues(d, 'origin')).toEqual([]);
    expect(buildCharacterSheet(d, ctx)).not.toBeNull();
  });

  it('Guerreiro Soldado: Cota de Malha + Defesa = CA 17, armas com proficiência', () => {
    const sheet = buildCharacterSheet(completeDraft('fighter'), ctx)!;
    const d = deriveSheet(sheet);
    // Conjunto sugerido (15/14/13) + Soldado sugerido (+2 For, +1 Des)
    expect(sheet.build.abilities).toMatchObject({ str: 17, dex: 15, con: 13 });
    expect(d.armorClass.value).toBe(17);
    expect(d.hpMax.value).toBe(11);
    expect(sheet.combat.speedFt).toBe(30);
    expect(sheet.weapons.map((w) => [w.name, w.proficient, w.ability])).toEqual([
      ['Espada Grande', true, 'str'],
      ['Mangual', true, 'str'],
      ['Azagaia (×8)', true, 'str'],
      ['Lança', true, 'str'],
      ['Arco Curto', true, 'dex'],
    ]);
    expect(sheet.build.skillProficiencies).toMatchObject({ athletics: 1, intimidation: 1 });
    expect(sheet.features.find((f) => f.name === 'Classe de Armadura')?.text).toContain(
      'CA 17 = Cota de Malha 16 + Estilo Defesa +1',
    );
  });

  it('Força abaixo de 13 com Cota de Malha: −3 m de deslocamento', () => {
    const d = completeDraft('fighter', (x) => {
      x.baseScores = { str: 8, dex: 15, con: 14, int: 12, wis: 13, cha: 10 };
      x.backgroundBonus = { dex: 2, con: 1 };
    });
    expect(buildCharacterSheet(d, ctx)!.combat.speedFt).toBe(20);
  });

  it('Bárbaro Anão: Defesa sem Armadura e +1 PV por nível', () => {
    const sheet = buildCharacterSheet(
      completeDraft('barbarian', (x) => (x.speciesId = 'dwarf')),
      ctx,
    )!;
    const d = deriveSheet(sheet);
    // For 15+2, Des 13+1, Con 14 → CA 10 + 2 + 2 = 14; PV 12 + 2 + 1
    expect(d.armorClass.value).toBe(14);
    expect(d.hpMax.value).toBe(15);
    expect(d.hpMax.parts.at(-1)).toEqual({ source: { kind: 'trait' }, value: 1 });
    const level5 = deriveSheet({ ...sheet, build: { ...sheet.build, level: 5 } });
    expect(level5.hpMax.parts.at(-1)?.value).toBe(5);
  });

  it('Monge: Ataque Desarmado d6 com Destreza e CA 10 + Des + Sab', () => {
    const sheet = buildCharacterSheet(completeDraft('monk'), ctx)!;
    const d = deriveSheet(sheet);
    expect(sheet.weapons[0]).toMatchObject({
      damageDice: '1d6',
      ability: 'finesse',
      proficient: true,
    });
    expect(d.armorClass.value).toBe(10 + d.abilities.dex.mod + d.abilities.wis.mod);
    expect(sheet.weapons.find((w) => w.name.startsWith('Adaga'))?.ability).toBe('finesse');
  });

  it('Mago sem armadura: a ficha calcula a CA sozinha', () => {
    const sheet = buildCharacterSheet(completeDraft('wizard'), ctx)!;
    expect(sheet.combat.armorClassOverride).toBeUndefined();
  });

  it('Ladino Criminoso: Especialização, Alerta na Iniciativa e Gíria dos Ladrões', () => {
    const d = completeDraft('rogue', (x) => {
      x.backgroundId = 'criminal';
      x.classSkills = ['acrobatics', 'perception', 'investigation', 'deception'];
      x.expertise = ['stealth', 'perception'];
      x.backgroundBonus = { dex: 2, int: 1 };
    });
    const sheet = buildCharacterSheet(d, ctx)!;
    const derived = deriveSheet(sheet);
    expect(sheet.build.skillProficiencies).toMatchObject({
      stealth: 2,
      perception: 2,
      acrobatics: 1,
    });
    expect(sheet.combat.initiativeProficiency).toBe(true);
    expect(derived.initiative.value).toBe(derived.abilities.dex.mod + 2);
    expect(sheet.features.find((f) => f.name === 'Treinamento e idiomas')?.text).toContain(
      'Gíria dos Ladrões',
    );
    expect(sheet.weapons.find((w) => w.name.startsWith('Adaga'))?.name).toBe('Adaga (×4)');
  });

  it('Clérigo Protetor ganha armas Marciais e armadura Pesada', () => {
    const sheet = buildCharacterSheet(completeDraft('cleric'), ctx)!;
    expect(sheet.features.find((f) => f.name === 'Treinamento e idiomas')?.text).toContain(
      'Armaduras: Leve, Média, Pesada e Escudos.',
    );
    expect(deriveSheet(sheet).armorClass.value).toBe(13 + Math.min(2, -1) + 2);
  });

  it('Elfo Silvestre anda 10,5 m (35 pés); opção B dá só ouro', () => {
    const d = completeDraft('ranger', (x) => {
      x.speciesId = 'elf';
      x.speciesOptionId = 'wood-elf';
      x.speciesSkills = ['perception'];
      x.classEquipment = 'B';
      x.backgroundEquipment = 'B';
    });
    const sheet = buildCharacterSheet(d, ctx)!;
    expect(sheet.combat.speedFt).toBe(35);
    expect(sheet.weapons).toEqual([]);
    expect(sheet.features.find((f) => f.name === 'Equipamento inicial')?.text).toMatch(/^200 PO/);
    // ADR-010: o truque da linhagem já vem na aba Magias, sempre preparado.
    expect(sheet.spells.granted).toEqual([{ id: 'druidcraft', source: 'species' }]);
    expect(sheet.progression).toEqual({ classId: 'ranger', levels: [] });
  });

  it('Tiferino Infernal ganha Taumaturgia e Raio de Fogo como magias da espécie', () => {
    const d = completeDraft('fighter', (x) => {
      x.speciesId = 'tiefling';
      x.speciesOptionId = 'infernal';
    });
    const sheet = buildCharacterSheet(d, ctx)!;
    expect(sheet.spells.granted.map((g) => g.id)).toEqual(['thaumaturgy', 'fire-bolt']);
  });

  it('antecedente "Outro (do livro)" preenchido pelo jogador', () => {
    const d = completeDraft('bard', (x) => {
      x.backgroundId = 'custom';
      x.customBackground = {
        name: 'Artista',
        abilities: ['str', 'dex', 'cha'],
        skills: ['acrobatics', 'performance'],
        feat: 'skilled',
        tool: 'Kit de Disfarce',
      };
      x.featSkills = ['arcana', 'history', 'religion'];
      x.backgroundBonus = { cha: 2, dex: 1 };
    });
    expect(firstIncompleteStep(d)).toBeNull();
    const sheet = buildCharacterSheet(d, ctx)!;
    expect(sheet.identity.origin).toBe('Artista · Orc');
    expect(sheet.build.skillProficiencies).toMatchObject({ performance: 1, religion: 1 });
  });

  it('o conjunto padrão sugerido pelo livro para cada classe usa os 6 valores', () => {
    for (const id of CLASS_ORDER) {
      const values = Object.values(CLASSES[id].standardArray).sort((a, b) => b - a);
      expect(values).toEqual([...STANDARD_ARRAY]);
    }
  });
});

describe('rascunho salvo no navegador', () => {
  it('lixo vira rascunho vazio; tipos errados voltam ao padrão', async () => {
    expect(sanitizeDraft(null)).toEqual(emptyDraft());
    const d = sanitizeDraft({
      classId: 'necromante',
      classSkills: ['stealth', 'voar', 3],
      baseScores: { str: 15, dex: '14', con: 99 },
      backgroundBonus: { str: 2, dex: 5 },
      languages: 'Élfico',
      name: 42,
    });
    expect(d.classId).toBeNull();
    expect(d.classSkills).toEqual(['stealth']);
    expect(d.baseScores).toMatchObject({ str: 15, dex: null, con: null });
    expect(d.backgroundBonus).toEqual({ str: 2 });
    expect(d.languages).toEqual([]);
    expect(d.name).toBe('');
  });

  it('um rascunho válido sobrevive à ida e volta', async () => {
    const d = completeDraft('rogue', (x) => (x.rolled = [15, 14, 13, 12, 10, 8]));
    expect(sanitizeDraft(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });
});

describe('Maestria em Arma (nível 1)', () => {
  it('toda arma da tabela tem uma propriedade de maestria', () => {
    expect(Object.keys(WEAPONS)).toHaveLength(38);
    for (const weapon of Object.values(WEAPONS)) expect(weapon.mastery).toBeTruthy();
  });

  it('quem tem e quantas: Bárbaro 2, Guerreiro 3, Paladino 2, Guardião 2, Ladino 2', () => {
    const counts = Object.fromEntries(
      CLASS_ORDER.map((id) => [id, CLASSES[id].weaponMastery?.count ?? 0]),
    );
    expect(counts).toMatchObject({ barbarian: 2, fighter: 3, paladin: 2, ranger: 2, rogue: 2 });
    for (const id of [
      'bard',
      'cleric',
      'druid',
      'monk',
      'sorcerer',
      'warlock',
      'wizard',
    ] as const) {
      expect(counts[id]).toBe(0);
    }
  });

  it('opções seguem o treinamento: Bárbaro só corpo a corpo; Ladino só Marciais com Acuidade ou Leve', () => {
    const barbarian = masteryOptions(CLASSES.barbarian);
    expect(barbarian.every((id) => !WEAPONS[id].ranged)).toBe(true);
    expect(barbarian).toContain('greataxe');
    const rogue = masteryOptions(CLASSES.rogue);
    expect(rogue).toContain('rapier');
    expect(rogue).toContain('shortbow');
    expect(rogue).not.toContain('greatsword');
    expect(masteryOptions(CLASSES.fighter)).toHaveLength(38);
    expect(masteryOptions(CLASSES.wizard)).toEqual([]);
  });

  it('sugestão vem do equipamento inicial', () => {
    expect(suggestedMasteries(CLASSES.barbarian, 'A')).toEqual(['greataxe', 'handaxe']);
    expect(suggestedMasteries(CLASSES.barbarian, 'B')).toEqual([]);
  });

  it('a etapa Classe exige a quantidade certa e trocar de classe limpa', () => {
    const d = completeDraft('fighter', (x) => void (x.weaponMasteries = ['greatsword']));
    expect(stepIssues(d, 'class')).toContain('weapon-mastery-count');
    d.weaponMasteries = ['greatsword', 'longbow', 'flail'];
    expect(stepIssues(d, 'class')).not.toContain('weapon-mastery-count');
    expect(withClass(d, 'rogue').weaponMasteries).toEqual([]);
    // Arma fora do treinamento não conta.
    const rogue = completeDraft(
      'rogue',
      (x) => void (x.weaponMasteries = ['greatsword', 'dagger']),
    );
    expect(stepIssues(rogue, 'class')).toContain('weapon-mastery-count');
  });

  it('a ficha marca as armas com maestria e explica o efeito', () => {
    const d = completeDraft('barbarian', (x) => void (x.weaponMasteries = ['greataxe', 'handaxe']));
    const sheet = buildCharacterSheet(d, ctx)!;
    const greataxe = sheet.weapons.find((w) => w.name.startsWith('Machado Grande'))!;
    expect(greataxe.properties).toContain('Maestria: Trespassar (você usa)');
    const feature = sheet.features.find((f) => f.name === 'Maestria em Arma')!;
    expect(feature.text).toContain('Machado Grande — Trespassar');
    expect(sheet.creation?.weaponMasteries).toEqual(['greataxe', 'handaxe']);
  });

  it('rascunho salvo: ids de arma desconhecidos somem', () => {
    const d = sanitizeDraft({ weaponMasteries: ['greataxe', 'espada-laser', 7, 'greataxe'] });
    expect(d.weaponMasteries).toEqual(['greataxe' satisfies WeaponId]);
  });
});

describe('Bruxo: Invocação Mística no nível 1', () => {
  it('é obrigatória e vai para a ficha', () => {
    const d = completeDraft('warlock', (x) => void (x.classOptionId = null));
    expect(stepIssues(d, 'class')).toContain('class-option-missing');
    d.classOptionId = 'pact-of-the-tome';
    expect(stepIssues(d, 'class')).toEqual([]);
    const sheet = buildCharacterSheet(d, ctx)!;
    expect(sheet.features.map((f) => f.name)).toContain('Invocação Mística: Pacto do Tomo');
    expect(sheet.creation?.classOptionId).toBe('pact-of-the-tome');
  });

  it('só invocações sem pré-requisito de nível', () => {
    expect(CLASSES.warlock.option?.choices.map((c) => c.id)).toEqual([
      'armor-of-shadows',
      'eldritch-mind',
      'pact-of-the-blade',
      'pact-of-the-chain',
      'pact-of-the-tome',
    ]);
  });
});
