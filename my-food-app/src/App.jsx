/*
React frontend (App.jsx) — CONNECTS VIA @gradio/client (no UI changes)

Changes (logic only):
- Default slug is "Priyanshu161/food-recommender"
- Map form field `carbohydrates` -> backend `carbs`
- Cache Client.connect() in a ref to avoid reconnecting every request
- Robust normalization of Gradio response shapes
*/

import React, { useState, useEffect, useRef } from "react";
import { Client } from "@gradio/client";

const HF_DEFAULT = "Priyanshu161/food-recommender"; // Default HF Space

const TEST_CASES = [
  {
    id: "salad",
    label: "Healthy Salad",
    payload: {
      calories: 250,
      fat: 10,
      carbohydrates: 30,
      protein: 8,
      cholesterol: 5,
      sodium: 150,
      fiber: 5,
      ingredients: "lettuce, tomato, cucumber",
    },
  },
  {
    id: "protein",
    label: "High-Protein Meal",
    payload: {
      calories: 500,
      fat: 15,
      carbohydrates: 40,
      protein: 35,
      cholesterol: 80,
      sodium: 250,
      fiber: 6,
      ingredients: "chicken, garlic, olive oil",
    },
  },
  {
    id: "dessert",
    label: "Dessert",
    payload: {
      calories: 450,
      fat: 20,
      carbohydrates: 60,
      protein: 5,
      cholesterol: 40,
      sodium: 100,
      fiber: 2,
      ingredients: "chocolate, sugar, flour",
    },
  },
];

function detectApiUrl() {
  const DEFAULT = HF_DEFAULT;
  try {
    if (typeof window !== "undefined" && window.__APP_API_URL__) return window.__APP_API_URL__;
  } catch (e) {}
  try {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("APP_API_URL");
      if (stored && stored.length > 5) return stored;
    }
  } catch (e) {}
  try {
    if (typeof process !== "undefined" && process.env) {
      return (
        process.env.REACT_APP_API_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        DEFAULT
      );
    }
  } catch (e) {}
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      return (
        import.meta.env.VITE_API_URL ||
        import.meta.env.REACT_APP_API_URL ||
        DEFAULT
      );
    }
  } catch (e) {}
  return DEFAULT;
}

export default function App() {
  const [apiUrl, setApiUrl] = useState(detectApiUrl());
  const [form, setForm] = useState({
    calories: "",
    fat: "",
    carbohydrates: "",
    protein: "",
    cholesterol: "",
    sodium: "",
    fiber: "",
    ingredients: "",
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [testResults, setTestResults] = useState([]);

  const clientRef = useRef(null);

  useEffect(() => {
    try {
      if (typeof window !== "undefined")
        window.localStorage.setItem("APP_API_URL", apiUrl);
    } catch (e) {}
  }, [apiUrl]);

  const numberOrZero = (v) => {
    if (v === "" || v === null) return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  function normalizeGradioOutput(data) {
  if (!data) return [];

  // unwrap { data: [...] }
  if (data && typeof data === "object" && Array.isArray(data.data)) {
    return normalizeGradioOutput(data.data);
  }

  // unwrap [[ {...}, {...} ]]
  if (Array.isArray(data) && data.length === 1 && Array.isArray(data[0])) {
    return normalizeGradioOutput(data[0]);
  }

  // ✅ New Case: Gradio returns [{ image, caption }]
  if (Array.isArray(data) && data.every(it => it && it.image && it.caption)) {
    return data.map((it, i) => ({
      recipe_name: it.caption?.split("\n")[0] || `Recipe ${i + 1}`,
      image_url: typeof it.image === "string" ? it.image : it.image.url || "",
      ingredients_list: it.caption || "",
    }));
  }

  // already array of objects with recipe_name/image_url
  if (Array.isArray(data) && data.every(it => typeof it === "object" && !Array.isArray(it))) {
    return data.map((it, i) => ({
      recipe_name: it.recipe_name || it.name || it.title || `Recipe ${i + 1}`,
      image_url: it.image_url || it.image || "",
      ingredients_list: it.ingredients_list || it.ingredients || "",
    }));
  }

  // [[names], [urls]]
  if (Array.isArray(data) && data.length >= 2 && Array.isArray(data[0]) && Array.isArray(data[1])) {
    const names = data[0];
    const urls = data[1];
    return names.map((nm, i) => ({
      recipe_name: nm || `Recipe ${i + 1}`,
      image_url: urls[i] || "",
      ingredients_list: "",
    }));
  }

  // [[name, url], ...]
  if (Array.isArray(data) && data.every(it => Array.isArray(it) && it.length >= 2)) {
    return data.map((it, i) => ({
      recipe_name: it[0] || `Recipe ${i + 1}`,
      image_url: it[1] || "",
      ingredients_list: "",
    }));
  }

  // fallback
  return [{ recipe_name: JSON.stringify(data), image_url: "", ingredients_list: "" }];
}


  // ✅ Corrected function to call Hugging Face API properly
  async function fetchRecommendations(payload) {
    try {
      // Connect (reuse existing client if same Space)
      if (!clientRef.current) {
        clientRef.current = await Client.connect(apiUrl);
      }

      // Call /predict endpoint exactly as HF docs
      const result = await clientRef.current.predict("/predict", {
        calories: payload.calories,
        fat: payload.fat,
        carbs: payload.carbohydrates, // Backend expects 'carbs'
        protein: payload.protein,
        cholesterol: payload.cholesterol,
        sodium: payload.sodium,
        fiber: payload.fiber,
        ingredients: payload.ingredients,
      });

      return normalizeGradioOutput(result.data);
    } catch (err) {
      console.error("API call failed:", err);
      clientRef.current = null; // reset connection
      throw new Error(err?.message || "Failed to fetch recommendations");
    }
  }

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    setError(null);
    setResults([]);

    const payload = {
      calories: numberOrZero(form.calories),
      fat: numberOrZero(form.fat),
      carbohydrates: numberOrZero(form.carbohydrates),
      protein: numberOrZero(form.protein),
      cholesterol: numberOrZero(form.cholesterol),
      sodium: numberOrZero(form.sodium),
      fiber: numberOrZero(form.fiber),
      ingredients: form.ingredients || "",
    };

    setLoading(true);
    try {
      const items = await fetchRecommendations(payload);
      setResults(items.slice(0, 12));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runAllTestCases = async () => {
    setTestResults([]);
    setError(null);
    const out = [];

    for (const tc of TEST_CASES) {
      try {
        const items = await fetchRecommendations(tc.payload);
        out.push({ id: tc.id, label: tc.label, ok: true, count: items.length });
      } catch (err) {
        out.push({
          id: tc.id,
          label: tc.label,
          ok: false,
          error: err?.message || String(err),
        });
        clientRef.current = null;
      }
    }

    setTestResults(out);
  };

  const fillFromTestCase = (tc) => {
    const p = tc.payload;
    setForm({
      calories: p.calories?.toString() || "",
      fat: p.fat?.toString() || "",
      carbohydrates: p.carbohydrates?.toString() || "",
      protein: p.protein?.toString() || "",
      cholesterol: p.cholesterol?.toString() || "",
      sodium: p.sodium?.toString() || "",
      fiber: p.fiber?.toString() || "",
      ingredients: p.ingredients || "",
    });
    setResults([]);
    setError(null);
  };

//   return (
//     <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
//       <h1>🍽 Food Recommender</h1>
//       <p>Connected to: <b>{apiUrl}</b></p>

//       <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
//         {Object.keys(form).map((key) => (
//           <div key={key} style={{ margin: "0.5rem 0" }}>
//             <label>
//               {key.charAt(0).toUpperCase() + key.slice(1)}:{" "}
//               <input
//                 type={key === "ingredients" ? "text" : "number"}
//                 name={key}
//                 value={form[key]}
//                 onChange={handleChange}
//                 style={{ width: "200px" }}
//               />
//             </label>
//           </div>
//         ))}
//         <button type="submit" disabled={loading}>
//           {loading ? "Loading..." : "Get Recommendations"}
//         </button>
//       </form>

//       {error && <div style={{ color: "red" }}>⚠️ {error}</div>}

//       {results.length > 0 && (
//         <div>
//           <h3>Recommendations:</h3>
//           <ul>
//             {results.map((r, i) => (
//               <li key={i}>
//                 <b>{r.recipe_name}</b>
//                 {r.image_url && (
//                   <img
//                     src={r.image_url}
//                     alt={r.recipe_name}
//                     style={{ width: "100px", marginLeft: "10px" }}
//                   />
//                 )}
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}

//       <hr />
//       <h3>Test Cases</h3>
//       {TEST_CASES.map((tc) => (
//         <button key={tc.id} onClick={() => fillFromTestCase(tc)} style={{ margin: "0.25rem" }}>
//           {tc.label}
//         </button>
//       ))}
//       <button onClick={runAllTestCases} style={{ marginLeft: "1rem" }}>
//         Run All
//       </button>

//       {testResults.length > 0 && (
//         <div style={{ marginTop: "1rem" }}>
//           <h4>Test Results:</h4>
//           <ul>
//             {testResults.map((t) => (
//               <li key={t.id}>
//                 {t.label}: {t.ok ? `✅ (${t.count} results)` : `❌ ${t.error}`}
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}
//     </div>
//   );
// }


  // UI (unchanged)
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 antialiased p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">🍽️ Food Recommender</h1>
            <p className="text-gray-400 mt-1">Connects to your Hugging Face Space — enter values or run tests.</p>
          </div>

          <div className="w-full max-w-sm">
            <label className="block text-xs text-gray-400">API URL (editable, saved to localStorage)</label>
            <div className="mt-2 flex gap-2">
              <input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="flex-1 rounded-md px-3 py-2 bg-gray-800 text-gray-100 border border-gray-700"
              />
              <button
                onClick={() => {
                  setApiUrl(detectApiUrl());
                  setError(null);
                }}
                className="px-3 rounded bg-gray-700"
              >
                Detect
              </button>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">Default: Hugging Face Space slug or URL.</p>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleSubmit} className="lg:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 shadow-lg">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-gray-300">Calories</span>
                <input
                  name="calories"
                  value={form.calories}
                  onChange={handleChange}
                  type="number"
                  placeholder="e.g. 350"
                  className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white px-3 py-2 focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-300">Fat (g)</span>
                <input
                  name="fat"
                  value={form.fat}
                  onChange={handleChange}
                  type="number"
                  placeholder="e.g. 20"
                  className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white px-3 py-2 focus:outline-none"
                />
              </label>

              <label className="block text-sm">
                <span className="text-gray-300">Carbs (g)</span>
                <input
                  name="carbohydrates"
                  value={form.carbohydrates}
                  onChange={handleChange}
                  type="number"
                  placeholder="e.g. 40"
                  className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white px-3 py-2 focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-300">Protein (g)</span>
                <input
                  name="protein"
                  value={form.protein}
                  onChange={handleChange}
                  type="number"
                  placeholder="e.g. 25"
                  className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white px-3 py-2 focus:outline-none"
                />
              </label>

              <label className="block text-sm">
                <span className="text-gray-300">Cholesterol</span>
                <input
                  name="cholesterol"
                  value={form.cholesterol}
                  onChange={handleChange}
                  type="number"
                  placeholder="e.g. 50"
                  className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white px-3 py-2 focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-300">Sodium</span>
                <input
                  name="sodium"
                  value={form.sodium}
                  onChange={handleChange}
                  type="number"
                  placeholder="e.g. 200"
                  className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white px-3 py-2 focus:outline-none"
                />
              </label>

              <label className="block text-sm col-span-2">
                <span className="text-gray-300">Fiber (g)</span>
                <input
                  name="fiber"
                  value={form.fiber}
                  onChange={handleChange}
                  type="number"
                  placeholder="e.g. 5"
                  className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white px-3 py-2 focus:outline-none"
                />
              </label>

              <label className="block text-sm col-span-2">
                <span className="text-gray-300">Ingredients</span>
                <input
                  name="ingredients"
                  value={form.ingredients}
                  onChange={handleChange}
                  type="text"
                  placeholder="e.g. chicken, garlic, onion"
                  className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white px-3 py-2 focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-600">
                {loading ? "Searching..." : "Get Recommendations"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({ calories: "", fat: "", carbohydrates: "", protein: "", cholesterol: "", sodium: "", fiber: "", ingredients: "" });
                  setResults([]);
                  setError(null);
                }}
                className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
              >
                Reset
              </button>
            </div>

            <div className="mt-3 text-sm text-gray-400">
              <p>
                Backend: <span className="text-xs text-gray-300 break-all">{apiUrl}</span>
              </p>
            </div>
            {error && <div className="mt-3 text-sm text-red-400">Error: {error}</div>}

            <div className="mt-4">
              <h4 className="text-sm font-semibold">Test cases</h4>
              <div className="flex gap-2 mt-2">
                {TEST_CASES.map((tc) => (
                  <button key={tc.id} onClick={() => fillFromTestCase(tc)} className="px-2 py-1 bg-gray-700 rounded text-sm">
                    {tc.label}
                  </button>
                ))}
                <button onClick={runAllTestCases} className="px-2 py-1 bg-indigo-600 rounded text-sm">
                  Run all
                </button>
              </div>

              {testResults.length > 0 && (
                <div className="mt-3 text-xs text-gray-300">
                  {testResults.map((tr) => (
                    <div key={tr.id} className="mb-1">
                      <strong>{tr.label}:</strong> {tr.ok ? `OK — ${tr.count} items` : `Error — ${tr.error}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>

          <section className="lg:col-span-2">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 shadow-lg min-h-[320px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Recommendations</h2>
                <div className="text-sm text-gray-400">Showing top {results.length} results</div>
              </div>

              {loading && (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-pink-500"></div>
                </div>
              )}

              {!loading && results.length === 0 && <div className="text-gray-400">No results yet. Submit values or run a test case.</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {results.map((r, i) => (
                  <article key={i} className="bg-gradient-to-br from-gray-900 to-gray-800 p-3 rounded-xl shadow-inner border border-gray-700">
                    <div className="h-40 bg-gray-700 rounded-md overflow-hidden flex items-center justify-center">
                      {r.image_url ? (
                        <img
                          src={r.image_url}
                          alt={r.recipe_name || `Recipe ${i + 1}`}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "";
                          }}
                        />
                      ) : (
                        <div className="text-gray-500">No image</div>
                      )}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-white break-words">{r.recipe_name || `Recipe ${i + 1}`}</h3>
                    {r.ingredients_list && <p className="mt-2 text-sm text-gray-300 line-clamp-3 break-words">{r.ingredients_list}</p>}
                    <div className="mt-3 flex items-center justify-between">
                      <a href={r.image_url || "#"} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-white">
                        Open image
                      </a>
                      <button onClick={() => navigator.clipboard.writeText(r.recipe_name || "")} className="text-xs bg-gray-700 px-2 py-1 rounded">
                        Copy name
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-8 text-center text-gray-500 text-sm">Built with ❤️ • Connects to your Gradio/ML backend.</footer>
      </div>
    </div>
  );
}
