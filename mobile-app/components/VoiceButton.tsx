import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Platform,
  Alert,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_COUNT = 5;
const BAR_MAX_HEIGHT = 28;
const BAR_MIN_HEIGHT = 4;
const MAX_RECORDING_DURATION = 60000; // 60 seconds max

interface VoiceButtonProps {
  onRecordingStart?: () => void;
  onRecordingEnd?: (uri: string | null) => void;
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  size?: number;
  /** Language for speech recognition (BCP-47, e.g. 'en-US') */
  language?: string;
}

/**
 * VoiceButton with real speech-to-text via expo-speech-recognition.
 *
 * Platform support:
 * - iOS: Native SFSpeechRecognizer (requires NSSpeechRecognitionUsageDescription in Info.plist)
 * - Android: Native Google SpeechRecognizer (requires RECORD_AUDIO permission — already in app.json)
 * - Web: Web Speech API (fallback)
 *
 * If expo-speech-recognition is not available, falls back gracefully.
 */
export function VoiceButton({
  onRecordingStart,
  onRecordingEnd,
  onTranscript,
  onError,
  size = 56,
  language = 'en-US',
}: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [animatedValues] = useState(
    () =>
      Array.from({ length: BAR_COUNT }, () => new Animated.Value(BAR_MIN_HEIGHT)),
  );
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechRef = useRef<any>(null);

  // Load speech recognition module dynamically
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const SpeechRecognition = require('expo-speech-recognition');
        if (mounted && SpeechRecognition) {
          speechRef.current = SpeechRecognition;
        }
      } catch {
        // expo-speech-recognition not installed
        console.warn('[VoiceButton] expo-speech-recognition not available — voice input disabled');
      }
    })();
    return () => { mounted = false; };
  }, []);

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

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    stopAnimation();

    if (autoStopTimer.current) {
      clearTimeout(autoStopTimer.current);
      autoStopTimer.current = null;
    }

    // Stop speech recognition if active
    if (speechRef.current) {
      try {
        speechRef.current.stop();
      } catch {
        // Already stopped
      }
    }

    onRecordingEnd?.(null);
  }, [stopAnimation, onRecordingEnd]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!speechRef.current) {
      // No speech recognition available — use text input fallback
      onError?.('Speech recognition is not available on this device');
      return false;
    }

    try {
      const { status } = await speechRef.current.requestPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      if (!granted) {
        onError?.('Microphone permission denied');
        Alert.alert(
          'Microphone Access Required',
          'Please enable microphone access in Settings to use voice input.',
        );
      }
      return granted;
    } catch (err: any) {
      onError?.(err?.message || 'Permission request failed');
      return false;
    }
  }, [onError]);

  const startListening = useCallback(async () => {
    if (!speechRef.current) {
      onError?.('Speech recognition is not available. Please install expo-speech-recognition.');
      return;
    }

    // Request permissions if not yet determined
    if (hasPermission === null) {
      const granted = await requestPermissions();
      if (!granted) return;
    } else if (!hasPermission) {
      Alert.alert(
        'Microphone Access Required',
        'Please enable microphone access in Settings to use voice input.',
      );
      return;
    }

    setIsRecording(true);
    startAnimation();
    onRecordingStart?.();

    try {
      // Start speech recognition
      await speechRef.current.start({
        lang: language,
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
        contextualStrings: ['Holly', 'AI', 'chat'],
      });

      // Listen for results
      speechRef.current.onResult = (event: any) => {
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0].transcript;
          if (transcript && event.isFinal) {
            onTranscript?.(transcript);
            stopRecording();
          }
        }
      };

      speechRef.current.onError = (event: any) => {
        console.warn('[VoiceButton] Speech recognition error:', event.error);
        // Don't report "no-speech" as an error — user just didn't speak
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          onError?.(`Speech recognition error: ${event.error}`);
        }
        stopRecording();
      };

      speechRef.current.onEnd = () => {
        // Speech recognition ended naturally
        stopRecording();
      };

    } catch (err: any) {
      console.warn('[VoiceButton] Failed to start speech recognition:', err);
      onError?.(err?.message || 'Failed to start speech recognition');
      stopRecording();
      return;
    }

    // Auto-stop after max duration
    autoStopTimer.current = setTimeout(() => {
      console.log('[VoiceButton] Auto-stop after max duration');
      stopRecording();
    }, MAX_RECORDING_DURATION);
  }, [
    hasPermission,
    language,
    onRecordingStart,
    onTranscript,
    onError,
    requestPermissions,
    startAnimation,
    stopRecording,
  ]);

  const handlePress = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startListening();
    }
  }, [isRecording, stopRecording, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoStopTimer.current) {
        clearTimeout(autoStopTimer.current);
      }
    };
  }, []);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={isRecording ? 'Stop recording' : 'Start voice input'}
      accessibilityRole="button"
      accessibilityState={{ expanded: isRecording }}
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
