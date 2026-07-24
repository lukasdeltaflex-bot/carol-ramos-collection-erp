try {
  const route = require("./src/app/api/marketplaces/shopee/auth/route.ts");
  console.log("Imported route successfully");
} catch (e) {
  console.error("Error importing route:", e.message);
  console.error(e.stack);
}
