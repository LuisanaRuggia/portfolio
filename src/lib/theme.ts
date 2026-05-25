import { useEffect, useState } from 'react';

/**
 * Imagen que puede tener una variante para tema claro y otra para tema oscuro.
 * Si es solo un string, se usa en ambos temas.
 *
 *   image: "/images/foo.png"                                    // mismo en ambos
 *   image: { light: "/foo-light.png", dark: "/foo-dark.png" }   // tema-aware
 */
export type ThemedImage = string | { light: string; dark: string };

/**
 * Hook reactivo: devuelve true cuando el HTML tiene la clase `dark`.
 * Escucha cambios via MutationObserver para re-renderizar al togglear tema.
 */
export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    // Sincroniza al montar por si el estado inicial cambió antes del effect
    update();
    return () => observer.disconnect();
  }, []);

  return isDark;
}

/**
 * Hook que resuelve una ThemedImage al URL apropiado para el tema actual.
 * Si la imagen es solo un string, devuelve ese mismo string sin importar el tema.
 */
export function useThemedImage(image: ThemedImage | undefined): string {
  const isDark = useIsDarkMode();
  if (!image) return '';
  if (typeof image === 'string') return image;
  return isDark ? image.dark : image.light;
}
