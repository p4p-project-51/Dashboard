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
};

// TODO: Add calibration constants for other pins
const calibrationConstants = {
  "M2-C1": {
    K1: 0.989883,
    K2: 1.00353,
    K3: 0.99463,
  },
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
 * t_{NTC}\sim\frac{1}{\frac{1}{298.15}+\frac{K_{1}}{B_{25to100}}\cdot\ln\left(\frac{8200\cdot X_{ADC}}{R_{25}\cdot(K_{2}3300-K_{3}X_{ADC})}\right)}-273.15
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
