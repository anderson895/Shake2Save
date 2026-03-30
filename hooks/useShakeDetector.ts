import { useEffect, useRef, useCallback } from "react";
import { Accelerometer } from "expo-sensors";

const SHAKE_THRESHOLD = 1.8;
const SHAKE_COUNT_THRESHOLD = 3;
const SHAKE_TIME_WINDOW = 1000; // ms

export function useShakeDetector(
  onShake: () => void,
  enabled: boolean = true
) {
  const shakeTimestamps = useRef<number[]>([]);
  const lastMagnitude = useRef(0);

  const handleAccelerometerData = useCallback(
    (data: { x: number; y: number; z: number }) => {
      if (!enabled) return;

      const magnitude = Math.sqrt(
        data.x * data.x + data.y * data.y + data.z * data.z
      );

      if (
        magnitude > SHAKE_THRESHOLD &&
        lastMagnitude.current <= SHAKE_THRESHOLD
      ) {
        const now = Date.now();
        shakeTimestamps.current.push(now);

        // Remove old timestamps outside the time window
        shakeTimestamps.current = shakeTimestamps.current.filter(
          (t) => now - t < SHAKE_TIME_WINDOW
        );

        if (shakeTimestamps.current.length >= SHAKE_COUNT_THRESHOLD) {
          shakeTimestamps.current = [];
          onShake();
        }
      }

      lastMagnitude.current = magnitude;
    },
    [onShake, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    Accelerometer.setUpdateInterval(100);
    const subscription = Accelerometer.addListener(handleAccelerometerData);

    return () => {
      subscription.remove();
    };
  }, [handleAccelerometerData, enabled]);
}
