// Configure your deployed Google Apps Script Web App URL via a Vite env variable.
// Create a `.env` file (see `.env.example`) with:
//   VITE_SHEETS_API_URL=https://script.google.com/macros/s/XXXX/exec
// If unset, the app falls back to mock data (see SHEETS_SETUP.md).
const API_URL = import.meta.env.VITE_SHEETS_API_URL || 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

export const sheetsService = {
    /**
     * Fetch pending rows (items without Status)
     * @returns {Promise<Array>} Array of pending items
     */
    async fetchRows() {
        if (API_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_URL_HERE')) {
            console.warn("⚠️ Google Apps Script URL not set. Using mock data.");
            console.warn("📖 Please follow SHEETS_SETUP.md to deploy your Apps Script and get the URL.");
            return this.mockFetch();
        }

        try {
            // Fetch pending items (Status is empty)
            const response = await fetch(API_URL);
            const json = await response.json();

            if (json.error) {
                console.error("API Error:", json.error);
                return [];
            }

            if (!json.data || !Array.isArray(json.data)) {
                console.error("Invalid response format:", json);
                return [];
            }

            return json.data;
        } catch (error) {
            console.error("Failed to fetch rows:", error);
            return [];
        }
    },

    /**
     * Fetch history (items with Status)
     * @returns {Promise<Array>} Array of processed items
     */
    async fetchHistory() {
        if (API_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_URL_HERE')) {
            console.warn("⚠️ Google Apps Script URL not set.");
            return [];
        }

        try {
            // Fetch processed items (Status is NOT empty)
            const response = await fetch(`${API_URL}?history=true`);
            const json = await response.json();

            if (json.error) {
                console.error("API Error:", json.error);
                return [];
            }

            if (!json.data || !Array.isArray(json.data)) {
                console.error("Invalid response format:", json);
                return [];
            }

            return json.data;
        } catch (error) {
            console.error("Failed to fetch history:", error);
            return [];
        }
    },

    /**
     * Update row status with user attribution and optional comment
     * @param {string|number} id - Row ID
     * @param {string} status - "Approved" or "Rejected"
     * @param {Object} user - User object with name property
     * @param {string} comment - Optional comment
     * @returns {Promise<void>}
     */
    async updateRowStatus(id, status, user, comment = '') {
        if (API_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_URL_HERE')) {
            console.log("Mock update:", { id, status, user: user.name, comment });
            return;
        }

        try {
            // Use GET request with query parameters to avoid CORS preflight issues
            const params = new URLSearchParams({
                action: 'update',
                id: id.toString(),
                status: status,
                userName: user.name,
                comment: comment || ''
            });

            const url = `${API_URL}?${params.toString()}`;
            console.log("🔄 Updating status with URL:", url);

            const response = await fetch(url);
            const result = await response.json();

            console.log("📥 Response from server:", result);

            if (result.error) {
                console.error("Update Error:", result.error);
                throw new Error(result.error);
            }

            if (result.success) {
                console.log("✅ Status updated successfully:", result.status);
            } else {
                console.warn("⚠️ Unexpected response format:", result);
            }
        } catch (error) {
            console.error("Failed to update status:", error);
            throw error;
        }
    },

    /**
     * Mock data for testing when Apps Script URL is not configured
     * @returns {Promise<Array>} Array of mock items
     */
    async mockFetch() {
        return [
            {
                id: 1,
                title: "LinkedIn Post #1",
                content: "Excited to announce our new product launch! #tech #startup",
                timestamp: "2023-10-27",
                status: "",
                comments: ""
            },
            {
                id: 2,
                title: "Weekly Update",
                content: "Here are the key metrics for this week. Growth is up 20%!",
                timestamp: "2023-10-28",
                status: "",
                comments: ""
            },
            {
                id: 3,
                title: "Team Spotlight",
                content: "Meet Sarah, our lead designer who crafted this amazing UI.",
                timestamp: "2023-10-29",
                status: "",
                comments: ""
            }
        ];
    }
};

