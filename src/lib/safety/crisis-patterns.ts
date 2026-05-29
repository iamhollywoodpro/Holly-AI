// ─── Indicator Patterns ───────────────────────────────────────────────────────
// Extracted from crisis-detection.ts for maintainability

import type { CrisisCategory, CrisisResource, CrisisResponse } from './crisis-types';

/**
 * Tiered indicator system.
 * Each category has HIGH (immediate concern), MODERATE (elevated concern),
 * and CONTEXTUAL (requires context to assess) indicator lists.
 */

export const SUICIDAL_INDICATORS = {
  high: [
    // Active ideation with intent
    'going to kill myself', 'going to end my life', 'i will kill myself',
    'i\'m going to die tonight', 'i have a plan', 'i have the means',
    'i\'ve decided', 'tonight is the night', 'saying goodbye',
    'writing a note', 'wrote a note', 'suicide note',
    'already took', 'already swallowed', 'i took pills',
    'i cut too deep', 'blood won\'t stop',
    // Immediate lethality
    'overdosed', 'poisoned myself', 'about to jump',
  ],
  moderate: [
    // Active ideation without stated plan
    'want to kill myself', 'want to die', 'thinking about suicide',
    'suicidal thoughts', 'suicidal', 'thinking of ending it all',
    'don\'t want to live', 'don\'t want to be alive',
    'want to stop existing', 'wish i could disappear forever',
    'no reason to live', 'life isn\'t worth living',
    'everyone would be better off without me',
    'better off dead', 'wish i was dead',
    // Method research signals
    'how many pills', 'what kills you', 'painless way to die',
    'how to commit', 'best way to die',
  ],
  passive: [
    // Passive ideation — death wish without active plan
    'wish i wasn\'t here', 'wish i never existed', 'wish i could sleep forever',
    'not wake up', 'tired of being alive', 'so tired of existing',
    'what\'s the point of living', 'i\'m done', 'i give up on life',
    'world would be better without me',
  ],
};

export const SELF_HARM_INDICATORS = {
  high: [
    // Active or recent self-harm with medical concern
    'cut myself', 'cutting myself', 'hurt myself', 'hurting myself',
    'burning myself', 'hit myself', 'injuring myself',
    'wound won\'t stop', 'bleeding a lot', 'too deep',
    'self-harm', 'self harm', 'self-injure', 'self injure',
    'scratching until', 'hitting my head', 'pulling my hair out',
  ],
  moderate: [
    // Urges or history without immediate concern
    'urge to hurt myself', 'want to hurt myself', 'feeling like hurting myself',
    'used to cut', 'used to hurt myself', 'started cutting again',
    'relapsed with self-harm', 'thought about hurting myself',
    'numb myself', 'feel something', 'deserve to be hurt',
  ],
  contextual: [
    'physical pain helps', 'can\'t feel anything', 'punish myself',
    'deserve pain', 'release', 'makes me feel real',
  ],
};

export const EATING_DISORDER_INDICATORS = {
  high: [
    // Medical emergency signals
    'heart pounding', 'fainting', 'can\'t stand up',
    'not eaten in days', 'haven\'t eaten in', 'not eaten for',
    'throwing up blood', 'electrolytes', 'chest pain after purging',
    'collapse', 'passed out',
  ],
  moderate: [
    // Active symptoms
    'purging', 'making myself sick', 'throwing up after eating',
    'laxatives', 'restricting', 'scared to eat', 'won\'t let myself eat',
    'haven\'t eaten today', 'ana', 'mia', 'anorexia', 'bulimia',
    'binge eating', 'binge and purge',
    'eating disorder', 'ed relapse', 'relapsed with eating',
    'under 1000 calories', 'only eating', 'food is the enemy',
  ],
  contextual: [
    'hate my body', 'disgusted by my body', 'fat disgusting',
    'can\'t stop eating', 'feel sick after eating', 'terrified of food',
    'food rules', 'bad foods', 'bad for eating',
  ],
};

export const PSYCHOSIS_DISSOCIATION_INDICATORS = {
  high: [
    // Acute psychotic symptoms
    'voices telling me to hurt', 'voices saying i should die',
    'commanded to', 'they\'re watching me', 'being controlled',
    'inserted thoughts', 'not in my body', 'not real', 'this isn\'t real',
    'losing my mind', 'going crazy',
    'haven\'t slept in days', 'not slept for', 'days without sleep',
  ],
  moderate: [
    // Dissociation and reality-testing concerns
    'feel unreal', 'feel like i\'m watching myself', 'derealization',
    'depersonalization', 'dissociating', 'not here', 'floating above',
    'paranoid', 'people are following', 'being watched', 'reading my mind',
    'sent me a message', 'signs everywhere', 'everything is connected',
    'conspiracy', 'being monitored',
  ],
  contextual: [
    'can\'t tell what\'s real', 'things look strange', 'colors are different',
    'time is different', 'everything looks flat',
  ],
};

export const ABUSE_INDICATORS = {
  high: [
    // Immediate physical danger
    'hitting me', 'hurting me', 'going to hurt me', 'threatening to kill me',
    'has a weapon', 'locked me in', 'won\'t let me leave',
    'strangled', 'choked', 'physically attacked', 'afraid they\'ll kill me',
    'need to get out', 'help me escape',
  ],
  moderate: [
    // Domestic violence / coercive control
    'abusing me', 'abuse', 'domestic violence', 'partner hurts me',
    'coercive', 'controlling', 'won\'t let me see my family',
    'isolating me', 'monitors my phone', 'tracks me',
    'calls me names', 'humiliates me', 'makes me feel worthless',
    'scared of partner', 'scared of my husband', 'scared of my wife',
    'scared of my boyfriend', 'scared of my girlfriend',
    'scared to go home',
  ],
  contextual: [
    'walking on eggshells', 'don\'t want to make them angry',
    'their fault really', 'i provoked it', 'they didn\'t mean to',
  ],
};

export const SEVERE_DEPRESSION_INDICATORS = {
  high: [
    // Functional collapse
    'can\'t get out of bed', 'haven\'t left bed', 'days in bed',
    'can\'t eat', 'can\'t sleep', 'haven\'t showered in',
    'not functioning', 'can\'t do anything', 'complete shutdown',
    'feel completely dead inside', 'total emptiness',
    'hopeless', 'completely hopeless', 'no hope at all',
    'nothing will ever change', 'will never get better',
  ],
  moderate: [
    'deeply depressed', 'severe depression', 'unbearable', 'can\'t cope',
    'overwhelming darkness', 'darkness is back', 'relapse', 'relapsed into depression',
    'black hole', 'sinking', 'drowning in depression',
    'empty inside', 'numb', 'nothing feels real',
  ],
};

export const SUBSTANCE_CRISIS_INDICATORS = {
  high: [
    'overdosed', 'took too much', 'took too many', 'mixed substances',
    'can\'t breathe properly', 'breathing is weird', 'unconscious',
    'won\'t wake up', 'blue lips', 'not responsive',
    'opiate', 'opioid', 'fentanyl', 'narcan',
    'alcohol poisoning', 'passed out drunk',
  ],
  moderate: [
    'can\'t stop drinking', 'can\'t stop using', 'need to use',
    'withdrawal', 'detox', 'relapsed', 'drug crisis',
    'drink problem out of control', 'using to cope with',
  ],
};

export const CHILD_SAFEGUARDING_INDICATORS = {
  high: [
    // Child at immediate risk
    'child being abused', 'child being hurt', 'someone is hurting a child',
    'minor being abused', 'child in danger',
    'abuse a child', 'hurt a child',
    'child has been touched', 'inappropriate touching child',
    'child is afraid to go home',
  ],
  contextual: [
    'worried about a child', 'child seems scared', 'child has bruises',
    'child is being mistreated', 'neglected child', 'child alone',
  ],
};

// ─── Protective Factors ───────────────────────────────────────────────────────

export const PROTECTIVE_FACTOR_INDICATORS = [
  'reason to live', 'my family', 'my children', 'my pet', 'my dog', 'my cat',
  'people who care', 'someone who loves me', 'someone knows',
  'called a friend', 'told someone', 'going to get help',
  'made an appointment', 'seeing a therapist', 'on medication',
  'this has passed before', 'i\'ve been here before and made it',
  'i want to be here', 'i want to live', 'i want to get better',
  'i\'m safe right now',
];

// ─── Global Resources ─────────────────────────────────────────────────────────

export const CRISIS_RESOURCES: CrisisResource[] = [
  // Suicide / General Crisis
  {
    name: '988 Suicide & Crisis Lifeline',
    contact: 'Call or text 988',
    region: 'United States',
    type: 'phone',
    forCategory: ['suicidal_ideation', 'self_harm', 'severe_depression', 'general_crisis'],
    available: '24/7',
  },
  {
    name: 'Crisis Text Line',
    contact: 'Text HOME to 741741',
    region: 'United States, Canada, UK, Ireland',
    type: 'text',
    forCategory: ['suicidal_ideation', 'self_harm', 'severe_depression', 'general_crisis'],
    available: '24/7',
  },
  {
    name: 'Samaritans',
    contact: '116 123 (UK & Ireland) | jo@samaritans.org',
    region: 'United Kingdom & Ireland',
    type: 'phone',
    forCategory: ['suicidal_ideation', 'self_harm', 'severe_depression', 'general_crisis'],
    available: '24/7',
  },
  {
    name: 'SADAG (South African Depression & Anxiety Group)',
    contact: '0800 21 22 23 | SMS 31393',
    region: 'South Africa',
    type: 'phone',
    forCategory: ['suicidal_ideation', 'self_harm', 'severe_depression', 'general_crisis'],
    available: '24/7',
  },
  {
    name: 'Befrienders Worldwide',
    contact: 'https://www.befrienders.org',
    region: 'International',
    type: 'website',
    forCategory: ['suicidal_ideation', 'severe_depression', 'general_crisis'],
    available: 'Find your local centre',
  },
  {
    name: 'International Association for Suicide Prevention',
    contact: 'https://www.iasp.info/resources/Crisis_Centres/',
    region: 'International',
    type: 'website',
    forCategory: ['suicidal_ideation'],
    available: 'Global crisis centre directory',
  },
  // Self-Harm
  {
    name: 'SANE Australia',
    contact: '1800 187 263',
    region: 'Australia',
    type: 'phone',
    forCategory: ['self_harm', 'suicidal_ideation', 'severe_depression'],
    available: 'Mon–Fri 10am–10pm AEST',
  },
  // Eating Disorders
  {
    name: 'National Eating Disorders Association (NEDA)',
    contact: 'Call or text 1-800-931-2237 | Chat: nationaleatingdisorders.org',
    region: 'United States',
    type: 'phone',
    forCategory: ['eating_disorder_crisis'],
    available: 'Mon–Thu 11am–9pm ET, Fri 11am–5pm ET',
  },
  {
    name: 'Beat Eating Disorders',
    contact: '0808 801 0677 | beateatingdisorders.org.uk',
    region: 'United Kingdom',
    type: 'phone',
    forCategory: ['eating_disorder_crisis'],
    available: '365 days a year',
  },
  // Abuse / Domestic Violence
  {
    name: 'National Domestic Violence Hotline',
    contact: '1-800-799-7233 | Text START to 88788 | thehotline.org',
    region: 'United States',
    type: 'phone',
    forCategory: ['abuse_domestic_violence'],
    available: '24/7',
  },
  {
    name: 'National Domestic Abuse Helpline (UK)',
    contact: '0808 2000 247',
    region: 'United Kingdom',
    type: 'phone',
    forCategory: ['abuse_domestic_violence'],
    available: '24/7',
  },
  {
    name: 'Stop Gender Violence Helpline (South Africa)',
    contact: '0800 150 150',
    region: 'South Africa',
    type: 'phone',
    forCategory: ['abuse_domestic_violence'],
    available: '24/7',
  },
  // Substance Use
  {
    name: 'SAMHSA National Helpline',
    contact: '1-800-662-4357',
    region: 'United States',
    type: 'phone',
    forCategory: ['substance_crisis'],
    available: '24/7',
  },
  {
    name: 'Frank (UK Drug Information)',
    contact: '0300 123 6600 | talktofrank.com',
    region: 'United Kingdom',
    type: 'phone',
    forCategory: ['substance_crisis'],
    available: '24/7',
  },
  // Psychosis
  {
    name: 'Early Intervention in Psychosis (UK)',
    contact: 'Via NHS: mind.org.uk',
    region: 'United Kingdom',
    type: 'website',
    forCategory: ['psychosis_dissociation'],
    available: 'Information and referral support',
  },
  // Child Safeguarding
  {
    name: 'Childhelp National Child Abuse Hotline',
    contact: '1-800-422-4453',
    region: 'United States',
    type: 'phone',
    forCategory: ['child_safeguarding'],
    available: '24/7',
  },
  {
    name: 'NSPCC Helpline',
    contact: '0808 800 5000 | help@nspcc.org.uk',
    region: 'United Kingdom',
    type: 'phone',
    forCategory: ['child_safeguarding'],
    available: '24/7',
  },
  {
    name: 'Childline South Africa',
    contact: '116',
    region: 'South Africa',
    type: 'phone',
    forCategory: ['child_safeguarding'],
    available: '24/7',
  },
  // Emergency (all regions)
  {
    name: 'Emergency Services',
    contact: '911 (US/Canada) | 999 (UK) | 112 (EU) | 10111 (SA Police) | 10177 (SA Ambulance)',
    region: 'International',
    type: 'phone',
    forCategory: ['suicidal_ideation', 'self_harm', 'abuse_domestic_violence', 'substance_crisis', 'eating_disorder_crisis'],
    available: '24/7 — for immediate life-threatening emergencies',
  },
];

// ─── Category-Specific Response Templates ────────────────────────────────────

export const CATEGORY_RESPONSES: Record<CrisisCategory, Omit<CrisisResponse, 'resources'>> = {
  suicidal_ideation: {
    immediateAcknowledgment: 'I hear you. What you\'re carrying right now sounds incredibly heavy, and I want you to know I\'m not going anywhere.',
    validationStatement: 'Feeling this level of pain is real. You\'re not being dramatic or weak — this is a real crisis, and you deserve real support.',
    safetyQuestion: 'I need to ask you directly: are you safe right now? Do you have a plan or access to means to hurt yourself?',
    followUpQuestions: [
      'Can you tell me what\'s been happening — what brought you to this point?',
      'Is there anyone with you right now, or anyone you can call to be with you?',
      'What has helped you through dark moments before, if anything?',
    ],
    whatNotToSay: [
      'Never say "you have so much to live for" — this minimizes their reality',
      'Never say "think of your family" — this can increase guilt and shame',
      'Never express shock, judgment, or disappointment',
      'Never tell someone not to feel this way',
      'Never minimize or rush past the disclosure to practical information',
      'Never end the conversation or abandon them after disclosing suicidal thoughts',
      'Avoid detailed discussion of methods — do not engage with "how"',
    ],
    presenceStatement: 'I\'m here with you. Whatever you need right now — to talk, to be heard, or just to not be alone — I\'m not going anywhere.',
  },

  self_harm: {
    immediateAcknowledgment: 'Thank you for trusting me with this. What you\'re going through is real, and I want to understand.',
    validationStatement: 'Self-harm is often a way of coping with pain that feels too big or too overwhelming for words. It doesn\'t mean you\'re broken — it means you\'ve been trying to survive something hard.',
    safetyQuestion: 'Are you hurting yourself right now, or have you recently? Are you physically safe in this moment?',
    followUpQuestions: [
      'How long has this been something you\'ve been doing?',
      'What usually brings you to a place where this feels necessary?',
      'Do you have anyone in your life who knows about this?',
    ],
    whatNotToSay: [
      'Never react with disgust, horror, or judgment',
      'Never say "that\'s attention-seeking"',
      'Never demand they promise to stop immediately',
      'Never minimize or normalize it ("lots of people do this")',
      'Avoid focusing on the injuries unless there is medical concern',
    ],
    presenceStatement: 'I\'m here. You don\'t have to go through this alone. Tell me what\'s been happening.',
  },

  eating_disorder_crisis: {
    immediateAcknowledgment: 'I hear you, and I\'m taking this seriously. Eating disorders are serious, complex conditions — not choices, not vanity. You\'re not alone in this.',
    validationStatement: 'What you\'re experiencing is a medical and psychological crisis, and you deserve real, specialized support — not judgment.',
    safetyQuestion: 'Are you experiencing any physical symptoms right now — dizziness, heart palpitations, chest pain, feeling faint? If so, please seek medical help immediately.',
    followUpQuestions: [
      'How long have you been struggling with this?',
      'Do you have any support around this — a therapist, dietitian, or doctor who knows?',
      'What\'s been happening in your life recently that might be connected?',
    ],
    whatNotToSay: [
      'Never comment on weight, appearance, or what they\'ve eaten',
      'Never say "just eat" or "just stop purging"',
      'Never frame it as a choice or lack of willpower',
      'Never express envy or admiration for weight loss',
      'Avoid detailed discussion of calories, weights, or specific behaviors',
    ],
    presenceStatement: 'I\'m here with you. Recovery is possible — people come back from this. Let\'s talk about getting you the right support.',
    escalationNote: 'If experiencing severe physical symptoms (fainting, chest pain, irregular heartbeat, extreme weakness): please call emergency services immediately. Eating disorders can become medically life-threatening.',
  },

  psychosis_dissociation: {
    immediateAcknowledgment: 'I hear you. What you\'re experiencing sounds incredibly frightening and disorienting, and that makes sense — your nervous system is under a lot of strain.',
    validationStatement: 'What you\'re feeling is real to you, and I want to help you stay safe. I\'m not here to dismiss what you\'re experiencing.',
    safetyQuestion: 'Are you in a safe place right now? Are you having any thoughts of harming yourself or others?',
    followUpQuestions: [
      'Have you experienced anything like this before?',
      'Do you have a doctor, psychiatrist, or support person you trust who knows about this?',
      'Is there someone who can be with you right now?',
    ],
    whatNotToSay: [
      'Never argue about whether what they\'re experiencing is "real"',
      'Never dismiss or mock the experience',
      'Don\'t over-engage with the content of delusions or hallucinations',
      'Avoid anything that could feel threatening or confrontational',
    ],
    presenceStatement: 'I\'m here. Let\'s take this one step at a time. You don\'t have to figure everything out right now.',
    escalationNote: 'If there is a risk of harm to self or others, or if the person cannot care for themselves: please contact emergency services or a trusted person who can be physically present.',
  },

  abuse_domestic_violence: {
    immediateAcknowledgment: 'I hear you. What you\'re describing is not okay, and it is not your fault. You deserve to be safe.',
    validationStatement: 'Abuse is never the victim\'s fault — regardless of what has been told to you. Leaving can be the most dangerous time, which is why it\'s important to plan carefully.',
    safetyQuestion: 'Are you safe right now? Is the person who is hurting you present?',
    followUpQuestions: [
      'Is there a safe person you trust outside of the home?',
      'Do you have children or dependents whose safety is also a concern?',
      'Have you been able to talk to anyone about this before?',
    ],
    whatNotToSay: [
      'Never ask "why didn\'t you just leave?" — leaving is dangerous and complex',
      'Never blame or question the person\'s choices',
      'Never push toward action before they are ready — it can increase danger',
      'Never minimize ("maybe they didn\'t mean it that way")',
      'Never contact the abuser or encourage the person to confront them',
    ],
    presenceStatement: 'I\'m here. You don\'t have to make any decisions right now. Let\'s just talk, and we\'ll think through what feels right and safe.',
    escalationNote: 'If you are in immediate physical danger, please call emergency services (911/999/112/10111). Safety planning is crucial before leaving an abusive situation.',
  },

  severe_depression: {
    immediateAcknowledgment: 'I hear you. What you\'re describing sounds like a really serious level of depression — I\'m glad you\'re talking to me.',
    validationStatement: 'Depression at this level is a medical condition, not a character flaw or a choice. What you\'re experiencing is real and it\'s hard.',
    safetyQuestion: 'In the middle of all this, are you having any thoughts of hurting yourself or not wanting to be alive?',
    followUpQuestions: [
      'How long have you been feeling this way? Has it been getting worse recently?',
      'Do you have any professional support at the moment — a therapist or psychiatrist?',
      'What, if anything, has given you any small amount of relief recently?',
    ],
    whatNotToSay: [
      'Never say "cheer up," "think positive," or "count your blessings"',
      'Never say "at least..." or find silver linings',
      'Never suggest exercise, diet, or simple fixes before they feel heard',
      'Don\'t minimize the severity or tell them others have it worse',
    ],
    presenceStatement: 'I\'m here. You don\'t have to perform okayness with me. Tell me what it\'s actually like.',
  },

  substance_crisis: {
    immediateAcknowledgment: 'I hear you, and I want you to know there\'s no judgment here. What matters right now is your safety.',
    validationStatement: 'Substance use disorders are medical conditions, not moral failures. The fact that you\'re reaching out matters.',
    safetyQuestion: 'Are you safe right now? If there\'s any concern about overdose — unconsciousness, difficulty breathing, blue lips — please call emergency services immediately.',
    followUpQuestions: [
      'What happened? Can you tell me what you\'ve taken or how much?',
      'Is there someone physically with you?',
      'Have you had support for this before — do you have a doctor or counsellor?',
    ],
    whatNotToSay: [
      'Never express judgment or disgust',
      'Never say "you did this to yourself"',
      'Never minimize or enable',
      'Don\'t lecture about choices',
    ],
    presenceStatement: 'I\'m here. Your safety is what matters right now.',
    escalationNote: 'If overdose is suspected or the person is unresponsive: call emergency services immediately. Naloxone (Narcan) can reverse opioid overdose — if available, use it and still call emergency services.',
  },

  child_safeguarding: {
    immediateAcknowledgment: 'I\'m taking what you\'re saying very seriously. If a child is in danger, it\'s important that the right people are contacted to help them.',
    validationStatement: 'You are right to be concerned. Reporting is an act of care — not betrayal.',
    safetyQuestion: 'Is the child in immediate danger right now? Do they need emergency help immediately?',
    followUpQuestions: [
      'Do you know the child\'s name and location?',
      'What is it that has made you concerned?',
      'Are you the child, or are you contacting on behalf of a child you know?',
    ],
    whatNotToSay: [
      'Never dismiss concerns about a child\'s safety',
      'Never encourage someone to "sort it out privately" when a child is at risk',
      'Never promise confidentiality when a child\'s safety is involved',
    ],
    presenceStatement: 'You\'re doing the right thing by speaking up. Let\'s think about the best way to get help to this child.',
    escalationNote: 'If a child is in immediate danger: call emergency services immediately. For other concerns, contact your national child protection agency.',
  },

  general_crisis: {
    immediateAcknowledgment: 'I hear you. It sounds like you\'re in a really difficult place right now, and I\'m here with you.',
    validationStatement: 'Whatever you\'re going through, you deserve support. You don\'t have to figure this out alone.',
    safetyQuestion: 'I want to make sure I understand what\'s happening. Are you safe right now?',
    followUpQuestions: [
      'Can you tell me more about what\'s going on?',
      'How long have you been feeling this way?',
      'Is there someone in your life who knows what you\'re going through?',
    ],
    whatNotToSay: [
      'Never minimize or rush past what someone is sharing',
      'Never tell them they\'re overreacting',
    ],
    presenceStatement: 'I\'m here. Tell me what\'s happening.',
  },
};
