// Usage: node seedSessions.js
// This script seeds random probe data to /api/probe-data/upload

function randomSessionId() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 7; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
}

function smoothArray(arr, windowSize) {
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

function makeSessionData({ tempCount, metricDefs, sessionSeed, n = 100 }) {
    let seed = sessionSeed;
    function seededRandom() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    }
    function seededRandomFloat(min, max) {
        return seededRandom() * (max - min) + min;
    }

    // Build header dynamically with units in brackets
    const header = [
        'Timestamp (ms)',
        ...Array.from({ length: tempCount }, (_, i) => `Temperature ${i + 1} (°C)`),
        ...metricDefs.map((m) => `${m.name} (${m.unit})`)
    ];

    // Build data rows
    const data = Array.from({ length: n }, (_, i) => {
        const row = [];
        row.push(i * 1000); // Timestamp
        // Temperatures
        const temps = Array.from({ length: tempCount }, () => seededRandomFloat(25, 70));
        row.push(...temps);
        // Metrics
        for (const m of metricDefs) {
            row.push(seededRandomFloat(m.min, m.max));
        }
        return row;
    });

    // Smooth each temperature probe
    const windowSize = 7;
    for (let probeIdx = 0; probeIdx < tempCount; probeIdx++) {
        const probeTemps = data.map((d) => d[1 + probeIdx]);
        const smoothed = smoothArray(probeTemps, windowSize);
        for (let i = 0; i < data.length; i++) {
            data[i][1 + probeIdx] = smoothed[i];
        }
    }
    return { header, data };
}

async function seedSession({ tempCount, metricDefs, sessionSeed }) {
    const id = randomSessionId();
    const { header, data } = makeSessionData({ tempCount, metricDefs, sessionSeed });
    const res = await fetch('http://localhost:3000/api/probe-data/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, header, values: data })
    });
    const json = await res.json();
    console.log(`Seeded session file: ${json.fileName}`);
}

async function main() {
    await seedSession({
        tempCount: 12,
        metricDefs: [
            { name: 'Pump Voltage', unit: 'V', min: 0.1, max: 2 },
            { name: 'Pump Current', unit: 'A', min: 0.5, max: 15 },
            { name: 'Pump Power', unit: 'W', min: 0.1, max: 30 },
            { name: 'Flow Sensor Voltage', unit: 'V', min: 0, max: 0.2 }
        ],
        sessionSeed: 123
    });
    await seedSession({
        tempCount: 8,
        metricDefs: [
            { name: 'Pump Voltage', unit: 'V', min: 0.1, max: 2 },
            { name: 'Pump Power', unit: 'W', min: 0.1, max: 30 }
        ],
        sessionSeed: 456
    });
    await seedSession({
        tempCount: 16,
        metricDefs: [
            { name: 'Pump Current', unit: 'A', min: 0.5, max: 15 },
            { name: 'Flow Sensor Voltage', unit: 'V', min: 0, max: 0.2 },
            { name: 'Extra Metric', unit: 'X', min: 10, max: 20 }
        ],
        sessionSeed: 789
    });
}

main();
