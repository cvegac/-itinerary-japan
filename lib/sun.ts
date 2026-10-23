// Salida y puesta del sol con la "ecuación del amanecer" (precisión ~1 min),
// calculada en el dispositivo: funciona sin conexión.
// https://en.wikipedia.org/wiki/Sunrise_equation

/** Japón no tiene horario de verano: siempre UTC+9 */
const JST_OFFSET_H = 9;
const RAD = Math.PI / 180;
const J2000 = 2451545;
const UNIX_EPOCH_JD = 2440587.5;
const DAY_MS = 86400000;

function hhmm(julian: number): string {
  const ms = (julian - UNIX_EPOCH_JD) * DAY_MS + JST_OFFSET_H * 3600000;
  const d = new Date(Math.round(ms / 60000) * 60000);
  return `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Salida y puesta del sol ("5:57", "16:44") en hora de Japón, para una fecha
 *  YYYY-MM-DD y un lugar [lat, lng] */
export function sunTimes(date: string, [lat, lng]: [number, number]): { sunrise: string; sunset: string } {
  const [y, m, d] = date.split("-").map(Number);
  const jdNoon = Date.UTC(y, m - 1, d, 12) / DAY_MS + UNIX_EPOCH_JD;
  const n = Math.ceil(jdNoon - J2000 + 0.0008);
  const meanSolarTime = n - lng / 360;
  const anomaly = (357.5291 + 0.98560028 * meanSolarTime) % 360;
  const center =
    1.9148 * Math.sin(anomaly * RAD) + 0.02 * Math.sin(2 * anomaly * RAD) + 0.0003 * Math.sin(3 * anomaly * RAD);
  const longitude = (anomaly + center + 180 + 102.9372) % 360;
  const transit =
    J2000 + meanSolarTime + 0.0053 * Math.sin(anomaly * RAD) - 0.0069 * Math.sin(2 * longitude * RAD);
  const declination = Math.asin(Math.sin(longitude * RAD) * Math.sin(23.4397 * RAD));
  // -0.833°: el borde superior del sol, con la refracción de la atmósfera
  const hourAngle = Math.acos(
    (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(declination)) /
      (Math.cos(lat * RAD) * Math.cos(declination))
  );
  const half = hourAngle / RAD / 360;
  return { sunrise: hhmm(transit - half), sunset: hhmm(transit + half) };
}
