import axios from "axios";


const API_BASE = "http://localhost:5000/api";


const testAPI = async () => {
  try {
    // 1. Register user
    const registerRes = await axios.post(`${API_BASE}/auth/register`, {
      email: `testuser${Date.now()}@example.com`,
      password: "Password123!",
      role: "admin",
      firstname: "Test",
      lastname: "User",
    });
    console.log("Register:", registerRes.data);

    // 2. Login
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: registerRes.data.email,
      password: "Password123!",
    });
    console.log("Login:", loginRes.data);

    const token = loginRes.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 3. Create a client
    const clientRes = await axios.post(
      `${API_BASE}/clients`,
      {
        firstname: "Olive",
        lastname: "Farmer",
        phone: "123456789",
        address: "Olive Street 1",
      },
      { headers: authHeaders }
    );
    console.log("Create Client:", clientRes.data);

    const clientId = clientRes.data.id;

    // 4. Create a batch
    const batchRes = await axios.post(
      `${API_BASE}/batches`,
      {
        clientId,
        weight_in: 1000,
        weight_out: 900,
        net_weight: 900,
        number_of_boxes: 50,
      },
      { headers: authHeaders }
    );
    console.log("Create Batch:", batchRes.data);

    const batchId = batchRes.data.id;

    // 5. Create processing decision
    const processingRes = await axios.post(
      `${API_BASE}/processing-decisions`,
      {
        batchId,
        type: "standard",
        unit_price: 10,
      },
      { headers: authHeaders }
    );
    console.log("Processing Decision:", processingRes.data);

    // 6. Start pressing session
    const pressingRes = await axios.post(
      `${API_BASE}/pressing-sessions`,
      {
        pressing_roomID: 1,
        number_of_boxes: 50,
      },
      { headers: authHeaders }
    );
    console.log("Pressing Session:", pressingRes.data);

    const pressingSessionId = pressingRes.data.id;

    // 7. Create oil batch
    const oilBatchRes = await axios.post(
      `${API_BASE}/oil-batches`,
      {
        weight: 850,
        residue: 50,
        batchId,
        pressing_sessionId: pressingSessionId,
      },
      { headers: authHeaders }
    );
    console.log("Oil Batch:", oilBatchRes.data);

    const oilBatchId = oilBatchRes.data.id;

    // 8. Create quality test
    const qualityRes = await axios.post(
      `${API_BASE}/quality-tests`,
      {
        oil_batchId: oilBatchId,
        acidity_level: 0.2,
        grade: "extra_virgin",
        tested_by_employeeId: loginRes.data.user.id,
      },
      { headers: authHeaders }
    );
    console.log("Quality Test:", qualityRes.data);

    // 9. Create employee
    const employeeRes = await axios.post(
      `${API_BASE}/employees`,
      {
        firstname: "Worker",
        lastname: "One",
        role: "employee",
        hire_date: "2025-01-01",
        phone: "987654321",
      },
      { headers: authHeaders }
    );
    console.log("Employee:", employeeRes.data);

    // 10. Create price entry
    const priceRes = await axios.post(
      `${API_BASE}/prices`,
      {
        date: new Date().toISOString().split("T")[0],
        milling_price_per_kg: 2,
        oil_client_selling_price_per_kg: 5,
        oil_export_selling_price_per_kg: 6,
        olive_buying_price_per_kg: 1,
      },
      { headers: authHeaders }
    );
    console.log("Price Entry:", priceRes.data);

    // 11. Create invoice
    const invoiceRes = await axios.post(
      `${API_BASE}/invoices`,
      {
        clientId,
        batchId,
        processing_decisionId: processingRes.data.id,
        amount: 1000,
        due_date: new Date().toISOString().split("T")[0],
        notes: "Test invoice",
      },
      { headers: authHeaders }
    );
    console.log("Invoice:", invoiceRes.data);

    const invoiceId = invoiceRes.data.id;

    // 12. Record payment
    const paymentRes = await axios.post(
      `${API_BASE}/payments`,
      {
        invoiceId,
        amount: 1000,
        payment_method: "cash",
        reference: "PAY123",
      },
      { headers: authHeaders }
    );
    console.log("Payment:", paymentRes.data);

    console.log("✅ All POST endpoints tested successfully!");
  } catch (error) {
    console.error("Error testing API:", error.response?.data || error.message);
  }
};

testAPI();
