import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore, ThemeMode, VoiceGender, VoiceSpeed } from '../../store/settingsStore';
import { resetApiClient, checkHealth } from '../../services/api';
import {
  isBiometricAvailable,
  authenticateWithBiometrics,
} from '../../services/auth';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function SettingsScreen() {
  const serverUrl = useSettingsStore((s) => s.serverUrl);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const theme = useSettingsStore((s) => s.theme);
  const voiceGender = useSettingsStore((s) => s.voiceGender);
  const voiceSpeed = useSettingsStore((s) => s.voiceSpeed);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const biometricEnabled = useSettingsStore((s) => s.biometricEnabled);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const chatModel = useSettingsStore((s) => s.chatModel);

  const setServerUrl = useSettingsStore((s) => s.setServerUrl);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setVoiceGender = useSettingsStore((s) => s.setVoiceGender);
  const setVoiceSpeed = useSettingsStore((s) => s.setVoiceSpeed);
  const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);
  const setBiometricEnabled = useSettingsStore((s) => s.setBiometricEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const setChatModel = useSettingsStore((s) => s.setChatModel);
  const resetSettings = useSettingsStore((s) => s.resetSettings);

  const [testing, setTesting] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);

  const [tempServerUrl, setTempServerUrl] = useState(serverUrl);
  const [tempApiKey, setTempApiKey] = useState(apiKey);

  const handleSaveConnection = useCallback(() => {
    const trimmedUrl = tempServerUrl.trim().replace(/\/+$/, '');
    setServerUrl(trimmedUrl);
    setApiKey(tempApiKey.trim());
    resetApiClient();
    Alert.alert('Saved', 'Connection settings updated.');
  }, [tempServerUrl, tempApiKey, setServerUrl, setApiKey]);

  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    setHealthStatus(null);
    try {
      const result = await checkHealth();
      setHealthStatus(`Connected: ${result.status}`);
    } catch (err: any) {
      setHealthStatus(`Failed: ${err?.message || 'Cannot reach server'}`);
    } finally {
      setTesting(false);
    }
  }, []);

  const handleBiometricToggle = useCallback(
    async (enable: boolean) => {
      if (enable) {
        const available = await isBiometricAvailable();
        if (!available) {
          Alert.alert(
            'Not Available',
            'Biometric authentication is not available on this device.',
          );
          return;
        }
        const authenticated = await authenticateWithBiometrics(
          'Enable biometric lock for HOLLY AI',
        );
        if (!authenticated) return;
      }
      setBiometricEnabled(enable);
    },
    [setBiometricEnabled],
  );

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to defaults. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetSettings();
            setTempServerUrl('https://holly.nexamusicgroup.com');
            setTempApiKey('');
            resetApiClient();
            setHealthStatus(null);
          },
        },
      ],
    );
  }, [resetSettings]);

  const themes: { key: ThemeMode; label: string }[] = [
    { key: 'dark', label: 'Dark' },
    { key: 'light', label: 'Light' },
    { key: 'system', label: 'System' },
  ];

  const genders: { key: VoiceGender; label: string }[] = [
    { key: 'male', label: 'Male' },
    { key: 'female', label: 'Female' },
  ];

  const speeds: { key: VoiceSpeed; label: string }[] = [
    { key: 'slow', label: 'Slow' },
    { key: 'normal', label: 'Normal' },
    { key: 'fast', label: 'Fast' },
  ];

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const renderOptionRow = (
    label: string,
    options: Array<{ key: string; label: string }>,
    selected: string,
    onSelect: (key: string) => void,
  ) => (
    <View style={styles.optionRow}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.optionButtons}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.optionButton,
              selected === opt.key && styles.optionButtonActive,
            ]}
            onPress={() => onSelect(opt.key)}
          >
            <Text
              style={[
                styles.optionButtonText,
                selected === opt.key && styles.optionButtonTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerTitle}>Settings</Text>

        {renderSection(
          'Connection',
          <>
            <Text style={styles.fieldLabel}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={tempServerUrl}
              onChangeText={setTempServerUrl}
              placeholder="https://holly.nexamusicgroup.com"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.fieldLabel}>API Key</Text>
            <TextInput
              style={styles.input}
              value={tempApiKey}
              onChangeText={setTempApiKey}
              placeholder="Enter your HOLLY API key"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.saveButton, styles.buttonHalf]}
                onPress={handleSaveConnection}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.testButton, styles.buttonHalf]}
                onPress={handleTestConnection}
                disabled={testing}
              >
                <Text style={styles.testButtonText}>
                  {testing ? 'Testing...' : 'Test Connection'}
                </Text>
              </TouchableOpacity>
            </View>

            {healthStatus && (
              <Text
                style={[
                  styles.healthText,
                  healthStatus.startsWith('Connected')
                    ? styles.healthOk
                    : styles.healthFail,
                ]}
              >
                {healthStatus}
              </Text>
            )}
          </>,
        )}

        {renderSection(
          'Chat',
          <>
            <Text style={styles.fieldLabel}>Default Model</Text>
            <TextInput
              style={styles.input}
              value={chatModel}
              onChangeText={setChatModel}
              placeholder="holly-v1"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>,
        )}

        {renderSection(
          'Voice',
          <>
            <View style={styles.switchRow}>
              <Text style={styles.optionLabel}>Enable Voice Responses</Text>
              <Switch
                value={voiceEnabled}
                onValueChange={setVoiceEnabled}
                trackColor={{ false: Colors.border, true: Colors.purple }}
                thumbColor={voiceEnabled ? Colors.text : Colors.textMuted}
              />
            </View>
            {renderOptionRow('Voice', genders, voiceGender, (v) =>
              setVoiceGender(v as VoiceGender),
            )}
            {renderOptionRow('Speed', speeds, voiceSpeed, (v) =>
              setVoiceSpeed(v as VoiceSpeed),
            )}
          </>,
        )}

        {renderSection(
          'Appearance',
          <>
            {renderOptionRow('Theme', themes, theme, (v) =>
              setTheme(v as ThemeMode),
            )}
          </>,
        )}

        {renderSection(
          'Security',
          <>
            <View style={styles.switchRow}>
              <Text style={styles.optionLabel}>Biometric Lock</Text>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: Colors.border, true: Colors.purple }}
                thumbColor={biometricEnabled ? Colors.text : Colors.textMuted}
              />
            </View>
          </>,
        )}

        {renderSection(
          'Notifications',
          <>
            <View style={styles.switchRow}>
              <Text style={styles.optionLabel}>Push Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.border, true: Colors.purple }}
                thumbColor={notificationsEnabled ? Colors.text : Colors.textMuted}
              />
            </View>
          </>,
        )}

        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset All Settings</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>HOLLY AI v1.0.0</Text>
        <Text style={styles.footerText}>holly.nexamusicgroup.com</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: 24,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.subheading,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.cyan,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  sectionContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldLabel: {
    ...Typography.small,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  buttonHalf: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: Colors.cyan,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.background,
    fontWeight: '700',
    fontSize: 15,
  },
  testButton: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  testButtonText: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  healthText: {
    ...Typography.small,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  healthOk: {
    color: Colors.success,
  },
  healthFail: {
    color: Colors.error,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  optionLabel: {
    ...Typography.body,
    fontSize: 15,
  },
  optionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  optionButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionButtonActive: {
    backgroundColor: Colors.purple + '25',
    borderColor: Colors.purple,
  },
  optionButtonText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  optionButtonTextActive: {
    color: Colors.purple,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: Colors.error + '15',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error + '30',
    marginTop: Spacing.md,
  },
  resetButtonText: {
    color: Colors.error,
    fontWeight: '600',
    fontSize: 15,
  },
  versionText: {
    ...Typography.small,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
  footerText: {
    ...Typography.small,
    textAlign: 'center',
    color: Colors.cyan,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
});
