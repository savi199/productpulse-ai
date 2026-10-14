require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, "products.json");
const DECISIONS_FILE = path.join(
  __dirname,
  "recommendation-decisions.json"
);

const initialProducts = [
  {
    id: 1,
    name: "Classic Cotton T-Shirt",
    sku: "TSH-001",
    category: "Apparel",
    price: 499,
    description: "Soft cotton everyday T-shirt.",
    color: "Black",
    material: "Cotton",
    size: "M",
    image: "https://placehold.co/400x400?text=T-Shirt",
    stock: 42,
  },
  {
    id: 2,
    name: "Urban Running Shoes",
    sku: "SHO-002",
    category: "Footwear",
    price: 2499,
    description: "",
    color: "White",
    material: "Mesh",
    size: "8",
    image: "https://placehold.co/400x400?text=Shoes",
    stock: 18,
  },
  {
    id: 3,
    name: "Travel Backpack",
    sku: "BAG-003",
    category: "Accessories",
    price: 1499,
    description: "Lightweight travel backpack.",
    color: "",
    material: "Polyester",
    size: "Standard",
    image: "https://placehold.co/400x400?text=Backpack",
    stock: 25,
  },
  {
    id: 4,
    name: "Classic Denim Jeans",
    sku: "JNS-004",
    category: "Apparel",
    price: 0,
    description: "Comfortable denim jeans.",
    color: "Blue",
    material: "Denim",
    size: "32",
    image: "https://placehold.co/400x400?text=Jeans",
    stock: 12,
  },
];

// --------------------------------------------------
// PRODUCT STORAGE
// --------------------------------------------------

function readProducts() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (error) {
    console.error("Could not read products:", error.message);
  }

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(initialProducts, null, 2)
  );

  return initialProducts;
}

let products = readProducts();

function saveProducts() {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(products, null, 2)
  );
}

// --------------------------------------------------
// PERSISTENT RECOMMENDATION DECISIONS
// --------------------------------------------------

function readDecisions() {
  try {
    if (fs.existsSync(DECISIONS_FILE)) {
      const data = JSON.parse(
        fs.readFileSync(DECISIONS_FILE, "utf8")
      );

      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data)
      ) {
        return data;
      }
    }
  } catch (error) {
    console.error(
      "Could not read recommendation decisions:",
      error.message
    );
  }

  return {};
}

let recommendationDecisions = readDecisions();

function saveDecisions() {
  fs.writeFileSync(
    DECISIONS_FILE,
    JSON.stringify(recommendationDecisions, null, 2)
  );
}

function getDecisionKey(productId, field) {
  return `${Number(productId)}:${field}`;
}

// --------------------------------------------------
// PRODUCT VALIDATION
// --------------------------------------------------

function getIssues(product) {
  const issues = [];

  if (!product.sku?.trim()) {
    issues.push("Missing SKU");
  }

  if (!product.description?.trim()) {
    issues.push("Missing description");
  }

  if (!product.color?.trim()) {
    issues.push("Missing color");
  }

  if (!product.material?.trim()) {
    issues.push("Missing material");
  }

  if (
    !Number.isFinite(Number(product.price)) ||
    Number(product.price) <= 0
  ) {
    issues.push("Invalid price");
  }

  return issues;
}

function getScore(product) {
  return Math.round(
    ((5 - getIssues(product).length) / 5) * 100
  );
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "ProductPulse backend is running",
    storage: "Local JSON files",
  });
});

// --------------------------------------------------
// GET ALL PRODUCTS
// --------------------------------------------------

app.get("/api/products", (req, res) => {
  res.json({
    success: true,
    count: products.length,
    products,
  });
});

// --------------------------------------------------
// CREATE PRODUCT
// --------------------------------------------------

app.post("/api/products", (req, res) => {
  const { name, sku } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof sku !== "string" ||
    !sku.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Product name and SKU are required.",
    });
  }

  const duplicateSku = products.some(
    (product) =>
      product.sku.toLowerCase() === sku.trim().toLowerCase()
  );

  if (duplicateSku) {
    return res.status(409).json({
      success: false,
      message: "This SKU already exists.",
    });
  }

  const product = {
    id: products.length
      ? Math.max(...products.map((item) => Number(item.id))) + 1
      : 1,
    name: name.trim(),
    sku: sku.trim(),
    category: req.body.category || "Uncategorized",
    price: Number(req.body.price) || 0,
    description: req.body.description || "",
    color: req.body.color || "",
    material: req.body.material || "",
    size: req.body.size || "",
    image: req.body.image || "",
    stock: Number(req.body.stock) || 0,
  };

  products.push(product);
  saveProducts();

  res.status(201).json({
    success: true,
    product,
  });
});

// --------------------------------------------------
// UPDATE PRODUCT
// --------------------------------------------------

app.put("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);

  const index = products.findIndex(
    (product) => Number(product.id) === id
  );

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Product not found.",
    });
  }

  const { name, sku } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof sku !== "string" ||
    !sku.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Product name and SKU are required.",
    });
  }

  const duplicateSku = products.some(
    (product) =>
      Number(product.id) !== id &&
      product.sku.toLowerCase() === sku.trim().toLowerCase()
  );

  if (duplicateSku) {
    return res.status(409).json({
      success: false,
      message: "Another product already uses this SKU.",
    });
  }

  const price = Number(req.body.price);
  const stock = Number(req.body.stock ?? products[index].stock);

  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(stock) ||
    stock < 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Price and stock must be valid non-negative numbers.",
    });
  }

  products[index] = {
    ...products[index],
    ...req.body,
    id,
    name: name.trim(),
    sku: sku.trim(),
    price,
    stock,
  };

  saveProducts();

  res.json({
    success: true,
    message: "Product saved successfully.",
    product: products[index],
  });
});

// --------------------------------------------------
// RULE-BASED CATALOG AUDIT
// --------------------------------------------------

app.post("/api/agent/audit", (req, res) => {
  const findings = products.map((product) => ({
    ...product,
    issues: getIssues(product),
    score: getScore(product),
  }));

  res.json({
    success: true,
    agent: "ProductPulse Quality Agent",
    mode: "Rule-based audit",
    scanned: findings.length,
    issueCount: findings.reduce(
      (total, product) => total + product.issues.length,
      0
    ),
    needsAttention: findings.filter(
      (product) => product.issues.length > 0
    ).length,
    findings,
  });
});

// --------------------------------------------------
// LIVE GROK CATALOG ANALYSIS
// --------------------------------------------------

app.post("/api/agent/grok-audit", async (req, res) => {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      success: false,
      message: "Grok API key is missing. Check server/.env.",
    });
  }

  try {
    const catalog = products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      description: product.description,
      color: product.color,
      material: product.material,
      size: product.size,
      stock: product.stock,
      existingIssues: getIssues(product),
    }));

    const response = await fetch(
      "https://api.x.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.XAI_MODEL || "grok-4.7",
          messages: [
            {
              role: "system",
              content:
                "You are a product information management quality analyst. " +
                "Review catalog data, identify missing or suspicious attributes, " +
                "and recommend improvements. Never invent factual product details " +
                "such as price, material, color, or stock. Clearly mark details " +
                "that require human confirmation. Return concise, readable advice.",
            },
            {
              role: "user",
              content:
                "Analyze this product catalog. For each product, report its ID, " +
                "problems, recommended actions, and which details need human " +
                "confirmation. Summarize the most important fixes first. " +
                "Do not modify any data. Catalog:\n" +
                JSON.stringify(catalog),
            },
          ],
          temperature: 0.2,
          max_tokens: 1200,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "xAI API error:",
        response.status,
        JSON.stringify(data)
      );

      return res.status(502).json({
        success: false,
        status: response.status,
        message:
          data?.error?.message ||
          data?.message ||
          "Grok API request failed. Check the backend terminal.",
      });
    }

    const advice = data.choices?.[0]?.message?.content;

    if (!advice) {
      return res.status(502).json({
        success: false,
        message: "Grok returned an empty response.",
      });
    }

    res.json({
      success: true,
      agent: "ProductPulse AI Quality Agent",
      mode: "Grok AI analysis",
      scanned: products.length,
      recommendations: advice,
      appliedAutomatically: false,
    });
  } catch (error) {
    console.error("Grok request failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not reach Grok. Check your connection and try again.",
    });
  }
});

// --------------------------------------------------
// SAVE APPROVAL OR REJECTION
// --------------------------------------------------

app.post("/api/agent/decisions", (req, res) => {
  const { recommendationId, productId, field, status } = req.body;

  if (
    typeof recommendationId !== "string" ||
    !recommendationId.trim() ||
    !Number.isInteger(Number(productId)) ||
    !Number.isInteger(Number(productId)) ||
    typeof field !== "string" ||
    !["approved", "rejected"].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Recommendation ID, valid product ID, field, and valid status are required.",
    });
  }

  const product = products.find(
    (item) => Number(item.id) === Number(productId)
  );

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found.",
    });
  }

  // The frontend currently uses IDs such as description-2, price-4,
  // color-3, and material-3. Ensure the ID matches the supplied product/field.
  const expectedId = `${field}-${Number(productId)}`;

  if (recommendationId !== expectedId) {
    return res.status(400).json({
      success: false,
      message: "Recommendation ID does not match the product and field.",
    });
  }

  const key = getDecisionKey(productId, field);

  try {
    recommendationDecisions[key] = {
      recommendationId,
      productId: Number(productId),
      field,
      status,
      decidedAt: new Date().toISOString(),
    };

    saveDecisions();

    return res.json({
      success: true,
      message: `Recommendation ${status} and saved.`,
      decision: recommendationDecisions[key],
    });
  } catch (error) {
    console.error(
      "Could not save recommendation decision:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Could not persist the recommendation decision.",
    });
  }
});

// --------------------------------------------------
// VIEW DECISION HISTORY
// --------------------------------------------------

app.get("/api/agent/decisions", (req, res) => {
  res.json({
    success: true,
    count: Object.keys(recommendationDecisions).length,
    decisions: Object.values(recommendationDecisions).sort(
      (a, b) =>
        new Date(b.decidedAt).getTime() -
        new Date(a.decidedAt).getTime()
    ),
  });
});

// --------------------------------------------------
// RULE-BASED DEMO RECOMMENDATIONS
// --------------------------------------------------

app.get("/api/agent/demo-recommendations", (req, res) => {
  const recommendations = products.flatMap((product) => {
    const suggestions = [];

    if (!product.description?.trim()) {
      suggestions.push({
        id: `description-${product.id}`,
        productId: product.id,
        productName: product.name,
        field: "description",
        currentValue: product.description || "",
        suggestedValue:
          `${product.name} from our ${product.category || "general"} collection. ` +
          "Please review and add verified product details before publishing.",
        reason:
          "A product description helps customers understand the item.",
        status: "pending",
      });
    }

    if (
      !Number.isFinite(Number(product.price)) ||
      Number(product.price) <= 0
    ) {
      suggestions.push({
        id: `price-${product.id}`,
        productId: product.id,
        productName: product.name,
        field: "price",
        currentValue: String(product.price ?? ""),
        suggestedValue: "",
        reason:
          "The product has an invalid or missing price. Enter the verified price manually.",
        status: "manual_review",
      });
    }

    if (!product.color?.trim()) {
      suggestions.push({
        id: `color-${product.id}`,
        productId: product.id,
        productName: product.name,
        field: "color",
        currentValue: "",
        suggestedValue: "",
        reason:
          "Color is missing. Confirm the actual color before updating the catalog.",
        status: "manual_review",
      });
    }

    if (!product.material?.trim()) {
      suggestions.push({
        id: `material-${product.id}`,
        productId: product.id,
        productName: product.name,
        field: "material",
        currentValue: "",
        suggestedValue: "",
        reason:
          "Material is missing. Verify the product specifications before updating.",
        status: "manual_review",
      });
    }

    return suggestions;
  });

  // Hide previously rejected recommendations.
  // Approved recommendations will disappear naturally once the product
  // field has been corrected; otherwise keep them visible for review.
  const visibleRecommendations = recommendations
    .filter((item) => {
      const key = getDecisionKey(item.productId, item.field);
      const decision = recommendationDecisions[key];

      return !decision || decision.status !== "rejected";
    })
    .map((item) => {
      const key = getDecisionKey(item.productId, item.field);
      const decision = recommendationDecisions[key];

      return decision?.status === "approved"
        ? { ...item, status: "approved" }
        : item;
    });

  res.json({
    success: true,
    mode: "DEMO — rule-based suggestions, not AI-generated",
    appliedAutomatically: false,
    count: visibleRecommendations.length,
    recommendations: visibleRecommendations,
  });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(
    `ProductPulse backend running at http://localhost:${PORT}`
  );
});