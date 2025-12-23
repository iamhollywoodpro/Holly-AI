"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface SelfImprovement {
  id: string;
  problemStatement: string;
  solutionApproach: string;
  status: string;
  riskLevel: string;
  branchName: string;
  prNumber: number | null;
  prUrl: string | null;
  createdAt: string;
}

export default function SelfImprovementDashboard() {
  const { user } = useUser();
  const [improvements, setImprovements] = useState<SelfImprovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImprovement, setSelectedImprovement] = useState<SelfImprovement | null>(null);

  useEffect(() => {
    fetchImprovements();
  }, []);

  const fetchImprovements = async () => {
    try {
      const response = await fetch("/api/self-improvement/list");
      const data = await response.json();
      setImprovements(data.improvements || []);
    } catch (error) {
      console.error("Failed to fetch improvements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/self-improvement/approve/${id}`, {
        method: "POST",
      });
      if (response.ok) {
        await fetchImprovements();
        setSelectedImprovement(null);
      }
    } catch (error) {
      console.error("Failed to approve improvement:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const response = await fetch(`/api/self-improvement/reject/${id}`, {
        method: "POST",
      });
      if (response.ok) {
        await fetchImprovements();
        setSelectedImprovement(null);
      }
    } catch (error) {
      console.error("Failed to reject improvement:", error);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "HIGH":
        return "text-red-600 bg-red-100";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-100";
      case "LOW":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PLANNED":
        return "text-blue-600 bg-blue-100";
      case "IN_PROGRESS":
        return "text-purple-600 bg-purple-100";
      case "PENDING_REVIEW":
        return "text-yellow-600 bg-yellow-100";
      case "APPROVED":
        return "text-green-600 bg-green-100";
      case "REJECTED":
        return "text-red-600 bg-red-100";
      case "DEPLOYED":
        return "text-emerald-600 bg-emerald-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading improvements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🧠 HOLLY's Self-Improvements
          </h1>
          <p className="mt-2 text-gray-600">
            Review and approve HOLLY's proposed improvements
          </p>
        </div>

        {improvements.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No pending improvements
            </h2>
            <p className="text-gray-600">
              HOLLY hasn't proposed any improvements yet. Check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* List of improvements */}
            <div className="space-y-4">
              {improvements.map((improvement) => (
                <div
                  key={improvement.id}
                  className={`bg-white rounded-lg shadow p-6 cursor-pointer transition-all hover:shadow-lg ${
                    selectedImprovement?.id === improvement.id
                      ? "ring-2 ring-purple-600"
                      : ""
                  }`}
                  onClick={() => setSelectedImprovement(improvement)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {improvement.problemStatement}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(
                        improvement.riskLevel
                      )}`}
                    >
                      {improvement.riskLevel}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {improvement.solutionApproach}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        improvement.status
                      )}`}
                    >
                      {improvement.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(improvement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Detail view */}
            <div className="lg:sticky lg:top-8 lg:h-fit">
              {selectedImprovement ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="mb-6">
                    <div className="flex items-start justify-between mb-4">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedImprovement.problemStatement}
                      </h2>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(
                          selectedImprovement.riskLevel
                        )}`}
                      >
                        {selectedImprovement.riskLevel} RISK
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedImprovement.solutionApproach}
                    </p>
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Status:
                      </span>
                      <span
                        className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          selectedImprovement.status
                        )}`}
                      >
                        {selectedImprovement.status.replace("_", " ")}
                      </span>
                    </div>

                    {selectedImprovement.branchName && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">
                          Branch:
                        </span>
                        <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-sm">
                          {selectedImprovement.branchName}
                        </code>
                      </div>
                    )}

                    {selectedImprovement.prUrl && (
                      <div>
                        <a
                          href={selectedImprovement.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-purple-600 hover:text-purple-700 text-sm font-medium"
                        >
                          View Pull Request on GitHub →
                        </a>
                      </div>
                    )}
                  </div>

                  {selectedImprovement.status === "PENDING_REVIEW" && (
                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => handleApprove(selectedImprovement.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                      >
                        ✅ Approve & Deploy
                      </button>
                      <button
                        onClick={() => handleReject(selectedImprovement.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <div className="text-6xl mb-4">👈</div>
                  <p className="text-gray-600">
                    Select an improvement to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
