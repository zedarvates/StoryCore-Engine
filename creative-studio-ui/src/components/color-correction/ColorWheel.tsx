import React, { useState, useEffect } from 'react';
import { ColorWheelType } from '../../types/color-wheel';
import styles from './ColorCorrectionPanel.module.css';

interface ColorWheelProps {
  type: ColorWheelType;
  label: string;
  color: string;
  value: number;
  onChange: (type: ColorWheelType, value: number) => void;
}

export const ColorWheel: React.FC<ColorWheelProps> = ({ type, label, color, value, onChange }) => {
  const [angle, setAngle] = useState(value * 360);

  useEffect(() => {
    setAngle(value * 360);
  }, [value]);

  return (
    <div className={styles.colorWheelContainer}>
      <div className={styles.wheelLabel}>{label}</div>
      <div className={styles.colorWheel}>
        <div
          className={styles.wheel}
          style={{
            background: `conic-gradient(from ${angle}deg at 50% 50%, ${color} 0deg, #333 10deg, transparent 10deg, transparent 40deg, ${color} 40deg, ${color} 50deg, #333 60deg, transparent 60deg, transparent 90deg, ${color} 90deg, ${color} 100deg)`,
            transform: `rotate(${angle}deg)`,
          }}
        >
          <div className={styles.wheelHandle} style={{ transform: `rotate(${-angle}deg)` }}>
            <div className={styles.handle} />
          </div>
        </div>
      </div>
      <div className={styles.wheelValue}>{(value * 100).toFixed(0)}%</div>
    </div>
  );
};