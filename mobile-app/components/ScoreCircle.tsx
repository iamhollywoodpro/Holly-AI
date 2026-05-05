import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography, Spacing } from '../constants/theme';

interface ScoreCircleProps {
  score: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
  showPercentage?: boolean;
}

export function ScoreCircle({
  score,
  max = 100,
  size = 100,
  strokeWidth = 8,
  label,
  color,
  showPercentage = true,
}: ScoreCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(score / max, 1);
  const strokeDashoffset = circumference * (1 - percentage);

  const getScoreColor = (): string => {
    if (color) return color;
    if (percentage >= 0.8) return Colors.success;
    if (percentage >= 0.6) return Colors.cyan;
    if (percentage >= 0.4) return Colors.warning;
    return Colors.error;
  };

  const scoreColor = getScoreColor();

  return (
    <View style={[styles.container, { width: size, height: size + (label ? 24 : 0) }]}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={styles.svg}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Colors.surfaceLight}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            {showPercentage ? `${Math.round(percentage * 100)}` : `${score}`}
          </Text>
          {showPercentage && (
            <Text style={[styles.scoreUnit, { color: scoreColor }]}>%</Text>
          )}
        </View>
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  scoreContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 2,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '700',
  },
  scoreUnit: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 1,
    marginTop: 4,
  },
  label: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
