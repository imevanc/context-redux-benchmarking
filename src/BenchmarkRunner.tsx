import React, { createContext, useCallback, useContext, useState } from "react";
import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Provider, useDispatch } from "react-redux";
import { createRoot } from "react-dom/client";

const generateTestData = (size: number) =>
  Array.from({ length: size }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    value: Math.random() * 1000,
  }));

const ContextDataContext = createContext<{
  data: any[];
  updateData: (newData: any[]) => void;
}>({
  data: [],
  updateData: () => {},
});

const ContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<any[]>([]);

  const updateData = useCallback((newData: any[]) => {
    setData(newData);
  }, []);

  return (
    <ContextDataContext.Provider value={{ data, updateData }}>
      {children}
    </ContextDataContext.Provider>
  );
};

const dataSlice = createSlice({
  name: "data",
  initialState: [] as any[],
  reducers: {
    updateData: (state, action: PayloadAction<any[]>) => {
      return action.payload;
    },
  },
});

const store = configureStore({
  reducer: {
    data: dataSlice.reducer,
  },
});

const BenchmarkApp: React.FC<{
  method: "context" | "redux";
  arraySize: number;
  depth: number;
  onComplete: (time: number) => void;
}> = ({ method, arraySize, depth, onComplete }) => {
  const startTime = performance.now();

  const NestedChild: React.FC<{ level: number }> = ({ level }) => {
    if (level === 0) {
      if (method === "context") {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { updateData } = useContext(ContextDataContext);
        const newData = generateTestData(arraySize);

        // eslint-disable-next-line react-hooks/rules-of-hooks
        React.useEffect(() => {
          updateData(newData);
          const endTime = performance.now();
          onComplete(endTime - startTime);
        }, []);

        return <div>Context Update Child</div>;
      } else {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const dispatch = useDispatch();
        const newData = generateTestData(arraySize);

        // eslint-disable-next-line react-hooks/rules-of-hooks
        React.useEffect(() => {
          dispatch(dataSlice.actions.updateData(newData));
          const endTime = performance.now();
          onComplete(endTime - startTime);
        }, []);

        return <div>Redux Update Child</div>;
      }
    }

    return <NestedChild level={level - 1} />;
  };

  return <NestedChild level={depth} />;
};

const BenchmarkRunner: React.FC = () => {
  const [benchmarkResults, setBenchmarkResults] = useState<{
    context: Record<string, Record<string, number>>;
    redux: Record<string, Record<string, number>>;
  }>({
    context: {},
    redux: {},
  });
  const [isRunning, setIsRunning] = useState(false);

  const arraySizes = [10, 100, 1000, 10000, 100000, 1000000];
  const depths = [5, 10, 20, 50, 60, 70, 80, 90, 100];

  const runBenchmarks = () => {
    setIsRunning(true);
    const newResults = {
      context: {},
      redux: {},
    };

    const completeBenchmark =
      (method: "context" | "redux", size: number, depth: number) =>
      (time: number) => {
        if (!newResults[method][`${size} objects`]) {
          newResults[method][`${size} objects`] = {};
        }
        newResults[method][`${size} objects`][`Depth ${depth}`] = time;

        // Check if all benchmarks are complete
        const contextSizes = Object.keys(newResults.context);
        const reduxSizes = Object.keys(newResults.redux);

        if (
          contextSizes.length === arraySizes.length &&
          reduxSizes.length === arraySizes.length
        ) {
          setBenchmarkResults(newResults);
          setIsRunning(false);
        }
      };

    arraySizes.forEach((size) => {
      depths.forEach((depth) => {
        createRoot(document.createElement("div")).render(
          <ContextProvider>
            <BenchmarkApp
              method="context"
              arraySize={size}
              depth={depth}
              onComplete={completeBenchmark("context", size, depth)}
            />
          </ContextProvider>,
        );

        createRoot(document.createElement("div")).render(
          <Provider store={store}>
            <BenchmarkApp
              method="redux"
              arraySize={size}
              depth={depth}
              onComplete={completeBenchmark("redux", size, depth)}
            />
          </Provider>,
        );
      });
    });
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <button
        onClick={runBenchmarks}
        disabled={isRunning}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4 hover:bg-blue-600 disabled:opacity-50"
      >
        {isRunning ? "Running Benchmarks..." : "Run Benchmarks"}
      </button>

      {Object.keys(benchmarkResults.context).length > 0 && (
        <div className="flex">
          <div className="w-1/2 pr-2">
            <h2 className="text-xl font-bold mb-4 text-center">
              Context API Results
            </h2>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2">Array Size</th>
                  <th className="border p-2">Depth 5</th>
                  <th className="border p-2">Depth 10</th>
                  <th className="border p-2">Depth 20</th>
                  <th className="border p-2">Depth 50</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(benchmarkResults.context).map(
                  ([size, depthResults]) => (
                    <tr key={size}>
                      <td className="border p-2 text-center">{size}</td>
                      <td className="border p-2 text-center">
                        {depthResults["Depth 5"]?.toFixed(2)} ms
                      </td>
                      <td className="border p-2 text-center">
                        {depthResults["Depth 10"]?.toFixed(2)} ms
                      </td>
                      <td className="border p-2 text-center">
                        {depthResults["Depth 20"]?.toFixed(2)} ms
                      </td>
                      <td className="border p-2 text-center">
                        {depthResults["Depth 50"]?.toFixed(2)} ms
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <div className="w-1/2 pl-2">
            <h2 className="text-xl font-bold mb-4 text-center">
              Redux Results
            </h2>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2">Array Size</th>
                  <th className="border p-2">Depth 5</th>
                  <th className="border p-2">Depth 10</th>
                  <th className="border p-2">Depth 20</th>
                  <th className="border p-2">Depth 50</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(benchmarkResults.redux).map(
                  ([size, depthResults]) => (
                    <tr key={size}>
                      <td className="border p-2 text-center">{size}</td>
                      <td className="border p-2 text-center">
                        {depthResults["Depth 5"]?.toFixed(2)} ms
                      </td>
                      <td className="border p-2 text-center">
                        {depthResults["Depth 10"]?.toFixed(2)} ms
                      </td>
                      <td className="border p-2 text-center">
                        {depthResults["Depth 20"]?.toFixed(2)} ms
                      </td>
                      <td className="border p-2 text-center">
                        {depthResults["Depth 50"]?.toFixed(2)} ms
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BenchmarkRunner;
