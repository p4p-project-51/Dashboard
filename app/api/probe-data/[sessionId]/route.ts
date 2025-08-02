import { NextResponse } from "next/server";

const SESSION_IDS = ["A", "B", "C"];

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

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId || SESSION_IDS[0];

  // Use sessionId to generate different data (for demo, just seed random)
  let seed = 0;
  for (let i = 0; i < sessionId.length; ++i) seed += sessionId.charCodeAt(i);
  function seededRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  function seededRandomFloat(min: number, max: number) {
    return seededRandom() * (max - min) + min;
  }

  const data = Array.from({ length: 100 }, (_, i) => {
    const timestamp = i * 1000; // ms from zero
    const entry = {
      timestamp,
      temperatures: Array.from({ length: 12 }, () => seededRandomFloat(25, 70)),
      pumpVoltage: seededRandomFloat(0.1, 2),
      pumpCurrent: seededRandomFloat(0.5, 15),
      flowSensorCurrent: seededRandomFloat(0, 0.2),
    };
    return {
      ...entry,
      pumpPower: entry.pumpVoltage * entry.pumpCurrent,
    };
  });

  // Smooth each temperature probe across all timestamps
  const windowSize = 7;
  for (let probeIdx = 0; probeIdx < 12; probeIdx++) {
    const probeTemps = data.map((d) => d.temperatures[probeIdx]);
    const smoothed = smoothArray(probeTemps, windowSize);
    for (let i = 0; i < data.length; i++) {
      data[i].temperatures[probeIdx] = smoothed[i];
    }
  }

  return NextResponse.json(data);
}
