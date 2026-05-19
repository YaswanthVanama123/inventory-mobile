/**
 * API Configuration
 * Update the IP address here to reflect changes across all services
 */

// Your local machine IP address
// For iOS Simulator, you can use 'localhost' or your machine's local IP
const LOCAL_IP = 'localhost';

// API Port - inventory-server runs on 5001
const API_PORT = '5001';

// API Base URL
// export const API_BASE_URL = `http://${LOCAL_IP}:${API_PORT}/api`;
export const API_BASE_URL = `https://backend.inventory.enviromasternva.com/api`;

// Export individual parts if needed
export const LOCAL_HOST = LOCAL_IP;
export const PORT = API_PORT;
