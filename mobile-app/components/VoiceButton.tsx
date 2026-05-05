import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_COUNT = 5;
const BAR_MAX_HEIGHT = 28;
const BAR_MIN_HEIGHT = 4;

interface VoiceButtonProps {
  onRecordingStart?: () => void;
  onRecordingEnd?: (uri: string | null) => void;
  onTranscript?: (text: string) => void;
  size?: number;
}

export function VoiceButton({
  onRecordingStart,
  onRecordingEnd,
  onTranscript,
  size = 56,
}: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [animatedValues] = useState(
    () =>
      Array.from({ length: BAR_COUNT }, () => new Animated.Value(BAR_MIN_HEIGHT)),
  );

  const startAnimation = useCallback(() => {
    const animations = animatedValues.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: BAR_MAX_HEIGHT * (0.4 + Math.random() * 0.6),
            duration: 300 + i * 80,
            easing: Easing.ease,
            useNativeDriver: false,
          }),
          Animated.timing(val, {
            toValue: BAR_MIN_HEIGHT,
            duration: 200 + i * 60,
            easing: Easing.ease,
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    Animated.stagger(80, animations).start();
  }, [animatedValues]);

  const stopAnimation = useCallback(() => {
    animatedValues.forEach((val) => {
      val.stopAnimation();
      val.setValue(BAR_MIN_HEIGHT);
    });
  }, [animatedValues]);

  const handlePress = useCallback(async () => {
    if (isRecording) {
      setIsRecording(false);
      stopAnimation();
      onRecordingEnd?.(null);
    } else {
      setIsRecording(true);
      startAnimation();
      onRecordingStart?.();

      // Simulate voice recognition for demo purposes
      // In production, integrate with a speech-to-text service
      setTimeout(() => {
        if (isRecording) return; // guard against rapid toggles
      }, 100);

      // Auto-stop after 30 seconds max
      setTimeout(() => {
        setIsRecording(false);
        stopAnimation();
        onRecordingEnd?.(null);
      }, 30000);
    }
  }, [isRecording, startAnimation, stopAnimation, onRecordingStart, onRecordingEnd]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        isRecording && styles.recording,
      ]}
    >
      {isRecording ? (
        <View style={styles.waveform}>
          {animatedValues.map((val, i) => (
            <Animated.View
              key={i}
              style={[
                styles.bar,
                {
                  height: val,
                },
              ]}
            />
          ))}
        </View>
      ) : (
        <View style={styles.micIcon}>
          <View style={styles.micBody} />
          <View style={styles.micBase} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recording: {
    backgroundColor: Colors.purple + '30',
    borderColor: Colors.pink,
    shadowColor: Colors.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: BAR_MAX_HEIGHT,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.cyan,
  },
  micIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBody: {
    width: 14,
    height: 20,
    borderRadius: 7,
    backgroundColor: Colors.text,
    marginBottom: -3,
  },
  micBase: {
    width: 22,
    height: 11,
    borderTopWidth: 2,
    borderTopColor: Colors.text,
    borderLeftWidth: 2,
    borderLeftColor: Colors.text,
    borderRightWidth: 2,
    borderRightColor: Colors.text,
    borderBottomWidth: 0,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
  },
});
