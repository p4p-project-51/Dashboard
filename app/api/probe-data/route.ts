import { NextResponse } from "next/server";

// Dummy data generation for probe data
function randomFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function smoothArray(arr: number[], windowSize: number): number[] {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    let sum = 0;
    let count = 0;
    for (
      let j = Math.max(0, i - Math.floor(windowSize / 2));
      j <= Math.min(arr.length - 1, i + Math.floor(windowSize / 2));
      j++
    ) {
      sum += arr[j];
      count++;
    }
    result.push(sum / count);
  }
  return result;
}

export async function GET() {
  const now = Math.floor(Date.now() / 1000);

  const data = Array.from({ length: 100 }, (_, i) => {
    const timestamp = now - 100 + i;
    const data = {
      timestamp,
      temperatures: Array.from({ length: 12 }, () => randomFloat(25, 70)),
      pumpVoltage: randomFloat(0.1, 2),
      pumpCurrent: randomFloat(0.5, 15),
      flowSensorCurrent: randomFloat(0, 0.2),
    };

    return {
      ...data,
      pumpPower: data.pumpVoltage * data.pumpCurrent,
    };
  });

  // Smooth each temperature probe across all timestamps
  const windowSize = 7; // You can adjust this for more/less smoothing
  for (let probeIdx = 0; probeIdx < 12; probeIdx++) {
    const probeTemps = data.map((d) => d.temperatures[probeIdx]);
    const smoothed = smoothArray(probeTemps, windowSize);
    for (let i = 0; i < data.length; i++) {
      data[i].temperatures[probeIdx] = smoothed[i];
    }
  }

  return NextResponse.json(data);
}
