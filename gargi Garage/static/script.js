// Data caches & API base
const API_BASE = "";
let partsDB = [];
let customersDB = [];
let salesDB = [];
let currentBillItems = [];
let currentCustomer = null;

// ---------- UTIL ----------
function showModal(title, message) {
  alert(`${title}: ${message}`);
}

function showTab(tabName, btn) {
  // Hide all tab contents
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => content.classList.remove('active'));

  // Remove active class from all buttons
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => button.classList.remove('active'));

  // Show selected tab content
  const target = document.getElementById(tabName);
  if (target) target.classList.add('active');

  // Add active class to clicked button
  if (btn) btn.classList.add('active');

  // Update data when switching tabs
  if (tabName === 'parts') {
    fetchParts();
  } else if (tabName === 'analytics') {
    fetchAnalytics();
  } else if (tabName === 'customers') {
    fetchCustomers();
  } else if (tabName === 'billing') {
    fetchParts(); // ensure parts list used in billing is fresh
    fetchCustomers();
  }
}

function escapeHtml(unsafe) {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function updateBillDate() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    document.getElementById('billDate').textContent = dateStr;
}

// ---------- PARTS ----------
async function fetchParts() {
  try {
    const res = await fetch(`${API_BASE}/parts`);
    if (!res.ok) throw new Error("Failed fetching parts");
    partsDB = await res.json();
    updatePartsTable();
    updatePartsDatalist();
  } catch (err) {
    console.error(err);
    showModal("Error", "Could not load parts from server.");
  }
}

async function addPart() {
  const productId = document.getElementById("productId").value.trim();
  const productName = document.getElementById("productName").value.trim();
  const purchasePrice = parseFloat(document.getElementById("purchasePrice").value);
  const sellingPrice = parseFloat(document.getElementById("sellingPrice").value);
  const availableStock = parseInt(document.getElementById("availableStock").value);

  if (!productId || !productName || isNaN(purchasePrice) || isNaN(sellingPrice) || isNaN(availableStock)) {
    showModal("Error", "Please fill in all fields correctly.");
    return;
  }

  await fetch(`${API_BASE}/parts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, productName, purchasePrice, sellingPrice, availableStock })
  });

  document.getElementById("partsForm").reset();
  fetchParts();
  showModal("Success", "Part added successfully");
}

async function restockPart(productId, quantity) {
  try {
    const res = await fetch(`${API_BASE}/parts/${productId}/restock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity })
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();

    showModal("Success", `Restocked! New stock: ${data.newStock}`);
    fetchParts();
  } catch (err) {
    console.error(err);
    showModal("Error", "Failed to restock part.");
  }
}

async function deletePart(productId) {
  if (!confirm("Are you sure you want to delete this part?")) return;

  try {
    const res = await fetch(`${API_BASE}/parts/${productId}`, {
      method: "DELETE"
    });

    if (!res.ok) throw new Error(await res.text());
    showModal("Success", "Part deleted successfully");
    fetchParts();
  } catch (err) {
    console.error(err);
    showModal("Error", "Failed to delete part.");
  }
}

function updatePartsTable() {
  const table = document.getElementById("partsTableBody");
  console.log("Updating parts table...");
  table.innerHTML = "";

  if (!partsDB || partsDB.length === 0) {
    table.innerHTML = `<tr><td colspan="6" class="px-4 py-3 text-center text-gray-500">No parts available</td></tr>`;
    return;
  }

  partsDB.forEach(p => {
    table.innerHTML += `
      <tr>
        <td class="px-4 py-3">${escapeHtml(p.productId)}</td>
        <td class="px-4 py-3">${escapeHtml(p.productName)}</td>
        <td class="px-4 py-3">₹${Number(p.purchasePrice).toFixed(2)}</td>
        <td class="px-4 py-3">₹${Number(p.sellingPrice).toFixed(2)}</td>
        <td class="px-4 py-3">${p.availableStock}</td>
        <td class="px-4 py-3">
          <button onclick="restockPart('${escapeHtml(p.productId)}', 5)" 
              class="bg-green-600 text-white px-2 py-1 rounded mr-2 hover:bg-green-700">
              Restock +5
          </button>
          <button onclick="deletePart('${escapeHtml(p.productId)}')" 
              class="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">
              Delete
          </button>
        </td>
      </tr>`;
  });
}

function updatePartsDatalist() {
    const datalist = document.getElementById('partsList');
    datalist.innerHTML = '';
    (partsDB || []).forEach(part => {
        const option = document.createElement('option');
        option.value = part.productName;
        option.setAttribute('data-price', part.sellingPrice);
        option.setAttribute('data-id', part.productId);
        datalist.appendChild(option);
    });
}

// ---------- CUSTOMERS ----------
async function fetchCustomers() {
  const res = await fetch(`${API_BASE}/customers`);
  const customers = await res.json();
  customersDB = customers;
  const list = document.getElementById("customersList");
  if (list) {
    list.innerHTML = "";
    customers.forEach(c => {
      list.innerHTML += `<li class="border-b p-2">${escapeHtml(c.plateNumber)} - ${escapeHtml(c.name)} (${escapeHtml(c.vehicleModel)})</li>`;
    });
  }
}

async function addCustomer() {
  const plateNumber = document.getElementById("plateNumber").value.trim();
  const name = document.getElementById("customerName").value.trim();
  const mobile = document.getElementById("mobileNumber").value.trim();
  const vehicleModel = document.getElementById("vehicleModel").value.trim();

  if (!plateNumber || !name || !mobile || !vehicleModel) {
    showModal("Error", "Please fill all customer fields.");
    return;
  }

  await fetch(`${API_BASE}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plateNumber, name, mobile, vehicleModel })
  });

  document.getElementById("customerForm").reset();
  fetchCustomers();
  showModal("Success", "Customer added successfully");
}

async function searchBillingCustomer() {
    const plateNumber = document.getElementById('billingCustomerSearch').value.trim();
    if (!plateNumber) {
        showModal('Error', 'Please enter a plate number');
        return;
    }

    await fetchCustomers();

    const customer = (customersDB || []).find(c => c.plateNumber.toLowerCase() === plateNumber.toLowerCase());
    const detailsDiv = document.getElementById('billingCustomerDetails');
    const infoDiv = document.getElementById('billingCustomerInfo');

    if (customer) {
        currentCustomer = customer;
        infoDiv.innerHTML = `
            <p><strong>Name:</strong> ${escapeHtml(customer.name)}</p>
            <p><strong>Mobile:</strong> ${escapeHtml(customer.mobile)}</p>
            <p><strong>Vehicle:</strong> ${escapeHtml(customer.vehicleModel)}</p>
            <p><strong>Plate:</strong> ${escapeHtml(customer.plateNumber)}</p>
        `;
        detailsDiv.style.display = 'block';
    } else {
        showModal('Not Found', 'Customer not found');
        detailsDiv.style.display = 'none';
        currentCustomer = null;
    }
}

// ---------- SALES ----------
async function fetchSales() {
  const res = await fetch(`${API_BASE}/sales`);
  const sales = await res.json();
  salesDB = sales;
}

// ---------- ANALYTICS ----------
async function fetchAnalytics() {
    try {
        const res = await fetch(`${API_BASE}/analytics`);
        if (!res.ok) throw new Error('Failed fetching analytics');
        const analytics = await res.json();
        
        document.getElementById('totalPartsSold').textContent = analytics.totalPartsSold ?? 0;
        document.getElementById('totalProfit').textContent = `₹${(analytics.totalProfit ?? 0).toFixed(2)}`;

        const tbody = document.getElementById('mostSoldItemsTable');
        tbody.innerHTML = '';
        if (!analytics.mostSold || analytics.mostSold.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">No sales data available</td></tr>';
        } else {
            analytics.mostSold.forEach((item, idx) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${idx + 1}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${escapeHtml(item.name)}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.quantity}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">₹${Number(item.revenue).toFixed(2)}</td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (err) {
        console.error(err);
        showModal('Error', 'Could not load analytics from server.');
    }
}

// ---------- BILLING ----------
function updatePartPrice() {
    const partName = document.getElementById('partName').value;
    const part = (partsDB || []).find(p => p.productName === partName);
    if (part) {
        document.getElementById('rate').value = part.sellingPrice;
    } else {
        document.getElementById('rate').value = '';
    }
}

function addBillItem() {
    const partName = document.getElementById('partName').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const rate = parseFloat(document.getElementById('rate').value);

    if (!partName || isNaN(quantity) || isNaN(rate) || quantity <= 0) {
        showModal('Error', 'Please fill in all fields correctly');
        return;
    }

    const part = (partsDB || []).find(p => p.productName === partName);
    if (!part) {
        showModal('Error', 'Part not found in database');
        return;
    }

    if (part.availableStock < quantity) {
        showModal('Error', 'Insufficient stock available');
        return;
    }

    const total = rate * quantity;
    const item = {
        partName,
        quantity,
        rate,
        total,
        productId: part.productId
    };

    currentBillItems.push(item);
    updateBillPreview();

    document.getElementById('partName').value = '';
    document.getElementById('quantity').value = '';
    document.getElementById('rate').value = '';
}

function addLabourCharge() {
    const labourCharge = parseFloat(document.getElementById('labourCharge').value);
    if (isNaN(labourCharge) || labourCharge <= 0) {
        showModal('Error', 'Please enter a valid labour charge');
        return;
    }

    const item = {
        partName: 'Labour Charge',
        quantity: 1,
        rate: labourCharge,
        total: labourCharge,
        productId: 'LABOUR'
    };

    currentBillItems.push(item);
    updateBillPreview();

    document.getElementById('labourCharge').value = '';
}

function updateBillPreview() {
    const billItemsDiv = document.getElementById('billItems');
    const totalAmountDiv = document.getElementById('totalAmount');
    let html = '';

    if (currentCustomer) {
        html += `
            <div class="mb-4 pb-2 border-b">
                <p><strong>Customer:</strong> ${escapeHtml(currentCustomer.name)}</p>
                <p><strong>Mobile:</strong> ${escapeHtml(currentCustomer.mobile)}</p>
                <p><strong>Vehicle:</strong> ${escapeHtml(currentCustomer.vehicleModel)} (${escapeHtml(currentCustomer.plateNumber)})</p>
            </div>
        `;
    }

    html += '<div class="mb-2"><strong>Items:</strong></div>';
    let total = 0;
    currentBillItems.forEach(item => {
        html += `
            <div class="flex justify-between mb-1">
                <span>${escapeHtml(item.partName)} x ${item.quantity} @ ₹${item.rate}</span>
                <span>₹${item.total.toFixed(2)}</span>
            </div>
        `;
        total += item.total;
    });

    billItemsDiv.innerHTML = html;
    totalAmountDiv.textContent = `₹${total.toFixed(2)}`;
}

function printBillOnly() {
    if (!currentCustomer) {
        showModal('Error', 'Please select a customer first');
        return;
    }
    if (currentBillItems.length === 0) {
        showModal('Error', 'Please add at least one item to the bill');
        return;
    }
    window.print();
}

async function printAndUpdateBill() {
    if (!currentCustomer) {
        showModal('Error', 'Please select a customer first');
        return;
    }
    if (currentBillItems.length === 0) {
        showModal('Error', 'Please add at least one item to the bill');
        return;
    }

    const salePayload = {
        customerPlate: currentCustomer.plateNumber,
        customerName: currentCustomer.name,
        items: currentBillItems.filter(it => it.productId !== 'LABOUR'),
        labour: currentBillItems.find(it => it.productId === 'LABOUR')?.total || 0,
        totalAmount: currentBillItems.reduce((s, i) => s + i.total, 0),
        date: new Date().toISOString()
    };

    try {
        const res = await fetch(`${API_BASE}/sales`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(salePayload)
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Failed to record sale');
        }

        await Promise.all([fetchParts(), fetchCustomers(), fetchSales(), fetchAnalytics()]);

        window.print();

        currentBillItems = [];
        currentCustomer = null;
        document.getElementById('billingCustomerSearch').value = '';
        document.getElementById('billingCustomerDetails').style.display = 'none';
        updateBillPreview();
        showModal('Success', 'Bill printed and data updated successfully');
    } catch (err) {
        console.error(err);
        showModal('Error', 'Failed to save sale. (See console.)');
    }
}

// ---------- Backup & Restore ----------
async function exportData() {
    try {
        const res = await fetch(`${API_BASE}/export`);
        if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'gargiGarageBackup.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            showModal('Success', 'Exported backup from server.');
            return;
        }
    } catch (err) {
        // ignore - fallback to client-built
    }

    const data = { partsDB, customersDB, salesDB };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gargiGarageBackup.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showModal('Success', 'Exported backup (client-side).');
}

async function importData(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) {
        showModal('Error', 'No file selected');
        return;
    }
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            try {
                const res = await fetch(`${API_BASE}/import`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(imported)
                });
                if (res.ok) {
                    await Promise.all([fetchParts(), fetchCustomers(), fetchSales(), fetchAnalytics()]);
                    showModal('Success', 'Imported data to server.');
                    return;
                }
            } catch (err) { }
            if (Array.isArray(imported.partsDB)) {
                for (const p of imported.partsDB) {
                    try {
                        await fetch(`${API_BASE}/parts`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(p)
                        });
                    } catch (err) { }
                }
            }
            if (Array.isArray(imported.customersDB)) {
                for (const c of imported.customersDB) {
                    try {
                        await fetch(`${API_BASE}/customers`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(c)
                        });
                    } catch (err) { }
                }
            }
            if (Array.isArray(imported.salesDB)) {
                for (const s of imported.salesDB) {
                    try {
                        await fetch(`${API_BASE}/sales`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(s)
                        });
                    } catch (err) { }
                }
            }
            await Promise.all([fetchParts(), fetchCustomers(), fetchSales(), fetchAnalytics()]);
            showModal('Success', 'Imported data (client->server best-effort).');
        } catch (err) {
            console.error(err);
            showModal('Error', 'Invalid JSON file');
        } finally {
            const input = document.getElementById('importFile');
            if (input) input.value = '';
        }
    };
    reader.readAsText(file);
}

// ---------- INIT: Event Listeners ----------
document.addEventListener('DOMContentLoaded', function() {
  // Initial data fetches and UI updates on page load
  fetchParts();
  fetchCustomers();
  fetchSales();
  fetchAnalytics();
  updateBillDate();

  // Add event listeners for tab navigation
  document.getElementById('tabPartsBtn').addEventListener('click', function() {
    showTab('parts', this);
  });
  document.getElementById('tabCustomersBtn').addEventListener('click', function() {
    showTab('customers', this);
  });
  document.getElementById('tabBillingBtn').addEventListener('click', function() {
    showTab('billing', this);
  });
  document.getElementById('tabAnalyticsBtn').addEventListener('click', function() {
    showTab('analytics', this);
  });
});