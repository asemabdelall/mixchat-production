import { randomBytes } from 'crypto';

export interface AnonymousPersona {
  id: string;
  displayName: string;
  avatar: string;
  theme: string;
}

const PERSONA_NAMES = [
  'Nova',
  'Orbit',
  'Echo',
  'Atlas',
  'Cosmo',
  'Pulse',
  'Zenith',
  'Phantom',
  'Shadow',
  'Fox',
  'Hawk',
  'Falcon',
  'Lynx',
  'Vortex',
  'Cyber',
  'Neon',
  'Pixel',
  'Sonic',
  'Astral',
  'Eclipse',
  'Aurora',
  'Mirage',
  'Apex',
  'Sol',
  'Luna',
  'Vesper',
  'Orion',
  'Comet',
];

const THEME_GRADIENTS = [
  'from-purple-500 to-indigo-500',
  'from-cyan-400 to-blue-600',
  'from-pink-500 to-rose-600',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-600',
  'from-violet-500 to-fuchsia-600',
  'from-blue-500 to-teal-400',
  'from-rose-500 to-purple-600',
];

export class AnonymousPersonaGenerator {
  /**
   * Generates a randomized, opaque anonymous persona.
   * Guarantees zero correlation with real user identifiers.
   */
  static generate(excludeName?: string): AnonymousPersona {
    const id = `anon_p_${randomBytes(8).toString('hex')}`;

    // Pick name ensuring candidate doesn't get exact duplicate in the same room
    const pool = excludeName
      ? PERSONA_NAMES.filter((n) => `Anonymous ${n}` !== excludeName)
      : PERSONA_NAMES;

    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosenName = `Anonymous ${pool[randomIndex]}`;

    const themeIndex = Math.floor(Math.random() * THEME_GRADIENTS.length);
    const theme = THEME_GRADIENTS[themeIndex];

    const seed = randomBytes(4).toString('hex');
    const avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}&backgroundColor=090c15`;

    return {
      id,
      displayName: chosenName,
      avatar,
      theme,
    };
  }
}
