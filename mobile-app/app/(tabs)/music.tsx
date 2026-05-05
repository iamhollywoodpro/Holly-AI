import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateSong, generateLyrics, generateCover } from '../../services/api';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { useSettingsStore } from '../../store/settingsStore';

type MusicTab = 'generate' | 'lyrics' | 'cover';

export default function MusicScreen() {
  const [activeTab, setActiveTab] = useState<MusicTab>('generate');
  const [loading, setLoading] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [duration, setDuration] = useState('');
  const [instrumental, setInstrumental] = useState(false);

  const [lyricsPrompt, setLyricsPrompt] = useState('');
  const [lyricsStyle, setLyricsStyle] = useState('');

  const [coverPrompt, setCoverPrompt] = useState('');

  const [result, setResult] = useState<any>(null);
  const apiKey = useSettingsStore((s) => s.apiKey);

  const tabs: { key: MusicTab; label: string }[] = [
    { key: 'generate', label: 'Generate' },
    { key: 'lyrics', label: 'Lyrics' },
    { key: 'cover', label: 'Cover Art' },
  ];

  const handleGenerateSong = useCallback(async () => {
    if (!prompt.trim()) {
      Alert.alert('Missing Info', 'Please enter a song description.');
      return;
    }
    if (!apiKey) {
      Alert.alert('No API Key', 'Configure your API key in Settings first.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const response = await generateSong({
        prompt: prompt.trim(),
        genre: genre.trim() || undefined,
        mood: mood.trim() || undefined,
        duration: duration ? parseInt(duration, 10) : undefined,
        instrumental,
      });
      setResult(response);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to generate song');
    } finally {
      setLoading(false);
    }
  }, [prompt, genre, mood, duration, instrumental, apiKey]);

  const handleGenerateLyrics = useCallback(async () => {
    if (!lyricsPrompt.trim()) {
      Alert.alert('Missing Info', 'Please enter a lyrics description.');
      return;
    }
    if (!apiKey) {
      Alert.alert('No API Key', 'Configure your API key in Settings first.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const response = await generateLyrics(lyricsPrompt.trim(), lyricsStyle.trim() || undefined);
      setResult(response);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to generate lyrics');
    } finally {
      setLoading(false);
    }
  }, [lyricsPrompt, lyricsStyle, apiKey]);

  const handleGenerateCover = useCallback(async () => {
    if (!coverPrompt.trim()) {
      Alert.alert('Missing Info', 'Please describe the cover art you want.');
      return;
    }
    if (!apiKey) {
      Alert.alert('No API Key', 'Configure your API key in Settings first.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const response = await generateCover(coverPrompt.trim());
      setResult(response);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to generate cover art');
    } finally {
      setLoading(false);
    }
  }, [coverPrompt, apiKey]);

  const renderGenerateTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.fieldLabel}>Song Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={prompt}
        onChangeText={setPrompt}
        placeholder="Describe the song you want to create..."
        placeholderTextColor={Colors.textMuted}
        multiline
        numberOfLines={4}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Genre</Text>
          <TextInput
            style={styles.input}
            value={genre}
            onChangeText={setGenre}
            placeholder="Hip-Hop, R&B..."
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Mood</Text>
          <TextInput
            style={styles.input}
            value={mood}
            onChangeText={setMood}
            placeholder="Energetic, Chill..."
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Duration (sec)</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            placeholder="180"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Instrumental</Text>
          <TouchableOpacity
            style={[styles.toggle, instrumental && styles.toggleActive]}
            onPress={() => setInstrumental(!instrumental)}
          >
            <Text style={[styles.toggleText, instrumental && styles.toggleTextActive]}>
              {instrumental ? 'Yes' : 'No'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.actionButton, loading && styles.actionButtonDisabled]}
        onPress={handleGenerateSong}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.actionButtonText}>Generate Song</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderLyricsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.fieldLabel}>Lyrics Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={lyricsPrompt}
        onChangeText={setLyricsPrompt}
        placeholder="Describe the theme, story, or feeling..."
        placeholderTextColor={Colors.textMuted}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.fieldLabel}>Style (Optional)</Text>
      <TextInput
        style={styles.input}
        value={lyricsStyle}
        onChangeText={setLyricsStyle}
        placeholder="Drake, Taylor Swift, Kendrick..."
        placeholderTextColor={Colors.textMuted}
      />

      <TouchableOpacity
        style={[styles.actionButton, loading && styles.actionButtonDisabled]}
        onPress={handleGenerateLyrics}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.actionButtonText}>Generate Lyrics</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderCoverTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.fieldLabel}>Cover Art Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={coverPrompt}
        onChangeText={setCoverPrompt}
        placeholder="Describe the visual style, colors, imagery..."
        placeholderTextColor={Colors.textMuted}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[styles.actionButton, loading && styles.actionButtonDisabled]}
        onPress={handleGenerateCover}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.actionButtonText}>Generate Cover Art</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderResult = () => {
    if (!result) return null;

    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>Result</Text>
        <View style={styles.resultCard}>
          {result.audio_url && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Audio:</Text>
              <Text style={styles.resultValue} numberOfLines={1}>
                {result.audio_url}
              </Text>
            </View>
          )}
          {result.lyrics && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Lyrics:</Text>
              <Text style={styles.resultValue}>{result.lyrics}</Text>
            </View>
          )}
          {result.cover_url && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Cover:</Text>
              <Text style={styles.resultValue} numberOfLines={1}>
                {result.cover_url}
              </Text>
            </View>
          )}
          {result.status && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Status:</Text>
              <Text style={[styles.resultValue, { color: Colors.success }]}>
                {result.status}
              </Text>
            </View>
          )}
          {result.id && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>ID:</Text>
              <Text style={styles.resultValue}>{result.id}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Music Studio</Text>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => {
              setActiveTab(tab.key);
              setResult(null);
            }}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'generate' && renderGenerateTab()}
        {activeTab === 'lyrics' && renderLyricsTab()}
        {activeTab === 'cover' && renderCoverTab()}
        {renderResult()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: 24,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.purple + '25',
    borderColor: Colors.purple,
  },
  tabLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: Colors.purple,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  tabContent: {
    gap: Spacing.md,
  },
  fieldLabel: {
    ...Typography.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  toggle: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.purple + '25',
    borderColor: Colors.purple,
  },
  toggleText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: Colors.purple,
  },
  actionButton: {
    backgroundColor: Colors.purple,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cyan + '30',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  resultContainer: {
    marginTop: Spacing.xl,
  },
  resultTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.md,
    color: Colors.cyan,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  resultRow: {
    gap: 2,
  },
  resultLabel: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.cyan,
  },
  resultValue: {
    ...Typography.caption,
    lineHeight: 20,
  },
});
