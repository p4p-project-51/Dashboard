import { NextResponse } from "next/server";

function randomFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export async function GET() {
  // Generate 100 timestamps, 1s apart

  const now = Math.floor(Date.now() / 1000);

  const data = Array.from({ length: 100 }, (_, i) => {
    const timestamp = now - 100 + i;
    return {
      timestamp,
      temperatures: Array.from({ length: 12 }, () => randomFloat(20, 80)),
      pumpVoltage: randomFloat(10, 14),
      pumpCurrent: randomFloat(0.5, 2.5),
      pumpPower: randomFloat(5, 30),
      flowSensorCurrent: randomFloat(0.1, 1.0),
    };
  });

  return NextResponse.json(data);
}
