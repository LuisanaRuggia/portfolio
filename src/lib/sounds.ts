type SoundType = 'whoosh' | 'pop';

const SOUND_URLS: Record<SoundType, string> = {
  whoosh: `${import.meta.env.BASE_URL}sounds/folder-open.mp3`,
  pop: `${import.meta.env.BASE_URL}sounds/lightbox-open.mp3`,
};

const SOUND_VOLUMES: Record<SoundType, number> = {
  whoosh: 0.5,
  pop: 0.55,
};

const cache: Partial<Record<SoundType, HTMLAudioElement>> = {};
let masterVolume = 1;

function getAudio(type: SoundType): HTMLAudioElement {
  if (!cache[type]) {
    const audio = new Audio(SOUND_URLS[type]);
    audio.preload = 'auto';
    audio.volume = SOUND_VOLUMES[type] * masterVolume;
    cache[type] = audio;
  }
  return cache[type]!;
}

export function setSoundVolume(value: number) {
  masterVolume = Math.max(0, Math.min(1, value));
  for (const key of Object.keys(cache) as SoundType[]) {
    const audio = cache[key];
    if (audio) audio.volume = SOUND_VOLUMES[key] * masterVolume;
  }
}

export function playSound(type: SoundType) {
  if (masterVolume === 0) return;
  try {
    const audio = getAudio(type);
    audio.currentTime = 0;
    audio.play().catch((e) => {
      if (typeof console !== 'undefined') {
        console.debug('[sounds] play bloqueado:', e?.message ?? e);
      }
    });
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.warn('[sounds]', e);
    }
  }
}
