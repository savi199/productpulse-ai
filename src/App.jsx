import { useCallback, useEffect, useMemo, useState } from "react";

import "./App.css";

const API = "http://localhost:4000/api";

const photoLibrary = {

  "Classic Cotton T-Shirt":

    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=85",

  "Urban Running Shoes":

    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85",

  "Travel Backpack":

    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=85",

  "Classic Denim Jeans":

    "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=700&q=85",

};

function photoFor(product) {

  const image = product.image || "";

  if (image && !image.includes("placehold.co")) {

    return image;

  }

  return (

    photoLibrary[product.name] ||

    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=700&q=85"

  );

}

function getIssues(product) {

  const issues = [];

  if (!product.sku?.trim()) issues.push("Missing SKU");

  if (!product.description?.trim()) issues.push("Missing description");

  if (!product.color?.trim()) issues.push("Missing color");

  if (!product.material?.trim()) issues.push("Missing material");

  if (

    !Number.isFinite(Number(product.price)) ||

    Number(product.price) <= 0

  ) {

    issues.push("Invalid price");

  }

  return issues;

}

function getScore(product) {

  return Math.round(((5 - getIssues(product).length) / 5) * 100);

}

function formatStatus(status) {

  if (!status) return "Pending";

  return status

    .replaceAll("_", " ")

    .replace(/\b\w/g, (letter) => letter.toUpperCase());

}

export default function App() {

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("All");

  const [selected, setSelected] = useState(null);

  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [saving, setSaving] = useState(false);

  const [audit, setAudit] = useState(null);

  const [view, setView] = useState("Products");

  const [activities, setActivities] = useState([]);

  // Demo recommendation state

  const [recommendations, setRecommendations] = useState([]);

  const [demoLoading, setDemoLoading] = useState(false);

  const [decisionLoading, setDecisionLoading] = useState("");

  const [manualValues, setManualValues] = useState({});

  const [recommendationError, setRecommendationError] = useState("");

  // Voice assistant state

  const [chatOpen, setChatOpen] = useState(false);

const [chatMessage, setChatMessage] = useState("");

const [isListening, setIsListening] = useState(false);

const [voiceTranscript, setVoiceTranscript] = useState("");

const [voiceReply, setVoiceReply] = useState(

  "Hi! I can help you check your product catalog."

);

const [voiceError, setVoiceError] = useState("");

function speakResponse(message) {

  setVoiceReply(message);

  if (!("speechSynthesis" in window)) {

    setVoiceError("Spoken replies are not supported in this browser.");

    return;

  }

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(message);

  speech.lang = "en-IN";

  speech.rate = 1;

  window.speechSynthesis.speak(speech);

}

async function handleVoiceCommand(rawText) {

  const command = rawText.toLowerCase().trim();

  setVoiceTranscript(rawText);

  setVoiceError("");

  try {

    // Answer questions using the current product catalog

    if (

      command.includes("how many products") ||

      command.includes("total products")

    ) {

      speakResponse(

        `You have ${products.length} products in your local catalog.`

      );

      return;

    }

    // Audit the catalog using existing backend rules

    if (

      command.includes("audit") ||

      command.includes("check my products") ||

      command.includes("check my catalog") ||

      command.includes("missing information")

    ) {

      speakResponse("Checking your product catalog now.");

      const response = await fetch(`${API}/agent/audit`, {

        method: "POST",

      });

      const result = await response.json();

      if (!response.ok) {

        throw new Error(result.message || "The audit failed.");

      }

      setAudit(result);

      addActivity(

        "Voice catalog audit",

        `${result.scanned} products checked; ${result.issueCount} issues found.`

      );

      speakResponse(

        `Audit complete. I checked ${result.scanned} products and found ${result.issueCount} issues across ${result.needsAttention} products. Please review the results on the AI Assistant page.`

      );

      return;

    }

    // Load the existing rule-based demo suggestions

    if (

      command.includes("suggestions") ||

      command.includes("recommendations")

    ) {

      speakResponse("Loading product suggestions.");

      const response = await fetch(

        `${API}/agent/demo-recommendations`

      );

      const result = await response.json();

      if (!response.ok || !result.success) {

        throw new Error(

          result.message || "Could not load suggestions."

        );

      }

      setRecommendations(result.recommendations || []);

      setManualValues({});

      setView("AI Assistant");

      speakResponse(

        `I found ${result.count} demo suggestions. These are rule-based suggestions, not live AI-generated results. Please review them before making changes.`

      );

      return;

    }

    if (

      command.includes("show products") ||

      command.includes("open products")

    ) {

      setView("Products");

      speakResponse("Opening your product catalog.");

      return;

    }

    if (

      command.includes("help") ||

      command.includes("what can you do")

    ) {

      speakResponse(

        "You can ask me to check your products, tell you how many products you have, load suggestions, or open your product catalog."

      );

      return;

    }

    speakResponse(

      "I did not recognize that request. Try saying: check my products, how many products do I have, load suggestions, or show products."

    );

  } catch (error) {

    const message =

      error.message || "Something went wrong while processing your request.";

    setVoiceError(message);

    speakResponse(`Sorry, I could not complete that task. ${message}`);

  }

}

function startVoiceInput() {

  const SpeechRecognition =

    window.SpeechRecognition ||

    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    setVoiceError(

      "Speech recognition is not supported in this browser. Try Google Chrome."

    );

    return;

  }

  setVoiceError("");

  const recognition = new SpeechRecognition();

  recognition.lang = "en-IN";

  recognition.continuous = false;

  recognition.interimResults = false;

  recognition.onstart = () => {

    setIsListening(true);

    setVoiceError("");

  };

  recognition.onresult = (event) => {

    const text = event.results[0][0].transcript;

    setVoiceTranscript(text);

    handleVoiceCommand(text);

  };

  recognition.onerror = (event) => {

    setVoiceError(

      event.error === "not-allowed"

        ? "Microphone permission was denied. Allow microphone access in your browser."

        : `Voice input failed: ${event.error}. Please try again.`

    );

  };

  recognition.onend = () => {

    setIsListening(false);

  };

  recognition.start();

}

  const addActivity = useCallback((title, detail) => {

    setActivities((old) =>

      [

        {

          title,

          detail,

          time: new Date().toLocaleTimeString(),

        },

        ...old,

      ].slice(0, 6)

    );

  }, []);

  // Load products from the local backend

  const loadProducts = useCallback(async () => {

    try {

      setLoading(true);

      setError("");

      const response = await fetch(`${API}/products`);

      if (!response.ok) {

        throw new Error("Unable to load products.");

      }

      const data = await response.json();

      setProducts(data.products || []);

    } catch {

      setError("Backend unavailable. Check that port 4000 is running.");

    } finally {

      setLoading(false);

    }

  }, []);

  useEffect(() => {

    loadProducts();

  }, [loadProducts]);

  // Product categories

  const categories = useMemo(

    () => [

      "All",

      ...new Set(

        products.map((product) => product.category || "Uncategorized")

      ),

    ],

    [products]

  );

  // Search and filter products

  const filtered = useMemo(

    () =>

      products.filter((product) => {

        const text =

          `${product.name} ${product.sku} ${product.category}`.toLowerCase();

        const matchesSearch = text.includes(search.toLowerCase());

        const matchesCategory =

          category === "All" ||

          (product.category || "Uncategorized") === category;

        return matchesSearch && matchesCategory;

      }),

    [products, search, category]

  );

  const issueCount = products.reduce(

    (sum, product) => sum + getIssues(product).length,

    0

  );

  const healthyCount = products.filter(

    (product) => getScore(product) === 100

  ).length;

  const avgScore = products.length

    ? Math.round(

        products.reduce((sum, product) => sum + getScore(product), 0) /

          products.length

      )

    : 0;

  // Run the backend quality audit

  async function runAudit() {

    try {

      setError("");

      setNotice("");

      const response = await fetch(`${API}/agent/audit`, {

        method: "POST",

      });

      const result = await response.json();

      if (!response.ok) {

        throw new Error(result.message || "Audit failed.");

      }

      setAudit(result);

      setView("AI Assistant");

      addActivity(

        "Catalog audit completed",

        `${result.scanned} products checked; ${result.issueCount} issues found.`

      );

    } catch (err) {

      setError(err.message || "Could not run the catalog audit.");

    }

  }

  // Load rule-based demo recommendations

  async function loadDemoRecommendations() {

    try {

      setDemoLoading(true);

      setRecommendationError("");

      setError("");

      setNotice("");

      const response = await fetch(

        `${API}/agent/demo-recommendations`

      );

      const result = await response.json();

      if (!response.ok || !result.success) {

        throw new Error(

          result.message || "Could not load demo suggestions."

        );

      }

      setRecommendations(result.recommendations || []);

      setManualValues({});

      setView("AI Assistant");

      addActivity(

        "Demo review generated",

        `${result.count} rule-based suggestions created.`

      );

      setNotice(

        "Demo suggestions loaded. Verify every value before applying it."

      );

    } catch (err) {

      setRecommendationError(

        err.message ||

          "Could not load suggestions. Check the backend."

      );

    } finally {

      setDemoLoading(false);

    }

  }

  // Approve or reject a recommendation and persist the decision in the backend.

  async function decideRecommendation(item, decision) {

    try {

      setDecisionLoading(item.id);

      setRecommendationError("");

      setError("");

      setNotice("");

      // Save a rejection without changing the product record.

      if (decision === "reject") {

        const response = await fetch(`${API}/agent/decisions`, {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({

            recommendationId: item.id,

            productId: item.productId,

            field: item.field,

            status: "rejected",

          }),

        });

        const result = await response.json();

        if (!response.ok || !result.success) {

          throw new Error(result.message || "Could not save the rejection.");

        }

        setRecommendations((old) =>

          old.map((recommendation) =>

            recommendation.id === item.id

              ? { ...recommendation, status: "rejected" }

              : recommendation

          )

        );

        addActivity("Suggestion rejected", item.productName);

        setNotice("Suggestion rejected and saved. The product was not changed.");

        return;

      }

      const value = String(

        manualValues[item.id] ?? item.suggestedValue ?? ""

      ).trim();

      if (!value) {

        throw new Error("Enter a verified value before approving this suggestion.");

      }

      const product = products.find(

        (candidate) => Number(candidate.id) === Number(item.productId)

      );

      if (!product) {

        throw new Error("Product not found. Refresh the catalog and try again.");

      }

      let updatedValue = value;

      if (item.field === "price") {

        const numericPrice = Number(value);

        if (!Number.isFinite(numericPrice) || numericPrice <= 0) {

          throw new Error("Enter a valid price greater than zero.");

        }

        updatedValue = numericPrice;

      }

      // Update the product first. Only record approval if that update succeeds.

      const productResponse = await fetch(`${API}/products/${product.id}`, {

        method: "PUT",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ ...product, [item.field]: updatedValue }),

      });

      const productResult = await productResponse.json();

      if (!productResponse.ok) {

        throw new Error(productResult.message || "Could not update the product.");

      }

      const decisionResponse = await fetch(`${API}/agent/decisions`, {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          recommendationId: item.id,

          productId: item.productId,

          field: item.field,

          status: "approved",

        }),

      });

      const decisionResult = await decisionResponse.json();

      if (!decisionResponse.ok || !decisionResult.success) {

        throw new Error(

          decisionResult.message ||

            "The product was updated, but the approval decision could not be saved."

        );

      }

      setRecommendations((old) =>

        old.map((recommendation) =>

          recommendation.id === item.id

            ? { ...recommendation, status: "approved", suggestedValue: value }

            : recommendation

        )

      );

      await loadProducts();

      addActivity("Suggestion approved", `${item.productName}: ${item.field} updated.`);

      setNotice(`${item.field} updated for ${item.productName}; approval saved.`);

    } catch (err) {

      setRecommendationError(err.message || "Could not process this suggestion.");

    } finally {

      setDecisionLoading("");

    }

  }

  // Save edits from the product editor

  async function saveProduct() {
    if (!selected) return;

    if (!selected.name?.trim() || !selected.sku?.trim()) {
      setError("Product name and SKU are required.");
      return;
    }

    const price = Number(selected.price);
    const stock = Number(selected.stock ?? 0);

    if (!Number.isFinite(price) || price < 0 ||
        !Number.isFinite(stock) || stock < 0) {
      setError("Price and stock must be valid non-negative numbers.");
      return;
    }

    const creating = isAddingProduct;

    try {
      setSaving(true);
      setError("");
      setNotice("");

      const response = await fetch(
        creating ? `${API}/products` : `${API}/products/${selected.id}`,
        {
          method: creating ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...selected, price, stock }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not save the product.");

      await loadProducts();
      setSelected(null);
      setIsAddingProduct(false);
      setAudit(null);

      const savedName = result.product?.name || selected.name;
      setNotice(creating ? "Product added successfully." : "Product saved successfully.");
      addActivity(
        creating ? "Product created" : "Product updated",
        `${savedName} saved to backend storage.`
      );
    } catch (err) {
      setError(err.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  }

  function openAddProduct() {
    setError("");
    setNotice("");
    setIsAddingProduct(true);
    setSelected({
      name: "",
      sku: "",
      category: "Uncategorized",
      image: "",
      color: "",
      material: "",
      size: "",
      price: "0",
      stock: "0",
      description: "",
    });
  }

  function closeProductEditor() {
    if (saving) return;
    setSelected(null);
    setIsAddingProduct(false);
    setError("");
  }

  function draftDescription() {

    if (!selected) return;

    setSelected({

      ...selected,

      description: `${selected.name} from our ${

        (selected.category || "product").toLowerCase()

      } collection. Designed for everyday comfort and style, with carefully selected materials and a versatile look.`,

    });

    setNotice(

      "A sample description is ready. Review it before saving."

    );

  }

  function navigate(name) {

    setView(name);

    setError("");

    setNotice("");

    setRecommendationError("");

  }

  return (

    <div className="commerce-app">

      {/* SIDEBAR */}

      <aside className="side-nav">

        <div className="logo-row">

          <div className="logo-symbol">P</div>

          <div>

            <strong>ProductPulse</strong>

            <small>COMMERCE STUDIO</small>

          </div>

        </div>

        <div className="nav-caption">YOUR WORKSPACE</div>

        {[

          ["Overview", "◫"],

          ["Products", "▦"],

          ["Attributes", "◇"],

          ["AI Assistant", "✳"],

          ["Store Sync", "↗"],

        ].map(([name, icon]) => (

          <button

            key={name}

            className={`side-link ${view === name ? "selected" : ""}`}

            onClick={() => navigate(name)}

          >

            <span>{icon}</span>

            {name}

            {name === "AI Assistant" && (

              <i className="nav-new">DEMO</i>

            )}

          </button>

        ))}

        <div className="nav-bottom">

          <div className="store-status">

            <span className="online-dot" />

            <div>

              <strong>Local workspace</strong>

              <small>Backend connection required</small>

            </div>

          </div>

          <div className="sync-warning">

            WooCommerce connection pending

          </div>

        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main className="commerce-main">

        <header className="commerce-topbar">

          <div className="crumb">

            Workspace <span>/</span> {view}

          </div>

          <div className="top-actions">

            <span className="environment-tag">

              <span className="online-dot" /> LOCAL DEMO

            </span>

            <div className="user-avatar">S</div>

          </div>

        </header>

        <div className="page-content">

          {error && (

            <div className="message-error" role="alert">

              {error}

            </div>

          )}

          {notice && (

            <div className="message-success" role="status">

              {notice}

            </div>

          )}

          {/* PRODUCTS PAGE */}

          {view === "Products" && (

            <>

              <section className="hero-banner">

                <div className="hero-copy">

                  <span className="hero-kicker">

                    YOUR PRODUCT WORKSPACE

                  </span>

                  <h1>

                    Good products deserve

                    <br />

                    <em>great presentation.</em>

                  </h1>

                  <p>

                    Manage your catalog, complete missing details,

                    and get your products ready for your store.

                  </p>

                  <button

                    className="hero-button"

                    onClick={runAudit}

                  >

                    ✳ Improve catalog quality <span>→</span>

                  </button>

                </div>

                <div className="hero-art">

                  <img

                    src={photoLibrary["Classic Cotton T-Shirt"]}

                    alt="Cotton apparel"

                  />

                  <img

                    src={photoLibrary["Urban Running Shoes"]}

                    alt="Running shoes"

                  />

                  <div className="hero-floating">

                    <span>✳</span>

                    <div>

                      <strong>{avgScore}%</strong>

                      <small>Catalog health</small>

                    </div>

                  </div>

                </div>

              </section>

              <section className="metric-row">

                <div className="metric">

                  <span className="metric-icon">▦</span>

                  <div>

                    <small>Total products</small>

                    <strong>{products.length}</strong>

                    <span>In your catalog</span>

                  </div>

                </div>

                <div className="metric">

                  <span className="metric-icon purple-icon">◉</span>

                  <div>

                    <small>Catalog health</small>

                    <strong>{avgScore}%</strong>

                    <span>Data completeness</span>

                  </div>

                </div>

                <div className="metric">

                  <span className="metric-icon orange-icon">!</span>

                  <div>

                    <small>Needs attention</small>

                    <strong>{products.length - healthyCount}</strong>

                    <span>Products to review</span>

                  </div>

                </div>

                <div className="metric">

                  <span className="metric-icon green-icon">✓</span>

                  <div>

                    <small>Open issues</small>

                    <strong>{issueCount}</strong>

                    <span>Missing or invalid fields</span>

                  </div>

                </div>

              </section>

              <section className="catalog-section">

                <div className="section-heading">

                  <div>

                    <span className="section-eyebrow">

                      PRODUCT LIBRARY

                    </span>

                    <h2>Your products</h2>

                    <p>Everything you sell, beautifully organized.</p>

                  </div>

                  <div className="catalog-heading-actions">
                    <button className="hero-button" onClick={openAddProduct} type="button">
                      + Add product
                    </button>
                    <button
                      className="outline-button"
                      onClick={loadProducts}
                      disabled={loading}
                      type="button"
                    >
                      ↻ {loading ? "Refreshing..." : "Refresh catalog"}
                    </button>
                  </div>

                </div>

                <div className="catalog-toolbar">

                  <div className="search-box">

                    <span>⌕</span>

                    <input

                      placeholder="Search products, SKU or category..."

                      value={search}

                      onChange={(event) =>

                        setSearch(event.target.value)

                      }

                    />

                  </div>

                  <div className="category-filters">

                    {categories.map((item) => (

                      <button

                        key={item}

                        className={

                          category === item ? "category-active" : ""

                        }

                        onClick={() => setCategory(item)}

                      >

                        {item}

                      </button>

                    ))}

                  </div>

                </div>

                {loading ? (

                  <div className="loading-state">

                    Loading your catalog…

                  </div>

                ) : (

                  <div className="product-grid">

                    {filtered.map((product) => {

                      const issues = getIssues(product);

                      return (

                        <article

                          className="product-card"

                          key={product.id}

                        >

                          <div className="product-image-wrap">

                            <img

                              className="catalog-image"

                              src={photoFor(product)}

                              alt={product.name}

                              onError={(event) => {

                                event.currentTarget.style.opacity = "0.3";

                              }}

                            />

                            <span

                              className={`product-status ${

                                issues.length ? "needs-fix" : "is-ready"

                              }`}

                            >

                              {issues.length

                                ? "Needs attention"

                                : "Ready"}

                            </span>

                            <button

                              className="edit-image-button"

                              title="Edit product"

                              onClick={() => {

                                setSelected({ ...product });

                                setError("");

                              }}

                            >

                              ↗

                            </button>

                          </div>

                          <div className="product-card-body">

                            <div className="product-category">

                              {product.category || "Uncategorized"}

                            </div>

                            <h3>{product.name}</h3>

                            <div className="product-sku">

                              {product.sku}

                            </div>

                            <div className="product-price-row">

                              <strong>

                                ₹

                                {Number(product.price).toLocaleString(

                                  "en-IN"

                                )}

                              </strong>

                              <span>{product.stock ?? 0} in stock</span>

                            </div>

                            <div className="product-quality">

                              <div className="quality-track">

                                <span

                                  style={{

                                    width: `${getScore(product)}%`,

                                  }}

                                />

                              </div>

                              <span>{getScore(product)}% complete</span>

                            </div>

                            {issues.length > 0 && (

                              <div className="card-issue">

                                {issues.length} issue

                                {issues.length > 1 ? "s" : ""}:{" "}

                                {issues.slice(0, 2).join(", ")}

                              </div>

                            )}

                            <button

                              className="manage-product"

                              onClick={() => {

                                setSelected({ ...product });

                                setError("");

                              }}

                            >

                              Manage product <span>→</span>

                            </button>

                          </div>

                        </article>

                      );

                    })}

                  </div>

                )}

                {!loading && filtered.length === 0 && (

                  <div className="empty-state">

                    No products match your search.

                  </div>

                )}

              </section>

            </>

          )}

          {/* OVERVIEW PAGE */}

          {view === "Overview" && (

            <>

              <section className="page-intro">

                <span className="section-eyebrow">WELCOME BACK</span>

                <h1>Your catalog at a glance.</h1>

                <p>

                  See what is complete and what needs your attention.

                </p>

              </section>

              <section className="metric-row">

                <div className="metric">

                  <span className="metric-icon">▦</span>

                  <div>

                    <small>Total products</small>

                    <strong>{products.length}</strong>

                    <span>In your catalog</span>

                  </div>

                </div>

                <div className="metric">

                  <span className="metric-icon purple-icon">◉</span>

                  <div>

                    <small>Catalog health</small>

                    <strong>{avgScore}%</strong>

                    <span>Data completeness</span>

                  </div>

                </div>

                <div className="metric">

                  <span className="metric-icon orange-icon">!</span>

                  <div>

                    <small>Needs attention</small>

                    <strong>{products.length - healthyCount}</strong>

                    <span>Products to review</span>

                  </div>

                </div>

                <div className="metric">

                  <span className="metric-icon green-icon">✓</span>

                  <div>

                    <small>Open issues</small>

                    <strong>{issueCount}</strong>

                    <span>Across the catalog</span>

                  </div>

                </div>

              </section>

              <div className="overview-columns">

                <section className="workspace-card">

                  <span className="section-eyebrow">

                    NEXT BEST ACTION

                  </span>

                  <h2>Let's improve your catalog.</h2>

                  <p>

                    Check for missing descriptions, colors, materials,

                    and invalid prices.

                  </p>

                  <button className="hero-button" onClick={runAudit}>

                    Run quality audit →

                  </button>

                </section>

                <section className="workspace-card">

                  <span className="section-eyebrow">

                    RECENT ACTIVITY

                  </span>

                  <h2>What has changed?</h2>

                  {activities.length ? (

                    activities.map((activity, index) => (

                      <p key={`${activity.title}-${index}`}>

                        ✓ {activity.title} — {activity.detail}

                      </p>

                    ))

                  ) : (

                    <p>Your recent product actions will appear here.</p>

                  )}

                </section>

              </div>

            </>

          )}

          {/* ATTRIBUTES PAGE */}

          {view === "Attributes" && (

            <>

              <section className="page-intro">

                <span className="section-eyebrow">

                  PRODUCT STRUCTURE

                </span>

                <h1>Attributes & variations</h1>

                <p>

                  Review size, color, and material details across

                  your catalog.

                </p>

              </section>

              <div className="attribute-grid">

                {["Color", "Material", "Size / variation"].map(

                  (label) => {

                    const key =

                      label === "Color"

                        ? "color"

                        : label === "Material"

                        ? "material"

                        : "size";

                    const values = [

                      ...new Set(

                        products

                          .map((product) => product[key])

                          .filter(Boolean)

                      ),

                    ];

                    return (

                      <section className="workspace-card" key={key}>

                        <span className="section-eyebrow">

                          {label.toUpperCase()}

                        </span>

                        <h2>{values.length} values</h2>

                        <div className="attribute-chips">

                          {values.map((value) => (

                            <span key={value}>{value}</span>

                          ))}

                        </div>

                        <p>

                          Manage an individual product to update its

                          attributes.

                        </p>

                        <button

                          className="outline-button"

                          onClick={() => {

                            setView("Products");

                            setCategory("All");

                          }}

                        >

                          Manage products →

                        </button>

                      </section>

                    );

                  }

                )}

              </div>

              <section className="workspace-card">

                <h2>Products missing attributes</h2>

                {products

                  .filter(

                    (product) =>

                      !product.color ||

                      !product.material ||

                      !product.size

                  )

                  .map((product) => (

                    <div

                      className="attribute-product"

                      key={product.id}

                    >

                      <span>{product.name}</span>

                      <span>

                        {[

                          !product.color && "Color",

                          !product.material && "Material",

                          !product.size && "Size",

                        ]

                          .filter(Boolean)

                          .join(", ")}

                      </span>

                      <button

                        className="text-btn"

                        onClick={() => setSelected({ ...product })}

                      >

                        Fix

                      </button>

                    </div>

                  ))}

              </section>

            </>

          )}

          {/* AI ASSISTANT PAGE */}

          {view === "AI Assistant" && (

            <>

              <section className="page-intro">

                <span className="section-eyebrow">

                  PRODUCT INTELLIGENCE

                </span>

                <h1>Make your catalog better.</h1>

                <p>

                  Find incomplete product data and review possible

                  improvements before applying changes.

                </p>

              </section>

              <section className="ai-feature">

                <div className="ai-orb">✳</div>

                <span className="section-eyebrow">

                  QUALITY ASSISTANT

                </span>

                <h2>Your product quality assistant</h2>

                <p>

                  Audit your catalog and review suggestions for missing

                  product information.

                </p>

                <div className="ai-action-row">

                  <button

                    className="hero-button"

                    onClick={runAudit}

                  >

                    Run quality audit →

                  </button>

                  <button

                    className="outline-button demo-load-button"

                    onClick={loadDemoRecommendations}

                    disabled={demoLoading}

                  >

                    {demoLoading

                      ? "Loading suggestions..."

                      : "Load demo suggestions"}

                  </button>

                </div>

                <div className="demo-disclosure">

                  <strong>DEMO MODE</strong>

                  <span>

                    Rule-based suggestions · Not live AI-generated output

                  </span>

                </div>

              </section>

              {/* Audit results */}

              {audit && (

                <section className="workspace-card audit-card">

                  <h2>Audit results</h2>

                  <p>

                    Inspected {audit.scanned} products. Found{" "}

                    {audit.issueCount} issues across{" "}

                    {audit.needsAttention} products.

                  </p>

                  {(audit.findings || [])

                    .filter((product) => product.issues?.length)

                    .map((product) => (

                      <div

                        className="attribute-product"

                        key={product.id}

                      >

                        <div>

                          <strong>{product.name}</strong>

                          <p>{product.issues.join(" · ")}</p>

                        </div>

                        <button

                          className="text-btn"

                          onClick={() => {

                            const fullProduct = products.find(

                              (item) =>

                                Number(item.id) === Number(product.id)

                            );

                            if (fullProduct) {

                              setSelected({ ...fullProduct });

                            }

                          }}

                        >

                          Review & fix →

                        </button>

                      </div>

                    ))}

                </section>

              )}

              {/* Recommendation errors */}

              {recommendationError && (

                <div className="message-error" role="alert">

                  {recommendationError}

                </div>

              )}

              {/* Recommendation queue */}

              <section className="workspace-card recommendation-section">

                <div className="section-heading">

                  <div>

                    <span className="section-eyebrow">

                      HUMAN REVIEW REQUIRED

                    </span>

                    <h2>Recommendation queue</h2>

                    <p>

                      Review each suggestion. Approving a valid

                      suggestion updates your local product catalog.

                    </p>

                  </div>

                  <span className="recommendation-count">

                    {recommendations.length} suggestions

                  </span>

                </div>

                {recommendations.length === 0 ? (

                  <div className="empty-state">

                    No suggestions loaded yet. Select{" "}

                    <strong>Load demo suggestions</strong> above to

                    start reviewing sample recommendations.

                  </div>

                ) : (

                  <div className="recommendation-list">

                    {recommendations.map((item) => {

                      const finished = [

                        "approved",

                        "rejected",

                      ].includes(item.status);

                      const needsManualValue =

                        !String(

                          manualValues[item.id] ??

                            item.suggestedValue ??

                            ""

                        ).trim();

                      return (

                        <article

                          className="recommendation-card"

                          key={item.id}

                        >

                          <div className="recommendation-top">

                            <div>

                              <span className="section-eyebrow">

                                {item.field}

                              </span>

                              <h3>{item.productName}</h3>

                              <p>

                                Product ID: {item.productId}

                              </p>

                            </div>

                            <span

                              className={`recommendation-status status-${item.status}`}

                            >

                              {formatStatus(item.status)}

                            </span>

                          </div>

                          <div className="recommendation-values">

                            <div>

                              <small>Current value</small>

                              <p>

                                {String(item.currentValue ?? "").trim() ||

                                  "Not provided"}

                              </p>

                            </div>

                            <div>

                              <small>Suggested value</small>

                              <p>

                                {String(item.suggestedValue ?? "").trim() ||

                                  "Requires manual review"}

                              </p>

                            </div>

                          </div>

                          <p className="recommendation-reason">

                            <strong>Why this needs attention:</strong>{" "}

                            {item.reason}

                          </p>

                          {!finished && (

                            <>

                              <label className="recommendation-input-label">

                                Verified value for {item.field}

                                <input

                                  type={

                                    item.field === "price"

                                      ? "number"

                                      : "text"

                                  }

                                  min={

                                    item.field === "price" ? "0.01" : undefined

                                  }

                                  step={

                                    item.field === "price" ? "0.01" : undefined

                                  }

                                  placeholder={

                                    needsManualValue

                                      ? "Enter a verified value"

                                      : "Edit suggested value if needed"

                                  }

                                  value={

                                    manualValues[item.id] ??

                                    item.suggestedValue ??

                                    ""

                                  }

                                  onChange={(event) =>

                                    setManualValues((old) => ({

                                      ...old,

                                      [item.id]: event.target.value,

                                    }))

                                  }

                                />

                              </label>

                              <div className="recommendation-actions">

                                <button

                                  className="hero-button"

                                  disabled={

                                    Boolean(decisionLoading) ||

                                    needsManualValue

                                  }

                                  onClick={() =>

                                    decideRecommendation(item, "approve")

                                  }

                                >

                                  {decisionLoading === item.id

                                    ? "Applying..."

                                    : "Approve & apply"}

                                </button>

                                <button

                                  className="outline-button"

                                  disabled={Boolean(decisionLoading)}

                                  onClick={() =>

                                    decideRecommendation(item, "reject")

                                  }

                                >

                                  Reject

                                </button>

                              </div>

                              {item.status === "manual_review" && (

                                <p className="manual-review-note">

                                  Verify this information from a trusted

                                  source before applying it.

                                </p>

                              )}

                            </>

                          )}

                          {item.status === "approved" && (

                            <p className="decision-message">

                              ✓ Approved. The local product record was

                              updated successfully.

                            </p>

                          )}

                          {item.status === "rejected" && (

                            <p className="decision-message">

                              Suggestion rejected. No product change was made.

                            </p>

                          )}

                        </article>

                      );

                    })}

                  </div>

                )}

              </section>

              {/* Activity */}

              <section className="workspace-card">

                <span className="section-eyebrow">

                  RECENT ACTIVITY

                </span>

                <h2>Agent activity</h2>

                {activities.length ? (

                  activities.map((activity, index) => (

                    <div

                      className="attribute-product"

                      key={`${activity.title}-${index}`}

                    >

                      <div>

                        <strong>{activity.title}</strong>

                        <p>{activity.detail}</p>

                      </div>

                      <small>{activity.time}</small>

                    </div>

                  ))

                ) : (

                  <p>No activity yet. Run an audit to get started.</p>

                )}

                <p className="honest-note">

                  This prototype uses backend validation rules and

                  rule-based demo recommendations. Suggestions are not

                  generated by live AI while the AI API is unavailable.

                  Approved edits affect local backend storage only.

                  WooCommerce synchronization is not connected.

                </p>

              </section>

            </>

          )}

          {/* STORE SYNC PAGE */}

          {view === "Store Sync" && (

            <>

              <section className="page-intro">

                <span className="section-eyebrow">

                  CHANNEL CONNECTIONS

                </span>

                <h1>Keep your store in sync.</h1>

                <p>

                  Prepare your catalog for a WooCommerce connection.

                </p>

              </section>

              <section className="sync-hero">

                <div className="sync-logo">W</div>

                <div>

                  <h2>WooCommerce</h2>

                  <p>

                    Connect your online store to synchronize product

                    details, images, and attributes.

                  </p>

                  <span className="pending-pill">

                    Connection not configured

                  </span>

                </div>

              </section>

              <section className="workspace-card">

                <h2>What we'll synchronize</h2>

                {[

                  "Product names, descriptions and prices",

                  "Product images and categories",

                  "Attributes such as size, color and material",

                  "Stock and variation information",

                ].map((item) => (

                  <div className="sync-list-item" key={item}>

                    <span>✓</span>

                    {item}

                  </div>

                ))}

                <div className="honest-note">

                  No store credentials were provided. Live synchronization

                  is not active, and no data has been sent to WooCommerce.

                  A test store and API credentials are required to implement

                  and verify the connection.

                </div>

              </section>

            </>

          )}

        </div>

        <footer className="commerce-footer">

          ProductPulse Studio <span>·</span> Product Information Management{" "}

          <span>·</span> Hackathon prototype

        </footer>

        {/* Floating ProductPulse Assistant */}

<div className="floating-assistant">

  {chatOpen && (

    <section className="assistant-popup" aria-label="ProductPulse assistant">

      <header className="assistant-popup-header">

        <div>

          <strong>ProductPulse AI</strong>

          <small>Product assistant · Demo mode</small>

        </div>

        <button

          type="button"

          className="assistant-close"

          aria-label="Close assistant"

          onClick={() => setChatOpen(false)}

        >

          ×

        </button>

      </header>

      <div className="assistant-popup-body" aria-live="polite">

        <p className="assistant-message">

          {voiceReply}

        </p>

        {voiceTranscript && (

          <p className="assistant-transcript">

            You said: {voiceTranscript}

          </p>

        )}

        {voiceError && (

          <p className="assistant-error">{voiceError}</p>

        )}

      </div>

      <form

        className="assistant-chat-form"

        onSubmit={(event) => {

          event.preventDefault();

          if (!chatMessage.trim()) return;

          const message = chatMessage.trim();

          setChatMessage("");

          handleVoiceCommand(message);

        }}

      >

        <input

          value={chatMessage}

          onChange={(event) => setChatMessage(event.target.value)}

          placeholder="Ask about your products..."

          aria-label="Message the assistant"

        />

        <button type="submit" aria-label="Send message">

          ➤

        </button>

      </form>

      <div className="assistant-popup-footer">

        <button

          type="button"

          className="assistant-mic"

          onClick={startVoiceInput}

          disabled={isListening}

        >

          {isListening ? "🎙 Listening..." : "🎙 Speak"}

        </button>

        <button

          type="button"

          className="assistant-speak"

          onClick={() => speakResponse(voiceReply)}

        >

          🔊 Speak reply

        </button>

      </div>

    </section>

  )}

  <button

    type="button"

    className="floating-assistant-button"

    onClick={() => setChatOpen((open) => !open)}

    aria-label={chatOpen ? "Close AI assistant" : "Open AI assistant"}

    aria-expanded={chatOpen}

  >

    {chatOpen ? "×" : "✳"}

  </button>

</div>

      </main>

      {/* PRODUCT EDITOR MODAL */}

      {selected && (

        <div

          className="modal-backdrop"

          onClick={closeProductEditor}

        >

          <section

            className="edit-modal commerce-modal"

            role="dialog"

            aria-modal="true"

            aria-labelledby="edit-title"

            onClick={(event) => event.stopPropagation()}

          >

            <div className="modal-heading">

              <div>

                <span className="section-eyebrow">{isAddingProduct ? "NEW PRODUCT" : "PRODUCT EDITOR"}</span>

                <h2 id="edit-title">{isAddingProduct ? "Add a product" : "Manage product"}</h2>

                <p>

                  Make changes, then save them to your catalog.

                </p>

              </div>

              <button

                className="close-btn"

                disabled={saving}

                onClick={closeProductEditor}

              >

                ×

              </button>

            </div>

            <img

              className="editor-image"

              src={photoFor(selected)}

              alt={selected.name}

            />

            {[

              ["Product name", "name"],

              ["SKU", "sku"],

              ["Category", "category"],

              ["Image URL", "image"],

              ["Color", "color"],

              ["Material", "material"],

              ["Size / variation", "size"],

            ].map(([label, key]) => (

              <label key={key}>

                {label}

                <input

                  value={selected[key] ?? ""}

                  onChange={(event) =>

                    setSelected({

                      ...selected,

                      [key]: event.target.value,

                    })

                  }

                />

              </label>

            ))}

            <label>

              Price (₹)

              <input

                type="number"

                min="0"

                value={selected.price ?? ""}

                onChange={(event) =>

                  setSelected({

                    ...selected,

                    price: event.target.value,

                  })

                }

              />

            </label>

            <label>

              Stock quantity

              <input

                type="number"

                min="0"

                value={selected.stock ?? 0}

                onChange={(event) =>

                  setSelected({

                    ...selected,

                    stock: event.target.value,

                  })

                }

              />

            </label>

            <label>

              Description

              <textarea

                rows="4"

                value={selected.description ?? ""}

                onChange={(event) =>

                  setSelected({

                    ...selected,

                    description: event.target.value,

                  })

                }

              />

            </label>

            <button

              className="outline-button draft-button"

              onClick={draftDescription}

            >

              ✳ Draft sample description

            </button>

            <div className="modal-actions">

              <button

                className="outline-button"

                disabled={saving}

                onClick={closeProductEditor}

              >

                Cancel

              </button>

              <button

                className="hero-button"

                disabled={saving}

                onClick={saveProduct}

              >

                {saving ? "Saving…" : isAddingProduct ? "Add product" : "Save product changes"}

              </button>

            </div>

          </section>

        </div>

      )}

    </div>

  );

}