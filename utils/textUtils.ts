/**
 * Helper to remove Hebrew and special chars for Maps URL
 * Keeps only English letters, numbers, and spaces
 */
export const cleanTextForMap = (text: string) => {
        if (!text) return "";
        return text.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim();
};
