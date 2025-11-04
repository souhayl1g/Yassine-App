const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read config from the backend config.json
const configPath = path.join(__dirname, 'yassine_olive_mill_backend-fedi/yassine_olive_mill_backend-fedi/config/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const dbConfig = config.development;

// Database connection
const client = new Client({
  host: dbConfig.host,
  port: 5432,
  database: dbConfig.database,
  user: dbConfig.username,
  password: dbConfig.password,
});

// Function to generate random data for tickets
function generateRandomTicketData(index) {
  const weights = [
    { weightIn: 150.5, weightOut: 20.2 },
    { weightIn: 200.0, weightOut: 25.5 },
    { weightIn: 175.8, weightOut: 22.1 },
    { weightIn: 300.2, weightOut: 35.0 },
    { weightIn: 125.7, weightOut: 18.3 },
    { weightIn: 250.4, weightOut: 28.8 },
    { weightIn: 180.6, weightOut: 24.2 },
    { weightIn: 220.3, weightOut: 26.7 },
    { weightIn: 195.9, weightOut: 23.4 },
    { weightIn: 165.2, weightOut: 21.8 }
  ];
  
  const randomWeight = weights[index % weights.length];
  const weightIn = randomWeight.weightIn;
  const weightOut = randomWeight.weightOut;
  const netWeight = weightIn - weightOut;
  const numberOfBoxes = Math.floor(Math.random() * 15) + 5; // 5-20 boxes
  const unitPrice = Math.random() * 2 + 3; // 3-5 dinars per kg
  const totalAmount = netWeight * unitPrice;
  
  // Generate dates spread over the last 30 days
  const daysAgo = Math.floor(Math.random() * 30);
  const hoursAgo = Math.floor(Math.random() * 24);
  const minutesAgo = Math.floor(Math.random() * 60);
  const dateReceived = new Date();
  dateReceived.setDate(dateReceived.getDate() - daysAgo);
  dateReceived.setHours(dateReceived.getHours() - hoursAgo);
  dateReceived.setMinutes(dateReceived.getMinutes() - minutesAgo);
  
  // Random status
  const statuses = ['received', 'in_process', 'completed'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  
  // Random payment status
  const isPaid = Math.random() > 0.4; // 60% chance of being paid
  const paymentMethods = ['cash', 'card']; // Only these are allowed by database constraint
  const paymentMethod = isPaid ? paymentMethods[Math.floor(Math.random() * paymentMethods.length)] : null;
  
  // Payment date (if paid)
  let datePaid = null;
  if (isPaid) {
    datePaid = new Date(dateReceived);
    datePaid.setHours(datePaid.getHours() + Math.floor(Math.random() * 48)); // Paid within 48 hours
  }
  
  return {
    clientId: 5, // Use client ID 5 as requested
    weightIn: Math.round(weightIn), // Convert to integer (grams)
    weightOut: Math.round(weightOut), // Convert to integer (grams)
    netWeight: Math.round(netWeight), // Convert to integer (grams)
    numberOfBoxes: numberOfBoxes,
    unitPrice: parseFloat(unitPrice.toFixed(2)), // Keep as decimal
    totalAmount: parseFloat(totalAmount.toFixed(2)), // Keep as decimal
    isPaid: isPaid,
    paymentMethod: paymentMethod,
    paymentReference: isPaid ? `REF${Date.now()}${index}` : null,
    status: status,
    dateReceived: dateReceived.toISOString(),
    datePaid: datePaid ? datePaid.toISOString() : null,
    createdAt: dateReceived.toISOString(),
    updatedAt: dateReceived.toISOString()
  };
}

async function addTestTickets() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');
    
    // Check if client ID 5 exists
    const clientCheck = await client.query('SELECT id FROM clients WHERE id = $1', [5]);
    if (clientCheck.rows.length === 0) {
      console.log('Client ID 5 not found. Creating a test client...');
      await client.query(`
        INSERT INTO clients (id, firstname, lastname, email, phone, "createdAt", "updatedAt")
        VALUES (5, 'أحمد', 'المزارع', 'ahmed.farmer@example.com', '+216 123 456 789', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('Test client created.');
    }
    
    console.log('Adding 50 test tickets...');
    
    for (let i = 0; i < 50; i++) {
      const ticketData = generateRandomTicketData(i);
      
      const query = `
        INSERT INTO batches (
          "clientId", 
          weight_in, 
          weight_out, 
          net_weight, 
          number_of_boxes, 
          unit_price, 
          total_amount, 
          is_paid, 
          payment_method, 
          payment_reference, 
          status, 
          date_received, 
          date_paid, 
          "createdAt", 
          "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `;
      
      const values = [
        ticketData.clientId,
        ticketData.weightIn,
        ticketData.weightOut,
        ticketData.netWeight,
        ticketData.numberOfBoxes,
        ticketData.unitPrice,
        ticketData.totalAmount,
        ticketData.isPaid,
        ticketData.paymentMethod,
        ticketData.paymentReference,
        ticketData.status,
        ticketData.dateReceived,
        ticketData.datePaid,
        ticketData.createdAt,
        ticketData.updatedAt
      ];
      
      await client.query(query, values);
      
      if ((i + 1) % 10 === 0) {
        console.log(`Added ${i + 1} tickets...`);
      }
    }
    
    console.log('✅ Successfully added 50 test tickets!');
    
    // Show summary
    const summary = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(CASE WHEN is_paid THEN 1 ELSE 0 END) as paid_count
      FROM batches 
      WHERE "clientId" = 5
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('\n📊 Summary of added tickets:');
    summary.rows.forEach(row => {
      console.log(`${row.status}: ${row.count} tickets (${row.paid_count} paid)`);
    });
    
    const totalSummary = await client.query(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(total_amount) as total_amount,
        SUM(CASE WHEN is_paid THEN total_amount ELSE 0 END) as paid_amount
      FROM batches 
      WHERE "clientId" = 5
    `);
    
    const totals = totalSummary.rows[0];
    console.log(`\nTotal tickets for client 5: ${totals.total_tickets}`);
    console.log(`Total amount: ${parseFloat(totals.total_amount).toFixed(2)} TND`);
    console.log(`Paid amount: ${parseFloat(totals.paid_amount).toFixed(2)} TND`);
    
  } catch (error) {
    console.error('❌ Error adding test tickets:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

// Run the script
addTestTickets();
