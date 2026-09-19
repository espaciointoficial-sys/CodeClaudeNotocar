import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fromPsOutput,
  networkKindFromName,
  parseBsdNetstat,
  parseProcDiskstats,
  parseProcMeminfoCache,
  parseProcNetDev,
  parseWindowsNetstat,
  parseWindowsSample,
} from './systemMonitor.ts';
import { decodeProductState, parsePingOutput, parseProcNetRoute, parseSsid } from './systemParsers.ts';

test('lee los bytes de netstat -e aunque Windows esté en español', () => {
  const stdout = [
    'Estadisticas de interfaz',
    '',
    '                                 Recibidos        Enviados',
    '',
    'Bytes                            147461824       928797618',
    'Paquetes de unidifusion           25458696         5037462',
  ].join('\n');
  assert.deepEqual(parseWindowsNetstat(stdout), { received: 147461824, sent: 928797618 });
});

test('devuelve null si netstat -e no trae la fila de bytes', () => {
  assert.equal(parseWindowsNetstat('Interface Statistics\n\nno data here'), null);
});

test('suma las interfaces de /proc/net/dev y omite loopback', () => {
  const raw = [
    'Inter-|   Receive                                                |  Transmit',
    ' face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed',
    '    lo:  999999    1000    0    0    0     0          0         0   999999    1000    0    0    0     0       0          0',
    '  eth0:    1000      10    0    0    0     0          0         0     2000      20    0    0    0     0       0          0',
    '  wlan0:    500       5    0    0    0     0          0         0      700       7    0    0    0     0       0          0',
  ].join('\n');
  assert.deepEqual(parseProcNetDev(raw), { received: 1500, sent: 2700 });
});

test('suma Ibytes/Obytes de netstat -ib sin contar dos veces la misma interfaz', () => {
  const stdout = [
    'Name  Mtu   Network       Address            Ipkts Ierrs     Ibytes    Opkts Oerrs     Obytes  Coll',
    'lo0   16384 <Link#1>                          1000     0     500000     1000     0     500000     0',
    'en0   1500  <Link#4>      aa:bb:cc:dd:ee:ff   2000     0       1000     1500     0       2000     0',
    'en0   1500  192.168.1     192.168.1.20        2000     0       1000     1500     0       2000     0',
    'en1   1500  <Link#5>      aa:bb:cc:dd:ee:00    100     0        300      100     0        400     0',
  ].join('\n');
  assert.deepEqual(parseBsdNetstat(stdout), { received: 1300, sent: 2400 });
});

test('devuelve null si netstat -ib no tiene las columnas esperadas', () => {
  assert.equal(parseBsdNetstat('algo completamente distinto\nsin columnas'), null);
});

test('convierte la salida de ps en procesos con memoria en bytes', () => {
  const stdout = ['  1 /sbin/launchd  0.0  12345', ' 42 node          13.5   2048', 'linea basura'].join('\n');
  assert.deepEqual(fromPsOutput(stdout), [
    { pid: 1, name: 'launchd', cpuPercent: 0, memoryBytes: 12345 * 1024, diskBytesPerSecond: null },
    { pid: 42, name: 'node', cpuPercent: 13.5, memoryBytes: 2048 * 1024, diskBytesPerSecond: null },
  ]);
});

test('reconoce el tipo de conexión por el nombre del adaptador y no adivina cuando no lo sabe', () => {
  assert.equal(networkKindFromName('Wi-Fi'), 'wifi');
  assert.equal(networkKindFromName('wlan0'), 'wifi');
  assert.equal(networkKindFromName('Ethernet 2'), 'ethernet');
  assert.equal(networkKindFromName('eth0'), 'ethernet');
  assert.equal(networkKindFromName('tun0'), 'other');
});

// ---- Muestra de Windows ----
// Los contadores llegan acumulados en unidades de 100 ns; lo que se comprueba aquí es justamente
// esa aritmética de diferencias, que es donde un error pasaría desapercibido en pantalla.

const WINDOWS_SAMPLE = JSON.stringify({
  disk: { DiskReadBytesPersec: 1_000_000, DiskWriteBytesPersec: 2_000_000 },
  mem: { CacheBytes: 1024 },
  gpu: 0,
  gpuMem: 4096,
  // 4 s de CPU en unidades de 100 ns; el sufijo #2 lo añaden los contadores, no es parte del nombre.
  procs: [{ IDProcess: 10, Name: 'chrome#2', PercentProcessorTime: 0, WorkingSetPrivate: 500, IOReadBytesPersec: 0, IOWriteBytesPersec: 0 }],
});

test('la primera muestra de Windows no inventa porcentajes', () => {
  const { sample, state } = parseWindowsSample(WINDOWS_SAMPLE, 1_000_000, null, 4);
  assert.equal(sample.processes[0]?.cpuPercent, null);
  assert.equal(sample.processes[0]?.diskBytesPerSecond, null);
  assert.equal(sample.disk.readBytesPerSecond, null);
  assert.equal(sample.gpu.usagePercent, null);
  // Los datos que no son tasas sí están disponibles desde el primer momento.
  assert.equal(sample.processes[0]?.name, 'chrome');
  assert.equal(sample.processes[0]?.memoryBytes, 500);
  assert.equal(sample.memoryCacheBytes, 1024);
  assert.equal(sample.gpu.dedicatedMemoryBytes, 4096);
  assert.equal(state.processes.get(10)?.cpuTicks, 0);
});

test('la segunda muestra reparte los contadores acumulados sobre el tiempo transcurrido', () => {
  const first = parseWindowsSample(WINDOWS_SAMPLE, 1_000_000, null, 4);
  const second = JSON.stringify({
    disk: { DiskReadBytesPersec: 1_000_000 + 8_000_000, DiskWriteBytesPersec: 2_000_000 },
    mem: { CacheBytes: 1024 },
    // 2 s de uso de GPU en 4 s de reloj = 50 %.
    gpu: 2 * 1e7,
    gpuMem: 4096,
    procs: [
      {
        IDProcess: 10,
        Name: 'chrome#2',
        // 4 s de CPU en 4 s de reloj sobre 4 núcleos = 25 %.
        PercentProcessorTime: 4 * 1e7,
        WorkingSetPrivate: 500,
        IOReadBytesPersec: 400,
        IOWriteBytesPersec: 400,
      },
    ],
  });
  const { sample } = parseWindowsSample(second, 1_000_000 + 4000, first.state, 4);

  assert.equal(sample.processes[0]?.cpuPercent, 25);
  assert.equal(sample.processes[0]?.diskBytesPerSecond, 200);
  assert.equal(sample.disk.readBytesPerSecond, 2_000_000);
  assert.equal(sample.disk.writeBytesPerSecond, 0);
  assert.equal(sample.gpu.usagePercent, 50);
});

test('un contador que se reinicia no produce tasas negativas', () => {
  const first = parseWindowsSample(WINDOWS_SAMPLE, 1_000_000, null, 4);
  const restarted = JSON.stringify({
    disk: { DiskReadBytesPersec: 0, DiskWriteBytesPersec: 0 },
    mem: { CacheBytes: 1024 },
    gpu: 0,
    gpuMem: 4096,
    procs: [{ IDProcess: 10, Name: 'chrome', PercentProcessorTime: 0, WorkingSetPrivate: 500, IOReadBytesPersec: 0, IOWriteBytesPersec: 0 }],
  });
  const { sample } = parseWindowsSample(restarted, 1_000_000 + 4000, first.state, 4);
  assert.equal(sample.disk.readBytesPerSecond, 0);
  assert.equal(sample.processes[0]?.diskBytesPerSecond, 0);
});

test('suma los discos de /proc/diskstats sin contar dos veces sus particiones', () => {
  const raw = [
    '   7       0 loop0 10 0 20 0 0 0 0 0 0 0 0',
    '   8       0 sda 100 0 200 0 50 0 400 0 0 0 0',
    '   8       1 sda1 100 0 200 0 50 0 400 0 0 0 0',
    ' 259       0 nvme0n1 10 0 60 0 5 0 80 0 0 0 0',
    ' 259       1 nvme0n1p1 10 0 60 0 5 0 80 0 0 0 0',
  ].join('\n');
  // Solo cuentan sda y nvme0n1: (200 + 60) y (400 + 80) sectores de 512 bytes.
  assert.deepEqual(parseProcDiskstats(raw), { read: 260 * 512, write: 480 * 512 });
});

test('devuelve null si /proc/diskstats no trae ningún disco reconocible', () => {
  assert.equal(parseProcDiskstats('   7       0 loop0 10 0 20 0 0 0 0 0 0 0 0'), null);
});

test('suma Cached y Buffers de /proc/meminfo', () => {
  const raw = ['MemTotal:       16000000 kB', 'Buffers:            1000 kB', 'Cached:             2000 kB'].join('\n');
  assert.equal(parseProcMeminfoCache(raw), 3000 * 1024);
  assert.equal(parseProcMeminfoCache('MemTotal: 16000000 kB'), null);
});

// ---- Informe del equipo ----

test('interpreta solo los bits estables del estado del antivirus', () => {
  // 0x061100: protección activa y firmas al día (valor real de Windows Defender).
  assert.deepEqual(decodeProductState(0x061100), { enabled: true, upToDate: true });
  assert.deepEqual(decodeProductState(0x041010), { enabled: true, upToDate: false });
  assert.deepEqual(decodeProductState(0x040000), { enabled: false, upToDate: true });
});

test('lee el SSID conectado sin confundirlo con el BSSID del punto de acceso', () => {
  const stdout = [
    '    Nombre                   : Wi-Fi',
    '    Estado                   : conectado',
    '    SSID                     : MiRed-5G',
    '    AP BSSID                 : 6a:6c:9a:46:bd:d5',
  ].join('\n');
  assert.equal(parseSsid(stdout), 'MiRed-5G');
  assert.equal(parseSsid('    Estado : desconectado'), null);
});

test('decodifica la puerta de enlace de /proc/net/route invirtiendo los bytes', () => {
  const raw = [
    'Iface\tDestination\tGateway \tFlags\tRefCnt\tUse\tMetric\tMask\tMTU\tWindow\tIRTT',
    'wlan0\t0000FEA9\t00000000\t0001\t0\t0\t1000\t0000FFFF\t0\t0\t0',
    'wlan0\t00000000\t0101A8C0\t0003\t0\t0\t600\t00000000\t0\t0\t0',
  ].join('\n');
  assert.equal(parseProcNetRoute(raw), '192.168.1.1');
  assert.equal(parseProcNetRoute('Iface\tDestination\tGateway\n'), null);
});

test('promedia solo las líneas de respuesta de ping, en cualquier idioma', () => {
  const spanish = [
    'Haciendo ping a 192.168.1.1 con 32 bytes de datos:',
    'Respuesta desde 192.168.1.1: bytes=32 tiempo=2ms TTL=64',
    'Respuesta desde 192.168.1.1: bytes=32 tiempo=4ms TTL=64',
    '',
    'Estadisticas de ping para 192.168.1.1:',
    '    Minimo = 2ms, Maximo = 4ms, Media = 3ms',
  ].join('\n');
  // La línea de resumen no repite la dirección, así que queda fuera del filtro y sus mínimos y
  // máximos no se cuelan en la media: solo promedian las dos respuestas reales.
  assert.equal(parsePingOutput(spanish, '192.168.1.1'), 3);

  const unix = ['64 bytes from 10.0.0.1: icmp_seq=1 ttl=64 time=1.50 ms'].join('\n');
  assert.equal(parsePingOutput(unix, '10.0.0.1'), 1.5);
  assert.equal(parsePingOutput('Destino inaccesible.', '10.0.0.1'), null);
});
