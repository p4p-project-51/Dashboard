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

// TODO: Add calibration constants for other pins
const calibrationConstants = {
  // Left Resistor
  "M2-C0": {
    K1: 0.86306,
    K2: 1.03037,
    K3: 1.0947,
  },
  // Right Resistor
  "M2-C1": {
    K1: 0.818337,
    K2: 1.14433,
    K3: 1.31145,
  },

  // Cold Air
  "M2-C2": {
    K1: 0.85,
    K2: 1,
    K3: 1,
  },
  // Hot Air
  "M2-C3": {
    K1: 0.85,
    K2: 1,
    K3: 1,
  },

  // Cold Plate Inlet
  "M3-C2": {
    K1: 0.806586,
    K2: 1.17916,
    K3: 1.36308,
  },
  // Cold Plate Outlet
  "M3-C1": {
    K1: 0.891801,
    K2: 1.00846,
    K3: 1.05692,
  },


  // Pump
  "M3-C0": {
    K1: 0.910931,
    K2: 1.00027,
    K3: 1.03252,
  },

  // Radiator Inlet
  "M1-C3": {
    K1: 0.858399,
    K2: 1.01705,
    K3: 1.05479,
  },
  // Radiator
  "M1-C1": {
    K1: 0.831239,
    K2: 1.12586,
    K3: 1.26313,
  },
  // Radiator Outlet
  "M1-C0": {
    K1: 0.76485,
    K2: 1.26017,
    K3: 1.51104,
  },

  // Flow Sensor
  "M1-C2": {
    K1: 0.841157,
    K2: 1.0913,
    K3: 1.1934,
  },

  // Unmapped pins
  "M0-C0": { K1: 1, K2: 1, K3: 1 },
  "M0-C1": { K1: 1, K2: 1, K3: 1 },
  "M0-C2": { K1: 1, K2: 1, K3: 1 },
  "M0-C3": { K1: 1, K2: 1, K3: 1 },
  "M3-C3": { K1: 1, K2: 1, K3: 1 },
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
  const { K1, K2, K3 } =
    calibrationConstants[pin as keyof typeof calibrationConstants];

  // From datasheet of NTC 10k thermistor
  const R25 = 10000;
  const B_25to100 = 3950;

  // Absolute zero in Celsius
  const ABSOLUTE_ZERO_CELSIUS = -273.15;

  // \frac{1}{298.15}
  const value_1 = 1 / 298.15;
  // K_{1}\frac{1}{B_{25to100}}
  const value_2 = K1 / B_25to100;
  // \ln\left(\frac{8200\cdot X_{ADC}}{R_{25}\cdot(K_{2}3300-K_{3}X_{ADC})}\right)
  const value_3 = Math.log((8200 * adcValue) / (R25 * (K2 * 3300 - K3 * adcValue)));

  const temperatureKelvin = 1 / (value_1 + value_2 * value_3);
  const temperatureCelsius = temperatureKelvin + ABSOLUTE_ZERO_CELSIUS;

  return temperatureCelsius;
}
