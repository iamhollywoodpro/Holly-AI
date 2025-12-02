/**
 * Predictive Detection Panel
 * Phase 4A - UI for predictive issue detection
 */

'use client';

import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, TrendingUp, Target, Shield, Zap, CheckCircle, XCircle, Eye } from 'lucide-react';

interface Prediction {
  id: string;
  predictionType: string;
  category: string;
  filePath: string;
  fileName: string;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  severity: string;
  likelihood: number;
  patterns: string[];
  recommendation: string;
  preventionSteps: string[];
  status: string;
  validated: boolean;
  predictedAt: Date;
}

interface PredictionStats {
  total: number;
  validated: number;
  occurred: number;
  prevented: number;
  falsePositives: number;
  accuracy: number;
  avgConfidence: number;
  byType: { [key: string]: number };
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export function PredictiveDetectionPanel() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/predictive-detection/list');
      const data = await response.json();
      
      if (data.success) {
        setPredictions(data.predictions || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async (scope: 'project' | 'file' = 'project') => {
    setAnalyzing(true);
    try {
      const response = await fetch('/api/admin/predictive-detection/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Analysis complete! Found ${data.count} new predictions.`);
        fetchPredictions();
      }
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const validatePrediction = async (id: string, status: 'occurred' | 'prevented' | 'false_positive') => {
    try {
      const response = await fetch(`/api/admin/predictive-detection/validate/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          accuracy: status === 'false_positive' ? 0 : 1
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchPredictions();
        setSelectedPrediction(null);
      }
    } catch (error) {
      console.error('Error validating prediction:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'occurred': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'prevented': return <Shield className="w-5 h-5 text-green-500" />;
      case 'false_positive': return <XCircle className="w-5 h-5 text-gray-500" />;
      case 'monitoring': return <Eye className="w-5 h-5 text-blue-500" />;
      default: return <Target className="w-5 h-5 text-purple-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance_degradation': return <TrendingUp className="w-4 h-4" />;
      case 'bug_risk': return <AlertTriangle className="w-4 h-4" />;
      case 'security_vulnerability': return <Shield className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  if (loading && predictions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading predictions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Predictions</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accuracy</p>
                <p className="text-2xl font-bold text-green-600">{stats.accuracy}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Prevented</p>
                <p className="text-2xl font-bold text-blue-600">{stats.prevented}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Confidence</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(stats.avgConfidence * 100).toFixed(0)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Predictive Issue Detection</h3>
          <p className="text-sm text-gray-600">Predict issues before they happen</p>
        </div>
        <button
          onClick={() => runAnalysis('project')}
          disabled={analyzing}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <Zap className="w-4 h-4" />
          <span>{analyzing ? 'Analyzing...' : 'Run Analysis'}</span>
        </button>
      </div>

      {/* Predictions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Predictions</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {predictions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No predictions yet. Run analysis to start predicting issues.
            </div>
          ) : (
            predictions.slice(0, 20).map(prediction => (
              <div key={prediction.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getStatusIcon(prediction.status)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900">{prediction.title}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(prediction.severity)}`}>
                          {prediction.severity}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(prediction.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">{prediction.description}</p>

                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1 text-gray-600">
                          {getTypeIcon(prediction.predictionType)}
                          <span>{prediction.predictionType.replace(/_/g, ' ')}</span>
                        </div>
                        
                        <span className="text-gray-600">
                          📁 {prediction.fileName}
                        </span>

                        {prediction.patterns.length > 0 && (
                          <span className="text-blue-600">
                            {prediction.patterns.length} patterns detected
                          </span>
                        )}
                      </div>

                      {selectedPrediction?.id === prediction.id && (
                        <div className="mt-4 p-4 bg-gray-50 rounded space-y-3">
                          <div>
                            <h4 className="font-medium text-sm mb-1">Reasoning:</h4>
                            <div className="text-sm text-gray-700 whitespace-pre-line">
                              {prediction.reasoning}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-sm mb-1">Recommendation:</h4>
                            <p className="text-sm text-gray-700">{prediction.recommendation}</p>
                          </div>

                          {prediction.preventionSteps.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm mb-1">Prevention Steps:</h4>
                              <ul className="text-sm text-gray-700 list-disc list-inside">
                                {prediction.preventionSteps.map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {!prediction.validated && (
                            <div className="flex items-center space-x-2 pt-2">
                              <button
                                onClick={() => validatePrediction(prediction.id, 'occurred')}
                                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Mark as Occurred
                              </button>
                              <button
                                onClick={() => validatePrediction(prediction.id, 'prevented')}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Mark as Prevented
                              </button>
                              <button
                                onClick={() => validatePrediction(prediction.id, 'false_positive')}
                                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                              >
                                False Positive
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPrediction(
                      selectedPrediction?.id === prediction.id ? null : prediction
                    )}
                    className="ml-4 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    {selectedPrediction?.id === prediction.id ? 'Hide' : 'Details'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
