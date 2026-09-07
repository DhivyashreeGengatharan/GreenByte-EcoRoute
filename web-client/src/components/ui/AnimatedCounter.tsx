import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export interface AnimatedCounterProps {
  value: number | string;
  formatter?: (v: string | number) => string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, formatter }) => {
  let numericValue: number | null = null;
  let prefix = '';
  let suffix = '';

  if (typeof value === 'number') {
    numericValue = value;
  } else if (typeof value === 'string') {
    const match = value.match(/^([^\d-]*)([\d,.]+)([^\d]*)$/);
    if (match) {
      prefix = match[1];
      numericValue = parseFloat(match[2].replace(/,/g, ''));
      suffix = match[3];
    }
  }

  if (numericValue === null || isNaN(numericValue)) {
    return <span>{formatter ? formatter(value) : value}</span>;
  }

  const spring = useSpring(0, { stiffness: 70, damping: 25, restDelta: 0.001 });
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    spring.set(numericValue);
    setHasStarted(true);
  }, [numericValue, spring]);

  const display = useTransform(spring, (current) => {
    if (!hasStarted) return `${prefix}${formatter ? formatter(0) : "0"}${suffix}`;
    const rounded = (numericValue as number) % 1 !== 0 ? current.toFixed(1) : Math.round(current);
    const formatted = formatter ? formatter(rounded) : Number(rounded).toLocaleString();
    return `${prefix}${formatted}${suffix}`;
  });

  return <motion.span>{display}</motion.span>;
};

export default AnimatedCounter;
