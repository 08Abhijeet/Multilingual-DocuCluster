import React from 'react';
import { useLocation } from 'react-router-dom';

function ResultsPage() {
  const location = useLocation();
  const { results } = location.state || { results: { clusters: [] } };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">Clustering Results</h1>
        {results.clusters.map((cluster, index) => (
          <div key={index} className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Cluster {index + 1}</h2>
            <ul className="space-y-2">
              {cluster.map((doc, docIndex) => (
                <li key={docIndex} className="bg-blue-50 p-3 rounded-lg text-blue-800">
                  {doc}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResultsPage;