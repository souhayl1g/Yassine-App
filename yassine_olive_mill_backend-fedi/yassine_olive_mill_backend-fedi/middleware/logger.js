const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`[${timestamp}] ${method} ${url} - ${ip}`);
  
  // Log request body for POST/PUT requests (excluding sensitive data)
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const body = { ...req.body };
    // Remove sensitive fields
    delete body.password;
    delete body.token;
    
    if (Object.keys(body).length > 0) {
      console.log(`[${timestamp}] Request body:`, JSON.stringify(body, null, 2));
    }
  }
  
  next();
};

export default logger;
