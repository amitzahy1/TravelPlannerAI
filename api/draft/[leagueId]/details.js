// Vercel Serverless Function - FPL Draft League Details API
// This function fetches draft league details from FPL Draft API

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

    const { leagueId } = req.query;

    if (!leagueId) {
        res.status(400).json({ error: 'League ID is required' });
        return;
    }

    try {
        console.log(`Fetching draft league details for league ${leagueId}...`);
        
        const response = await fetch(`https://draft.premierleague.com/api/league/${leagueId}/details`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Draft API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log(`✅ Successfully fetched league details for ${data.league?.name || leagueId}`);
        
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching draft league details:', error);
        res.status(500).json({ 
            error: 'Failed to fetch draft league details',
            message: error.message 
        });
    }
}

