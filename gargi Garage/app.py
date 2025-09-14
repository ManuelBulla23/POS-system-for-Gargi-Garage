from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import json, os

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return render_template("index.html") 

DATA_FILE = "garage_data.json"
db = {"parts": [], "customers": [], "sales": []}

def load_data():
    global db
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            db = json.load(f)

def save_data():
    with open(DATA_FILE, "w") as f:
        json.dump(db, f, indent=2)

# ---------- PARTS ----------
@app.route("/parts", methods=["GET", "POST"])
def parts():
    if request.method == "GET":
        return jsonify(db["parts"])
    elif request.method == "POST":
        new_part = request.json
        # ensure numbers
        new_part["purchasePrice"] = float(new_part.get("purchasePrice", 0))
        new_part["sellingPrice"] = float(new_part.get("sellingPrice", 0))
        new_part["availableStock"] = int(new_part.get("availableStock", 0))
        db["parts"].append(new_part)
        save_data()
        return jsonify({"status": "ok"}), 201
    
@app.route("/parts/<productId>", methods=["DELETE"])
def delete_part(productId):
    global db
    before = len(db["parts"])
    db["parts"] = [p for p in db["parts"] if p["productId"] != productId]
    if len(db["parts"]) == before:
        return jsonify({"error": "Part not found"}), 404
    save_data()
    return jsonify({"status": "ok"}), 200    

@app.route("/parts/<productId>/restock", methods=["PATCH"])
def restock_part(productId):
    data = request.json
    qty = int(data.get("quantity", 0))
    for part in db["parts"]:
        if part["productId"] == productId:
            part["availableStock"] += qty
            save_data()
            return jsonify({"status": "ok", "newStock": part["availableStock"]}), 200
    return jsonify({"error": "Part not found"}), 404

# ---------- CUSTOMERS ----------
@app.route("/customers", methods=["GET", "POST"])
def customers():
    if request.method == "GET":
        return jsonify(db["customers"])
    elif request.method == "POST":
        new_customer = request.json
        db["customers"].append(new_customer)
        save_data()
        return jsonify({"status": "ok"}), 201

# ---------- SALES ----------
@app.route("/sales", methods=["GET", "POST"])
def sales():
    if request.method == "GET":
        return jsonify(db["sales"])
    elif request.method == "POST":
        new_sale = request.json
        db["sales"].append(new_sale)

        # decrease stock
        for item in new_sale.get("items", []):
            for part in db["parts"]:
                if part["productId"] == item["productId"]:
                    part["availableStock"] = max(0, part["availableStock"] - int(item.get("quantity", 0)))

        save_data()
        return jsonify({"status": "ok"}), 201

# ---------- ANALYTICS ----------
@app.route("/analytics", methods=["GET"])
def analytics():
    total_parts_sold = 0
    total_profit = 0
    most_sold = {}

    for sale in db["sales"]:
        for item in sale.get("items", []):
            qty = int(item.get("quantity", 0))
            rate = float(item.get("rate", 0))
            total = float(item.get("total", rate * qty))
            total_parts_sold += qty

            part = next((p for p in db["parts"] if p["productId"] == item.get("productId")), None)
            if part:
                purchase_price = float(part.get("purchasePrice", 0))
                total_profit += (rate - purchase_price) * qty

            name = item.get("partName", "Unknown")
            if name not in most_sold:
                most_sold[name] = {"quantity": 0, "revenue": 0}
            most_sold[name]["quantity"] += qty
            most_sold[name]["revenue"] += total

    sorted_items = sorted(
        [{"name": n, **d} for n, d in most_sold.items()],
        key=lambda x: x["quantity"],
        reverse=True
    )

    return jsonify({
        "totalPartsSold": total_parts_sold,
        "totalProfit": total_profit,
        "mostSold": sorted_items
    })

if __name__ == "__main__":
    load_data()
    app.run(debug=True)