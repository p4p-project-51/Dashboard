const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(__dirname, '../data/sessions');
const OUTPUT_DIR = path.join(__dirname, '../data/sessions-calibrated');

// TODO: Import these from pinData.ts
const linearResistorCorrectionConstants = {
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
 * 
 * @param {string} pin - Name of the pin - using module and channel
 * @param {number} adcValue - ADC value read from the pin
 * @returns {number} Temperature in Celsius
 */
function calibration(pin, adcValue) {
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
  const constants = linearResistorCorrectionConstants[pin] || { K1: 1.0, K2: 0.0 };
  const { K1, K2 } = constants;
  return K1 * temperatureCelsius + K2;
}

/**
 * Parse a CSV line into an array of values
 * 
 * @param {string} line - CSV line
 * @returns {string[]} Array of values
 */
function parseCSVLine(line) {
  return line.split(',').map(value => value.trim());
}

/**
 * Process a single CSV file and apply calibration
 * 
 * @param {string} inputPath - Path to input CSV file
 * @param {string} outputPath - Path to output CSV file
 */
function processCSVFile(inputPath, outputPath) {
  console.log(`Processing: ${path.basename(inputPath)}`);
  
  try {
    // Read the file
    const content = fs.readFileSync(inputPath, 'utf-8');
    const lines = content.trim().split('\n');
    
    if (lines.length === 0) {
      console.warn(`  Skipping empty file: ${path.basename(inputPath)}`);
      return;
    }
    
    // Parse header
    const header = parseCSVLine(lines[0]);
    const pinNames = header.slice(1); // Skip 'Timestamp' column
    
    // Process data rows
    const outputLines = [lines[0]]; // Keep original header
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      if (values.length !== header.length) {
        console.warn(`  Skipping malformed line ${i + 1}`);
        continue;
      }
      
      const timestamp = values[0];
      const calibratedValues = [timestamp];
      
      // Apply calibration to each ADC value
      for (let j = 0; j < pinNames.length; j++) {
        const pinName = pinNames[j];
        const adcValue = parseFloat(values[j + 1]);
        
        if (isNaN(adcValue)) {
          calibratedValues.push(values[j + 1]); // Keep original if not a number
        } else {
          const calibratedTemp = calibration(pinName, adcValue);
          calibratedValues.push(calibratedTemp.toFixed(4));
        }
      }
      
      outputLines.push(calibratedValues.join(','));
    }
    
    // Write calibrated data
    fs.writeFileSync(outputPath, outputLines.join('\n') + '\n', 'utf-8');
    console.log(`  ✓ Calibrated ${lines.length - 1} data points`);
    
  } catch (error) {
    console.error(`  Error processing file: ${error.message}`);
  }
}

/**
 * Main function to process all CSV files in the sessions directory
 */
function main() {
  console.log('CSV Calibration Script\n');
  console.log('======================\n');
  
  // Check if sessions directory exists
  if (!fs.existsSync(SESSIONS_DIR)) {
    console.error(`Error: Sessions directory not found: ${SESSIONS_DIR}`);
    process.exit(1);
  }
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}\n`);
  }
  
  // Get all CSV files
  const files = fs.readdirSync(SESSIONS_DIR)
    .filter(file => file.endsWith('.csv'))
    .sort();
  
  if (files.length === 0) {
    console.log('No CSV files found in sessions directory.');
    return;
  }
  
  console.log(`Found ${files.length} CSV files to process.\n`);
  
  // Process each file
  let successCount = 0;
  for (const file of files) {
    const inputPath = path.join(SESSIONS_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);
    
    try {
      processCSVFile(inputPath, outputPath);
      successCount++;
    } catch (error) {
      console.error(`Failed to process ${file}:`, error.message);
    }
  }
  
  console.log(`\n======================`);
  console.log(`Completed: ${successCount}/${files.length} files processed successfully.`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { calibration, processCSVFile };
