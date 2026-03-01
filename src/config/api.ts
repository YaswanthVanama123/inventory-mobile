/**
 * API Configuration
 * Update the IP address here to reflect changes across all services
 */

// Your local machine IP address
const LOCAL_IP = '192.168.55.103';

// API Port
const API_PORT = '5001';

// API Base URL
export const API_BASE_URL = `http://${LOCAL_IP}:${API_PORT}/api`;

// Export individual parts if needed
export const LOCAL_HOST = LOCAL_IP;
export const PORT = API_PORT;
