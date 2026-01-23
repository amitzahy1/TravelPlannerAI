// Vercel Serverless Function - FPL Draft Entry Picks API
// This function fetches draft entry picks from FPL Draft API

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { entryId } = req.query;

    if (!entryId) {
        res.status(400).json({ error: 'Entry ID is required' });
        return;
    }

    try {
        console.log(`Fetching draft entry picks for entry ${entryId}...`);
        
        // First, get the public data to find the current event
        const publicResponse = await fetch(`https://draft.premierleague.com/api/entry/${entryId}/public`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!publicResponse.ok) {
            throw new Error(`Draft API returned ${publicResponse.status}: ${publicResponse.statusText}`);
        }

        const publicData = await publicResponse.json();
        const currentEvent = publicData.entry?.current_event || 1;
        
        console.log(`Current event for entry ${entryId}: ${currentEvent}`);
        
        // Now fetch the picks for the current event
        const response = await fetch(`https://draft.premierleague.com/api/entry/${entryId}/event/${currentEvent}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Draft API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log(`✅ Successfully fetched entry picks for ${data.entry?.player_first_name || entryId}`);
        
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching draft entry picks:', error);
        res.status(500).json({ 
            error: 'Failed to fetch draft entry picks',
            message: error.message 
        });
    }
}

