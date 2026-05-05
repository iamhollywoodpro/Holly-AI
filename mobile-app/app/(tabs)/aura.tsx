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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  submitAuraAnalysis,
  getAuraResults,
  AuraAnalysisResponse,
  AuraScore,
} from '../../services/api';
import { ScoreCircle } from '../../components/ScoreCircle';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { useSettingsStore } from '../../store/settingsStore';

export default function AuraScreen() {
  const [loading, setLoading] = useState(false);
  const [trackUrl, setTrackUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [analysisResult, setAnalysisResult] =
    useState<AuraAnalysisResponse | null>(null);
  const [history, setHistory] = useState<AuraAnalysisResponse[]>([]);

  const apiKey = useSettingsStore((s) => s.apiKey);

  const handleSubmit = useCallback(async () => {
    if (!trackUrl.trim()) {
      Alert.alert('Missing Info', 'Please enter a track URL or upload a track.');
      return;
    }
    if (!apiKey) {
      Alert.alert('No API Key', 'Configure your API key in Settings first.');
      return;
    }

    setLoading(true);
    try {
      const result = await submitAuraAnalysis({
        track_url: trackUrl.trim(),
        title: title.trim() || undefined,
        artist: artist.trim() || undefined,
      });
      setAnalysisResult(result);
      setHistory((prev) => [result, ...prev]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to analyze track');
    } finally {
      setLoading(false);
    }
  }, [trackUrl, title, artist, apiKey]);

  const renderScoreItem = useCallback(
    ({ item }: { item: AuraScore }) => (
      <View style={styles.scoreCard}>
        <ScoreCircle
          score={item.score}
          max={item.max}
          size={64}
          strokeWidth={5}
        />
        <Text style={styles.scoreCategory}>{item.category}</Text>
        <Text style={styles.scoreFeedback} numberOfLines={3}>
          {item.feedback}
        </Text>
      </View>
    ),
    [],
  );

  const renderRecommendation = useCallback(
    (rec: string, index: number) => (
      <View key={index} style={styles.recommendationItem}>
        <Text style={styles.recommendationBullet}>{'\u2022'}</Text>
        <Text style={styles.recommendationText}>{rec}</Text>
      </View>
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AURA Lab</Text>
        <Text style={styles.headerSubtitle}>AI-Powered A&R Analysis</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Submit Track</Text>

          <Text style={styles.fieldLabel}>Track URL</Text>
          <TextInput
            style={styles.input}
            value={trackUrl}
            onChangeText={setTrackUrl}
            placeholder="Paste a link to your track..."
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Track title"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Artist</Text>
              <TextInput
                style={styles.input}
                value={artist}
                onChangeText={setArtist}
                placeholder="Artist name"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.analyzeButton, loading && styles.analyzeButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={Colors.background} />
                <Text style={styles.analyzeButtonText}>Analyzing...</Text>
              </View>
            ) : (
              <Text style={styles.analyzeButtonText}>Analyze Track</Text>
            )}
          </TouchableOpacity>
        </View>

        {analysisResult && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Analysis Results</Text>

            <View style={styles.overallScoreCard}>
              <ScoreCircle
                score={analysisResult.overall_score}
                size={120}
                strokeWidth={10}
                label="Overall Score"
              />
              {analysisResult.market_potential !== undefined && (
                <View style={styles.marketContainer}>
                  <Text style={styles.marketLabel}>Market Potential</Text>
                  <Text style={styles.marketValue}>
                    {Math.round(analysisResult.market_potential * 100)}%
                  </Text>
                </View>
              )}
            </View>

            {analysisResult.summary && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Summary</Text>
                <Text style={styles.summaryText}>{analysisResult.summary}</Text>
              </View>
            )}

            {analysisResult.scores && analysisResult.scores.length > 0 && (
              <View style={styles.scoresSection}>
                <Text style={styles.sectionTitle}>Score Breakdown</Text>
                <FlatList
                  data={analysisResult.scores}
                  renderItem={renderScoreItem}
                  keyExtractor={(item, idx) => `${item.category}-${idx}`}
                  scrollEnabled={false}
                  numColumns={2}
                  columnWrapperStyle={styles.scoreRow}
                />
              </View>
            )}

            {analysisResult.recommendations &&
              analysisResult.recommendations.length > 0 && (
                <View style={styles.recommendationsSection}>
                  <Text style={styles.sectionTitle}>Recommendations</Text>
                  {analysisResult.recommendations.map((rec, i) =>
                    renderRecommendation(rec, i),
                  )}
                </View>
              )}
          </View>
        )}

        {history.length > 1 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Previous Analyses</Text>
            {history.slice(1).map((item, idx) => (
              <View key={item.id || idx} style={styles.historyCard}>
                <ScoreCircle score={item.overall_score} size={48} strokeWidth={4} />
                <View style={styles.historyInfo}>
                  <Text style={styles.historyScore}>
                    Score: {Math.round(item.overall_score)}%
                  </Text>
                  <Text style={styles.historySummary} numberOfLines={2}>
                    {item.summary || 'No summary available'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
    paddingBottom: Spacing.xs,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: 24,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.cyan,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  formSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.subheading,
    fontSize: 17,
    marginBottom: Spacing.md,
    color: Colors.textSecondary,
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
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  analyzeButton: {
    backgroundColor: Colors.pink,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.pink + '60',
  },
  analyzeButtonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resultsSection: {
    marginTop: Spacing.lg,
  },
  overallScoreCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  marketContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    width: '100%',
  },
  marketLabel: {
    ...Typography.small,
    marginBottom: Spacing.xs,
  },
  marketValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.success,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.cyan,
    marginBottom: Spacing.sm,
  },
  summaryText: {
    ...Typography.body,
    lineHeight: 22,
  },
  scoresSection: {
    marginBottom: Spacing.lg,
  },
  scoreRow: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  scoreCategory: {
    ...Typography.caption,
    fontWeight: '600',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  scoreFeedback: {
    ...Typography.small,
    marginTop: Spacing.xs,
    textAlign: 'center',
    lineHeight: 16,
  },
  recommendationsSection: {
    marginTop: Spacing.lg,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  recommendationBullet: {
    color: Colors.cyan,
    fontSize: 16,
    marginTop: 1,
  },
  recommendationText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 20,
  },
  historySection: {
    marginTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.xl,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  historyInfo: {
    flex: 1,
  },
  historyScore: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.cyan,
  },
  historySummary: {
    ...Typography.small,
    marginTop: 2,
  },
});
