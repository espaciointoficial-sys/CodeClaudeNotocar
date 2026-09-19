// Analizadores puros de la salida de las utilidades del sistema.
//
// Viven aparte de los servicios porque son la parte que de verdad puede fallar en silencio: campos
// de bits sin documentar, bytes en orden inverso y etiquetas que cada sistema traduce a su idioma.
// Al no depender de Electron ni de ninguna entrada/salida, se pueden comprobar con node:test.

/**
 * productState del centro de seguridad de Windows es un campo de bits sin documentación oficial,
 * pero dos de sus bits son estables y son los únicos que se interpretan aquí: 0x1000 indica que la
 * protección está activa y 0x10 que las firmas están anticuadas. El resto se ignora en lugar de
 * inventar un estado que luego se mostraría como si fuera seguro.
 */
export function decodeProductState(state: number): { enabled: boolean; upToDate: boolean } {
  return { enabled: (state & 0x1000) !== 0, upToDate: (state & 0x10) === 0 };
}

/**
 * Extrae el nombre de la red Wi-Fi conectada de "netsh wlan show interfaces". Windows traduce las
 * etiquetas de esa tabla, pero no la palabra "SSID". El ancla de principio de línea evita
 * confundirla con "AP BSSID", que es la dirección del punto de acceso y no interesa mostrar.
 */
export function parseSsid(stdout: string): string | null {
  const match = /^\s*SSID\s*:\s*(\S.*?)\s*$/m.exec(stdout);
  return match?.[1] ?? null;
}

/**
 * La puerta de enlace en Linux está en /proc/net/route, en hexadecimal y con los bytes en el orden
 * del procesador (al revés). La ruta por defecto es la que tiene destino 00000000.
 */
export function parseProcNetRoute(raw: string): string | null {
  for (const line of raw.split('\n').slice(1)) {
    const columns = line.trim().split(/\s+/);
    const hex = columns[2];
    if (columns[1] !== '00000000' || !hex || !/^[0-9A-Fa-f]{8}$/.test(hex)) continue;
    const octets: number[] = [];
    for (let index = 6; index >= 0; index -= 2) octets.push(parseInt(hex.slice(index, index + 2), 16));
    const address = octets.join('.');
    if (address !== '0.0.0.0') return address;
  }
  return null;
}

/**
 * Promedia los tiempos de las líneas de respuesta de "ping". Se filtra por la dirección de destino
 * porque es lo único que no traduce ningún sistema: las etiquetas ("tiempo", "time", "Media"…)
 * cambian con el idioma, la dirección no. Las líneas de resumen quedan fuera por ese mismo filtro,
 * que si no contarían dos veces los mismos milisegundos.
 */
export function parsePingOutput(stdout: string, target: string): number | null {
  const samples: number[] = [];
  for (const line of stdout.split('\n')) {
    if (!line.includes(target)) continue;
    for (const match of line.matchAll(/([\d.]+)\s*ms/g)) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) samples.push(value);
    }
  }
  if (samples.length === 0) return null;
  return samples.reduce((total, value) => total + value, 0) / samples.length;
}
