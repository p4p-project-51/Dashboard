// Color list for probe lines
export const colorList = [
  "#a6cee3",
  "#1f78b4",
  "#6fee00",
  "#33a02c",
  "#e31a1c",
  "#6a3d9a",
  "#c036db",
  "#ffa600",
  "#54D8B1",
  "#5785C1",
];

// Hash string to int
export function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Get color for a probe label
export function pinColor(text: string) {
  const hash = hashString(text);
  return colorList[hash % colorList.length];
}

const pinMapping = {
  "M2-C0": "L Resistor",
  "M2-C1": "R Resistor",

  "M2-C2": "Cold Air",
  "M2-C3": "Hot Air",

  "M3-C2": "Cold Inlet",
  "M3-C1": "Cold Outlet",

  "M3-C0": "Pump",

  "M1-C3": "Radiator Inlet",
  "M1-C1": "Radiator",
  "M1-C0": "Radiator Outlet",

  "M1-C2": "Flow Sensor",

  // Unmapped pins
  "M0-C0": "Unmapped",
  "M0-C1": "Unmapped",
  "M0-C2": "Unmapped",
  "M0-C3": "Unmapped",
  "M3-C3": "Unmapped",
};

/**
 * Map pin names to more user-friendly names
 *
 * @param pin Name of the pin - using module and channel
 * @returns Mapped name of the pin, or original if not found
 */
export function getPinMapping(pin: string) {
  return pinMapping[pin as keyof typeof pinMapping] || pin;
}

// Linear resistor correction constants for each pin
const linearResistorCorrectionConstants: { [key: string]: { K1: number; K2: number } } = {
  "M2-C0": { K1: 1.07698, K2: -1.4633 },
  "M2-C1": { K1: 1.08496, K2: -1.84465 },
  "M2-C2": { K1: 1.34557, K2: -8.36091 },
  "M2-C3": { K1: 1.04259, K2: -1.23235 },
  "M3-C2": { K1: 1.07361, K2: -1.37854 },
  "M3-C1": { K1: 1.07103, K2: -1.41727 },
  "M3-C0": { K1: 1.11959, K2: -2.69846 },
  "M1-C3": { K1: 1.00956, K2: 0.174502 },
  "M1-C1": { K1: 1.12847, K2: -2.64571 },
  "M1-C0": { K1: 1.09651, K2: -2.17814 },
  "M1-C2": { K1: 1.12058, K2: -2.53887 },
  "M0-C0": { K1: 1.0, K2: 0.0 },
  "M0-C1": { K1: 1.0, K2: 0.0 },
  "M0-C2": { K1: 1.0, K2: 0.0 },
  "M0-C3": { K1: 1.0, K2: 0.0 },
  "M3-C3": { K1: 1.0, K2: 0.0 },
};

/**
 * Convert ADC value to temperature in Celsius using the Steinhart-Hart equation
 * t_{NTC}\sim\frac{1}{\frac{1}{298.15}+\frac{K_{1}}{B_{25to100}}\cdot\ln\left(\frac{8200\cdot A_{ADC}}{R_{25}\cdot(K_{2}3300-K_{3}A_{ADC})}\right)}-273.15
 *
 * @param pin Name of the pin - using module and channel
 * @param adcValue ADC value read from the pin
 * @returns Temperature in Celsius
 */
export function calibration(pin: string, adcValue: number) {
  // Get calibration constants for the pin
  const steinhartHartK1 = 0.885882, steinhartHartK2 = 1.0226, steinhartHartK3 = 1.07537;

  // From datasheet of NTC 10k thermistor
  const R25 = 10000;
  const B_25to100 = 3950;

  // Absolute zero in Celsius
  const ABSOLUTE_ZERO_CELSIUS = -273.15;

  // \frac{1}{298.15}
  const value_1 = 1 / 298.15;
  // K_{1}\frac{1}{B_{25to100}}
  const value_2 = steinhartHartK1 / B_25to100;
  // \ln\left(\frac{8200\cdot X_{ADC}}{R_{25}\cdot(K_{2}3300-K_{3}X_{ADC})}\right)
  const value_3 = Math.log((8200 * adcValue) / (R25 * (steinhartHartK2 * 3300 - steinhartHartK3 * adcValue)));

  const temperatureKelvin = 1 / (value_1 + value_2 * value_3);
  const temperatureCelsius = temperatureKelvin + ABSOLUTE_ZERO_CELSIUS;

  // Apply linear resistor correction if constants exist for the pin
  const {K1, K2} = linearResistorCorrectionConstants[pin as keyof typeof linearResistorCorrectionConstants];
  return K1 * temperatureCelsius + K2;
}
