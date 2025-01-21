import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

import { Bar } from "react-chartjs-2";

const BASE_URL = "https://dshpwm27s7.execute-api.us-east-1.amazonaws.com";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [intents, setIntents] = useState([]); // All intents
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    const fetchIntents = async () => {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/intents`);
      const { data } = await response.json();
      setIntents(data);
      setLoading(false);
    };

    fetchIntents();
  }, []);

  const clusteredIntents = useMemo(() => {
    // Group intents by cluster_id
    const clusters = intents.reduce((acc, intent) => {
      if (!intent.cluster_id) {
        return acc;
      }

      if (!acc[intent.cluster_id]) {
        acc[intent.cluster_id] = [];
      }

      acc[intent.cluster_id].push(intent);
      return acc;
    }, {});
    // Sort clusters by length
    return Object.values(clusters).sort((a, b) => b.length - a.length);
  }, [intents]);

  const options = {
    indexAxis: "y",
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: `Call Intents Distribution / ${intents.length}`,
      },
    },
    onClick: (event, chartElements) => {
      if (chartElements.length > 0) {
        const element = chartElements[0]; // The clicked element
        const index = element.index;
        setSelectedIndex(index);
      }
    },
  };

  const labels = clusteredIntents.map((cluster) => cluster[0].intent);
  const datasets = [
    {
      label: "Clustered Intents",
      data: clusteredIntents.map((cluster) => cluster.length),
    },
  ];

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  return (
    <div className="flex gap-4 relative">
      <div className="w-1 grow">
        <Bar data={{ labels, datasets }} options={options} height={200} />
      </div>
      <div className="w-80 py-8 px-4 text-sm text-gray-500 overflow-auto sticky top-0 h-[100vh] border-l">
        {selectedIndex > -1 && (
          <div>
            <h3 className="text-xl">
              {clusteredIntents[selectedIndex].length} intents
            </h3>
            <hr className="my-1" />
            <ul>
              {clusteredIntents[selectedIndex].map((intent) => (
                <li key={intent.call_id} className="mb-2">
                  {intent.intent}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
