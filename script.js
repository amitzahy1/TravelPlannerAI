// ============================================
// AUTHENTICATION & USER MANAGEMENT
// ============================================

const auth = {
    user: null,
    isDemo: false,
    googleClientId: 'YOUR_GOOGLE_CLIENT_ID', // Replace with your actual Google Client ID
    allowedEmail: 'amitzahy1@gmail.com', // Only this email can access real data
    
    init() {
        // Check if user is already logged in (from localStorage)
        const savedUser = localStorage.getItem('fpl_user');
        if (savedUser) {
            this.user = JSON.parse(savedUser);
            // Check if user is authorized
            if (this.user.email === this.allowedEmail) {
                this.showApp();
            } else {
                // Unauthorized user - force demo mode
                this.user.name = this.user.name || 'משתמש';
                this.isDemo = true;
                this.showApp();
            }
        } else {
            this.showLoginScreen();
        }
    },
    
    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        
        // Setup Google Sign-In button
        document.getElementById('googleSignInBtn').addEventListener('click', () => {
            this.googleSignIn();
        });
        
        // Setup Demo Mode button
        document.getElementById('demoModeBtn').addEventListener('click', () => {
            this.enterDemoMode();
        });
    },
    
    showApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        // Show user info
        if (this.user) {
            const userInfo = document.getElementById('userInfo');
            userInfo.style.display = 'flex';
            
            // Set user photo or create initial circle
            const userPhoto = document.getElementById('userPhoto');
            if (this.user.picture && this.user.picture !== 'https://via.placeholder.com/40') {
                userPhoto.src = this.user.picture;
                userPhoto.style.display = 'block';
                userPhoto.onerror = () => {
                    // If image fails to load, hide it and show initial
                    userPhoto.style.display = 'none';
                    this.createUserInitial(this.user.name);
                };
            } else {
                userPhoto.style.display = 'none';
                this.createUserInitial(this.user.name);
            }
            
            document.getElementById('userName').textContent = this.user.name;
            // Show appropriate mode badge
            if (this.isDemo && this.user.email === 'demo@fpl.com') {
                document.getElementById('userMode').textContent = '🎭 מצב דמו';
            } else if (this.isDemo) {
                document.getElementById('userMode').textContent = '👁️ תצוגה בלבד';
            } else {
                document.getElementById('userMode').textContent = '✅ גישה מלאה';
            }
            
            // Setup logout button
            document.getElementById('logoutBtn').addEventListener('click', () => {
                this.logout();
            });
        }
        
        // Load data based on mode
        if (this.isDemo) {
            // Demo mode: show fabricated data with real player names
            loadDemoData();
        } else {
            // Full access: show real data
            init();
        }
    },
    
    createUserInitial(name) {
        // Remove existing initial if any
        const existingInitial = document.querySelector('.user-initial');
        if (existingInitial) existingInitial.remove();
        
        // Create initial circle
        const initial = document.createElement('div');
        initial.className = 'user-initial';
        initial.textContent = name.charAt(0).toUpperCase();
        
        // Insert before user details
        const userInfo = document.getElementById('userInfo');
        const userDetails = userInfo.querySelector('.user-details');
        userInfo.insertBefore(initial, userDetails);
    },
    
    googleSignIn() {
        // For demo purposes, simulate Google Sign-In
        // In production, use Google Identity Services
        showToast('התחברות', 'מתחבר עם Google...', 'info', 2000);
        
        setTimeout(() => {
            // Simulate Google Sign-In response
            // In production, this will come from Google Identity Services
            const googleUser = {
                name: 'Amit Zahy',
                email: 'amitzahy1@gmail.com', // Change this to test different users
                picture: 'https://via.placeholder.com/40'
            };
            
            this.user = googleUser;
            
            // Check if user is authorized for real data
            if (this.user.email === this.allowedEmail) {
                this.isDemo = false;
                localStorage.setItem('fpl_user', JSON.stringify(this.user));
                showToast('הצלחה!', `ברוך הבא ${this.user.name}! גישה מלאה לנתונים אמיתיים`, 'success', 3000);
            } else {
                this.isDemo = true;
                localStorage.setItem('fpl_user', JSON.stringify(this.user));
                showToast('גישה מוגבלת', `שלום ${this.user.name}! תוצג תצוגה עם שמות אמיתיים ונתונים מפוברקים`, 'warning', 4000);
            }
            
            this.showApp();
        }, 1500);
    },
    
    enterDemoMode() {
        this.user = {
            name: 'משתמש דמו',
            email: 'demo@fpl.com',
            picture: 'https://via.placeholder.com/40'
        };
        this.isDemo = true;
        showToast('מצב דמו', 'נכנסת למצב דמו - שמות אמיתיים, נתונים מפוברקים', 'info', 3000);
        this.showApp();
    },
    
    logout() {
        localStorage.removeItem('fpl_user');
        this.user = null;
        this.isDemo = false;
        showToast('התנתקות', 'התנתקת בהצלחה', 'info', 2000);
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
};

// ============================================
// DEMO DATA GENERATOR
// ============================================

function generateDemoPlayer(id, name, teamName, position, price) {
    // Map team names to IDs (simple hash)
    const teamMap = {
        'Liverpool': 1, 'Man City': 2, 'Arsenal': 3, 'Spurs': 4,
        'Chelsea': 5, 'Man Utd': 6, 'Newcastle': 7, 'Aston Villa': 8,
        'Brighton': 9, 'Brentford': 10, 'West Ham': 11, 'Wolves': 12,
        'Crystal Palace': 13, 'Fulham': 14, 'Bournemouth': 15, 'Everton': 16,
        "Nott'm Forest": 17, 'Luton': 18, 'Burnley': 19, 'Sheffield Utd': 20
    };
    
    // Helper function to convert to number
    const toNum = (value) => parseFloat(value);
    
    return {
        id,
        web_name: name,
        team: teamMap[teamName] || id % 20 + 1,
        team_name: teamName,
        position_name: position,
        now_cost: price,
        total_points: Math.floor(Math.random() * 150) + 20,
        form: toNum((Math.random() * 8 + 2).toFixed(1)),
        points_per_game_90: toNum((Math.random() * 8 + 1).toFixed(1)),
        selected_by_percent: toNum((Math.random() * 40 + 5).toFixed(1)),
        minutes: Math.floor(Math.random() * 2000) + 500,
        goals_scored: Math.floor(Math.random() * 20),
        assists: Math.floor(Math.random() * 15),
        clean_sheets: Math.floor(Math.random() * 10),
        bonus: Math.floor(Math.random() * 20),
        ict_index: toNum((Math.random() * 30 + 5).toFixed(1)),
        expected_goal_involvements: toNum((Math.random() * 15 + 2).toFixed(2)),
        xGI_per90: toNum((Math.random() * 1.2 + 0.1).toFixed(2)),
        def_contrib_per90: toNum((Math.random() * 8 + 1).toFixed(1)),
        xDiff: toNum((Math.random() * 4 - 2).toFixed(2)),
        dreamteam_count: Math.floor(Math.random() * 8),
        net_transfers_event: Math.floor(Math.random() * 200) - 100,
        draft_score: toNum((Math.random() * 80 + 20).toFixed(1)),
        predicted_points_1_gw: toNum((Math.random() * 8 + 2).toFixed(1)),
        predicted_points_4_gw: toNum((Math.random() * 30 + 10).toFixed(1)),
        code: Math.floor(Math.random() * 100000),
        creativity: toNum((Math.random() * 100 + 10).toFixed(1)),
        threat: toNum((Math.random() * 100 + 10).toFixed(1)),
        influence: toNum((Math.random() * 100 + 10).toFixed(1)),
        saves: Math.floor(Math.random() * 50),
        goals_conceded: Math.floor(Math.random() * 30),
        // Additional fields that might be needed
        creativity_per_90: toNum((Math.random() * 10 + 2).toFixed(1)),
        threat_per_90: toNum((Math.random() * 10 + 2).toFixed(1)),
        influence_per_90: toNum((Math.random() * 10 + 2).toFixed(1)),
        saves_per_90: toNum((Math.random() * 5 + 1).toFixed(1)),
        clean_sheets_per_90: toNum((Math.random() * 0.5).toFixed(2)),
        expected_goals: toNum((Math.random() * 10 + 1).toFixed(2)),
        expected_assists: toNum((Math.random() * 8 + 1).toFixed(2)),
        expected_goals_per_90: toNum((Math.random() * 0.8).toFixed(2)),
        expected_assists_per_90: toNum((Math.random() * 0.6).toFixed(2)),
        // Component scores (will be recalculated but provide defaults)
        base_score: toNum((Math.random() * 50 + 20).toFixed(1)),
        quality_score: toNum((Math.random() * 50 + 20).toFixed(1)),
        performance_score: toNum((Math.random() * 50 + 20).toFixed(1)),
        ga_per_game: toNum((Math.random() * 1.5).toFixed(2)),
        xgi_per_game: toNum((Math.random() * 1.2).toFixed(2)),
        // Percentiles object (will be populated by calculateAdvancedScores)
        percentiles: {},
        set_piece_priority: {
            penalty: Math.random() > 0.8 ? 1 : 0,
            corner: Math.random() > 0.7 ? 1 : 0,
            free_kick: Math.random() > 0.7 ? 1 : 0
        }
    };
}

function loadDemoData() {
    showLoading('טוען נתוני דמו...');
    
    setTimeout(() => {
        // Create comprehensive demo dataset with real names but fake stats
        const demoPlayers = [
            // Liverpool
            generateDemoPlayer(1, 'Salah', 'Liverpool', 'MID', 13.0),
            generateDemoPlayer(2, 'Alexander-Arnold', 'Liverpool', 'DEF', 7.5),
            generateDemoPlayer(3, 'Van Dijk', 'Liverpool', 'DEF', 6.5),
            generateDemoPlayer(4, 'Alisson', 'Liverpool', 'GKP', 5.5),
            generateDemoPlayer(5, 'Díaz', 'Liverpool', 'MID', 8.0),
            generateDemoPlayer(6, 'Núñez', 'Liverpool', 'FWD', 7.5),
            generateDemoPlayer(7, 'Szoboszlai', 'Liverpool', 'MID', 7.0),
            generateDemoPlayer(8, 'Robertson', 'Liverpool', 'DEF', 6.5),
            
            // Man City
            generateDemoPlayer(9, 'Haaland', 'Man City', 'FWD', 15.0),
            generateDemoPlayer(10, 'De Bruyne', 'Man City', 'MID', 12.5),
            generateDemoPlayer(11, 'Foden', 'Man City', 'MID', 9.5),
            generateDemoPlayer(12, 'Ederson', 'Man City', 'GKP', 5.5),
            generateDemoPlayer(13, 'Walker', 'Man City', 'DEF', 6.0),
            generateDemoPlayer(14, 'Rodri', 'Man City', 'MID', 6.5),
            generateDemoPlayer(15, 'Grealish', 'Man City', 'MID', 7.0),
            generateDemoPlayer(16, 'Dias', 'Man City', 'DEF', 6.0),
            
            // Arsenal
            generateDemoPlayer(17, 'Saka', 'Arsenal', 'MID', 9.5),
            generateDemoPlayer(18, 'Ødegaard', 'Arsenal', 'MID', 8.5),
            generateDemoPlayer(19, 'Martinelli', 'Arsenal', 'MID', 7.5),
            generateDemoPlayer(20, 'Gabriel', 'Arsenal', 'DEF', 6.0),
            generateDemoPlayer(21, 'Saliba', 'Arsenal', 'DEF', 6.0),
            generateDemoPlayer(22, 'Raya', 'Arsenal', 'GKP', 5.0),
            generateDemoPlayer(23, 'Jesus', 'Arsenal', 'FWD', 8.0),
            generateDemoPlayer(24, 'Rice', 'Arsenal', 'MID', 6.5),
            
            // Spurs
            generateDemoPlayer(25, 'Son', 'Spurs', 'MID', 10.0),
            generateDemoPlayer(26, 'Maddison', 'Spurs', 'MID', 7.5),
            generateDemoPlayer(27, 'Richarlison', 'Spurs', 'FWD', 7.0),
            generateDemoPlayer(28, 'Vicario', 'Spurs', 'GKP', 5.0),
            generateDemoPlayer(29, 'Romero', 'Spurs', 'DEF', 5.5),
            generateDemoPlayer(30, 'Pedro Porro', 'Spurs', 'DEF', 5.5),
            
            // Chelsea
            generateDemoPlayer(31, 'Palmer', 'Chelsea', 'MID', 11.0),
            generateDemoPlayer(32, 'Jackson', 'Chelsea', 'FWD', 7.5),
            generateDemoPlayer(33, 'Enzo', 'Chelsea', 'MID', 6.0),
            generateDemoPlayer(34, 'Sánchez', 'Chelsea', 'GKP', 4.5),
            generateDemoPlayer(35, 'James', 'Chelsea', 'DEF', 6.0),
            generateDemoPlayer(36, 'Gallagher', 'Chelsea', 'MID', 5.5),
            
            // Man Utd
            generateDemoPlayer(37, 'B.Fernandes', 'Man Utd', 'MID', 8.5),
            generateDemoPlayer(38, 'Rashford', 'Man Utd', 'MID', 7.0),
            generateDemoPlayer(39, 'Højlund', 'Man Utd', 'FWD', 7.0),
            generateDemoPlayer(40, 'Onana', 'Man Utd', 'GKP', 5.0),
            generateDemoPlayer(41, 'Martínez', 'Man Utd', 'DEF', 5.5),
            
            // Newcastle
            generateDemoPlayer(42, 'Isak', 'Newcastle', 'FWD', 8.5),
            generateDemoPlayer(43, 'Gordon', 'Newcastle', 'MID', 7.5),
            generateDemoPlayer(44, 'Trippier', 'Newcastle', 'DEF', 6.5),
            generateDemoPlayer(45, 'Pope', 'Newcastle', 'GKP', 5.0),
            generateDemoPlayer(46, 'Bruno G.', 'Newcastle', 'MID', 6.5),
            
            // Aston Villa
            generateDemoPlayer(47, 'Watkins', 'Aston Villa', 'FWD', 9.0),
            generateDemoPlayer(48, 'Bailey', 'Aston Villa', 'MID', 6.5),
            generateDemoPlayer(49, 'Martínez', 'Aston Villa', 'GKP', 5.0),
            generateDemoPlayer(50, 'Digne', 'Aston Villa', 'DEF', 5.0),
            
            // Brighton
            generateDemoPlayer(51, 'Mitoma', 'Brighton', 'MID', 6.5),
            generateDemoPlayer(52, 'Ferguson', 'Brighton', 'FWD', 6.0),
            generateDemoPlayer(53, 'Steele', 'Brighton', 'GKP', 4.5),
            
            // Brentford
            generateDemoPlayer(54, 'Mbeumo', 'Brentford', 'MID', 7.0),
            generateDemoPlayer(55, 'Toney', 'Brentford', 'FWD', 7.5),
            generateDemoPlayer(56, 'Flekken', 'Brentford', 'GKP', 4.5),
            
            // West Ham
            generateDemoPlayer(57, 'Bowen', 'West Ham', 'MID', 7.5),
            generateDemoPlayer(58, 'Paquetá', 'West Ham', 'MID', 6.5),
            generateDemoPlayer(59, 'Antonio', 'West Ham', 'FWD', 6.0),
            
            // Wolves
            generateDemoPlayer(60, 'Cunha', 'Wolves', 'MID', 6.5),
            generateDemoPlayer(61, 'Hwang', 'Wolves', 'FWD', 5.5),
            
            // Crystal Palace
            generateDemoPlayer(62, 'Eze', 'Crystal Palace', 'MID', 7.0),
            generateDemoPlayer(63, 'Olise', 'Crystal Palace', 'MID', 6.5),
            
            // Fulham
            generateDemoPlayer(64, 'Willian', 'Fulham', 'MID', 6.0),
            generateDemoPlayer(65, 'Jiménez', 'Fulham', 'FWD', 6.0),
            
            // Bournemouth
            generateDemoPlayer(66, 'Solanke', 'Bournemouth', 'FWD', 7.5),
            generateDemoPlayer(67, 'Kluivert', 'Bournemouth', 'MID', 5.5),
            
            // Everton
            generateDemoPlayer(68, 'Calvert-Lewin', 'Everton', 'FWD', 6.0),
            generateDemoPlayer(69, 'McNeil', 'Everton', 'MID', 5.5),
            
            // Nott'm Forest
            generateDemoPlayer(70, 'Gibbs-White', "Nott'm Forest", 'MID', 6.0),
            generateDemoPlayer(71, 'Wood', "Nott'm Forest", 'FWD', 6.5),
            
            // Luton
            generateDemoPlayer(72, 'Adebayo', 'Luton', 'FWD', 5.5),
            generateDemoPlayer(73, 'Townsend', 'Luton', 'MID', 5.0),
            
            // Burnley
            generateDemoPlayer(74, 'Foster', 'Burnley', 'FWD', 5.5),
            generateDemoPlayer(75, 'Brownhill', 'Burnley', 'MID', 5.0),
            
            // Sheffield Utd
            generateDemoPlayer(76, 'McBurnie', 'Sheffield Utd', 'FWD', 5.5),
            generateDemoPlayer(77, 'Hamer', 'Sheffield Utd', 'MID', 5.5),
        ];
        
        // Process demo data
        state.allPlayersData.demo = {
            raw: demoPlayers,
            processed: demoPlayers,
            fixtures: []
        };
        state.currentDataSource = 'demo';
        state.displayedData = demoPlayers;
        
        // Create fake teams data
        const teams = [...new Set(demoPlayers.map(p => p.team_name))];
        state.teamsData = {};
        teams.forEach((team, idx) => {
            state.teamsData[idx + 1] = {
                id: idx + 1,
                name: team,
                short_name: team.substring(0, 3).toUpperCase()
            };
        });
        
        // Create fake team strength data
        state.teamStrengthData = {};
        teams.forEach((team, idx) => {
            state.teamStrengthData[idx + 1] = {
                attack: Math.random() * 1000 + 500,
                defense: Math.random() * 1000 + 500
            };
        });
        
        // Calculate scores with fake data
        calculateAdvancedScores(demoPlayers);
        
        // Update UI
        renderTable();
        updateDashboardKPIs(demoPlayers);
        
        // Setup event listeners and tooltips
        setupEventListeners();
        initializeTooltips();
        
        hideLoading();
        
        showToast('מצב דמו', 'נתוני דמו נטענו בהצלחה - כל המספרים מפוברקים!', 'success', 3000);
        
        // Show demo banner
        const header = document.querySelector('.header');
        const demoBanner = document.createElement('div');
        demoBanner.style.cssText = `
            background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-top: 16px;
            text-align: center;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        `;
        demoBanner.innerHTML = '🎭 מצב דמו - כל הנתונים מפוברקים לחלוטין! | התחבר עם Google לגישה לנתונים אמיתיים';
        header.appendChild(demoBanner);
    }, 1000);
}

// ============================================
// ORIGINAL CONFIG
// ============================================

const config = {
    urls: {
        bootstrap: 'https://fantasy.premierleague.com/api/bootstrap-static/',
        fixtures: 'https://fantasy.premierleague.com/api/fixtures/',
        draftLeagueDetails: (leagueId) => `https://draft.premierleague.com/api/league/${leagueId}/details`,
        draftLeagueStandings: (leagueId) => `https://draft.premierleague.com/api/league/${leagueId}/standings`,
        draftEntryPicks: (entryId, gw) => `https://draft.premierleague.com/api/entry/${entryId}/event/${gw}`,
        playerImage: (code) => `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png`,
        missingPlayerImage: 'https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'
    },
    corsProxy: 'https://corsproxy.io/?',
    draftLeagueId: 689,
    setPieceTakers: {"Arsenal":{"penalties":["Saka","Havertz"],"freekicks":["Ødegaard","Rice","Martinelli"],"corners":["Martinelli","Saka","Ødegaard"]},"Aston Villa":{"penalties":["Watkins","Tielemans"],"freekicks":["Digne","Douglas Luiz","Bailey"],"corners":["Douglas Luiz","McGinn"]},"Bournemouth":{"penalties":["Solanke","Kluivert"],"freekicks":["Tavernier","Scott"],"corners":["Tavernier","Scott"]},"Brentford":{"penalties":["Toney","Mbeumo"],"freekicks":["Jensen","Mbeumo","Damsgaard"],"corners":["Jensen","Mbeumo"]},"Brighton":{"penalties":["João Pedro","Gross"],"freekicks":["Gross","Estupiñán"],"corners":["Gross","March"]},"Chelsea":{"penalties":["Palmer","Nkunku"],"freekicks":["Palmer","James","Enzo"],"corners":["Gallagher","Chilwell","Palmer"]},"Crystal Palace":{"penalties":["Eze","Olise"],"freekicks":["Eze","Olise"],"corners":["Eze","Olise"]},"Everton":{"penalties":["Calvert-Lewin","McNeil"],"freekicks":["McNeil","Garner"],"corners":["McNeil","Garner"]},"Fulham":{"penalties":["Andreas","Jiménez"],"freekicks":["Andreas","Willian","Wilson"],"corners":["Andreas","Willian"]},"Ipswich":{"penalties":["Chaplin","Hirst"],"freekicks":["Davis","Morsy"],"corners":["Davis","Chaplin"]},"Leicester":{"penalties":["Vardy","Dewsbury-Hall"],"freekicks":["Dewsbury-Hall","Fatawu"],"corners":["Dewsbury-Hall","Fatawu"]},"Liverpool":{"penalties":["M.Salah","Szoboszlai"],"freekicks":["Alexander-Arnold","Szoboszlai","Robertson"],"corners":["Alexander-Arnold","Robertson"]},"Man City":{"penalties":["Haaland","Alvarez"],"freekicks":["De Bruyne","Foden","Alvarez"],"corners":["Foden","De Bruyne"]},"Man Utd":{"penalties":["B.Fernandes","Rashford"],"freekicks":["B.Fernandes","Eriksen","Rashford"],"corners":["B.Fernandes","Shaw"]},"Newcastle":{"penalties":["Isak","Wilson"],"freekicks":["Trippier","Gordon"],"corners":["Trippier","Gordon"]},"Nott'm Forest":{"penalties":["Gibbs-White","Wood"],"freekicks":["Gibbs-White","Elanga"],"corners":["Gibbs-White","Elanga"]},"Southampton":{"penalties":["A. Armstrong","Ward-Prowse"],"freekicks":["Ward-Prowse","Smallbone"],"corners":["Ward-Prowse","Aribo"]},"Spurs":{"penalties":["Son","Maddison"],"freekicks":["Maddison","Pedro Porro"],"corners":["Maddison","Pedro Porro","Son"]},"West Ham":{"penalties":["Ward-Prowse","Bowen"],"freekicks":["Ward-Prowse","Emerson"],"corners":["Ward-Prowse","Bowen"]},"Wolves":{"penalties":["Cunha","Hwang"],"freekicks":["Sarabia","Bellegarde"],"corners":["Sarabia","Aït-Nouri"]}},
    tableColumns: [
        'rank', 'web_name', 'draft_score', 'stability_index', 'predicted_points_1_gw', 'ml_prediction', 'team_name', 'draft_team',
        'position_name', 'now_cost', 'total_points', 'points_per_game_90', 'selected_by_percent', 
        'dreamteam_count', 'net_transfers_event', 'def_contrib_per90', 'goals_scored_assists', 
        'expected_goals_assists', 'minutes', 'xDiff', 'ict_index', 'bonus', 'clean_sheets', 
        'set_piece_priority.penalty', 'set_piece_priority.corner', 'set_piece_priority.free_kick', 'fixtures'
    ],
    comparisonMetrics: {
        'ציון דראפט': { key: 'draft_score', format: v => v.toFixed(1), reversed: false },
        'xPts (4GW)': { key: 'predicted_points_4_gw', format: v => (v || 0).toFixed(1), reversed: false },
        'נקודות למשחק (90)': { key: 'points_per_game_90', format: v => v.toFixed(1), reversed: false },
        'xGI (90)': { key: 'xGI_per90', format: v => v.toFixed(2), reversed: false },
        'DC/90 (הגנה)': { key: 'def_contrib_per90', format: v => v.toFixed(1), reversed: false },
        'xDiff': { key: 'xDiff', format: v => v.toFixed(2), reversed: true },
        'מחיר': { key: 'now_cost', format: v => `£${v.toFixed(1)}m`, reversed: true },
        'אחוז בחירה': { key: 'selected_by_percent', format: v => `${v}%`, reversed: true },
        'דקות': { key: 'minutes', format: v => v.toLocaleString(), reversed: false },
    },
    visualizationSpecs: {
        midfielders:{title:'מטריצת קשרים',pos:['MID'],x:'def_contrib_per90',y:'xGI_per90',xLabel:'תרומה הגנתית/90',yLabel:'איום התקפי (xGI/90)', quadLabels: {topRight: 'קשר All-Round', topLeft: 'קשר התקפי', bottomRight: 'קשר הגנתי', bottomLeft: 'פחות תורם'}},
        forwards:{title:'מטריצת חלוצים',pos:['FWD'],x:'points_per_game_90',y:'xGI_per90',xLabel:'נקודות/90',yLabel:'איום התקפי (xGI/90)', quadLabels: {topRight: 'חלוץ עלית', topLeft: 'מאיים, לא יעיל', bottomRight: 'יעיל, איום נמוך', bottomLeft: 'להימנע'}},
        defenders:{title:'מטריצת מגנים',pos:['DEF'],x:'def_contrib_per90',y:'xGI_per90',xLabel:'תרומה הגנתית/90',yLabel:'איום התקפי (xGI/90)', quadLabels: {topRight: 'מגן שלם', topLeft: 'מגן התקפי', bottomRight: 'בלם סלע', bottomLeft: 'להימנע'}},
        goalkeepers:{title:'מטריצת שוערים',pos:['GKP'],x:'saves_per_90',y:'clean_sheets_per_90',xLabel:'הצלות/90',yLabel:'שערים נקיים/90', quadLabels: {topRight: 'שוער עלית', topLeft: 'עסוק, פחות CS', bottomRight: 'יעיל, פחות הצלות', bottomLeft: 'להימנע'}},
        defensive_offensive: {title:'תרומה הגנתית מול איום התקפי', pos:['DEF', 'MID', 'FWD'], x:'def_contrib_per90', y:'xGI_per90', xLabel:'תרומה הגנתית (DC/90)', yLabel:'איום התקפי (xGI/90)', quadLabels: {topRight: 'All-Around Threat', topLeft: 'Offensive Specialist', bottomRight: 'Defensive Anchor', bottomLeft: 'Limited Impact'}}
    },
    recommendationMetrics: {
        'ציון חכם': { key: 'smart_score', format: v => {
            const val = parseFloat(v) || 0;
            return val.toFixed(1);
        }},
        'יציבות': { key: 'stability_index', format: v => {
            const val = parseFloat(v) || 0;
            return val.toFixed(0);
        }},
        'xPts (הבא)': { key: 'predicted_points_1_gw', format: v => {
            const val = parseFloat(v) || 0;
            return val.toFixed(1);
        }},
        'ציון דראפט': { key: 'draft_score', format: v => {
            const val = parseFloat(v) || 0;
            return val.toFixed(1);
        }},
        'Form': { key: 'form', format: v => {
            const val = parseFloat(v) || 0;
            return val.toFixed(1);
        }},
        'הפרש העברות': { key: 'transfers_balance', format: v => {
            const val = parseInt(v) || 0;
            return val > 0 ? `+${val}` : `${val}`;
        }},
        '% בחירה': { key: 'selected_by_percent', format: v => {
            const val = parseFloat(v) || 0;
            return `${val.toFixed(1)}%`;
        }},
        'דקות': { key: 'minutes', format: v => {
            const val = parseInt(v) || 0;
            return Math.round(val);
        }},
    },
    draftAnalyticsDimensions: [
        { key:'sumDraft', label:'ציון דראפט סה"כ' },
        { key:'sumPred', label:'xPts (4GW) סה"כ' },
        { key:'totalPrice', label:'שווי סגל (M)' },
        { key:'sumSelectedBy', label:'אחוז בחירה סה"כ' },
        { key:'gaTotal', label:'שערים+בישולים סה"כ' },
        { key:'totalCleanSheets', label:'שערים נקיים סה"כ' },
        { key:'totalXGI', label:'xGI סה"כ' },
        { key:'totalDefCon', label:'תרומה הגנתית סה"כ' }
    ],
    draftMatrixSpecs: [
        { key: 'val_vs_pf', title: 'שווי קבוצה מול Points For', build: (aggregates) => aggregates.map(t => ({ team:t.team, x: t.metrics.totalPrice||0, y: teamPointsFor(t.team) })) , xLabel:'שווי סגל (M)', yLabel:'Points For', quads: { topRight:'יקר וחזק', topLeft:'זול וחזק', bottomRight:'יקר וחלש', bottomLeft:'זול וחלש' } },
        { key: 'xgi_vs_ga', title: 'xGI סה"כ מול G+A סה"כ', build: (aggregates) => aggregates.map(t => ({ team:t.team, x: t.metrics.totalXGI||0, y: t.metrics.gaTotal||0 })), xLabel:'xGI סה"כ', yLabel:'G+A סה"כ', quads: { topRight:'מימוש גבוה', topLeft:'פוטנציאל לא ממומש', bottomRight:'מימוש יתר', bottomLeft:'נמוך בשניהם' } },
        { key: 'ds_vs_xpts', title: 'ציון דראפט מול xPts(4GW)', build: (aggregates) => aggregates.map(t => ({ team:t.team, x: t.metrics.sumDraft||0, y: t.metrics.sumPred||0 })), xLabel:'ציון דראפט סה"כ', yLabel:'xPts (4GW) סה"כ', quads: { topRight:'סגל איכותי וכושר טוב', topLeft:'סגל איכותי אך תחזית נמוכה', bottomRight:'סגל חלש אך תחזית טובה', bottomLeft:'חלש בשניהם' } },
        { key: 'def_vs_cs', title: 'תרומה הגנתית מול קלין שיטס', build: (aggregates) => aggregates.map(t => ({ team:t.team, x: t.metrics.totalDefCon||0, y: t.metrics.totalCleanSheets||0 })), xLabel:'תרומה הגנתית סה"כ', yLabel:'קלין שיטס סה"כ', quads: { topRight:'הגנה איכותית ומקבלת CS', topLeft:'הגנה חזקה אך מעט CS', bottomRight:'CS רבים אך תרומה נמוכה', bottomLeft:'הגנה חלשה' } },
    ],
    columnTooltips: {
        'draft_score': 'ציון דראפט מושלם: 35% נקודות בפועל, 15% תרומה הגנתית, 12% G+A למשחק, 12% xG למשחק, 10% איכות משחק, 8% אחוז בעלות, 8% בונוס. מחושב לפי עמדה!',
        'predicted_points_1_gw': 'חיזוי נקודות למחזור הבא - מודל מתקדם: 17% מומנטום העברות 🔥, 28% כושר 📈, 25% xGI/90 ⚽, 20% קושי יריבות 🎯, 10% חוזק קבוצה 💪',
        'predicted_points_4_gw': 'צפי נקודות ממוצע ל-4 המחזורים הקרובים (לשימוש פנימי).',
        'stability_index': 'מדד יציבות (0-100) 📊 - מודד עקביות השחקן: 40% כושר אחרון 📈, 30% דיוק xG ⚽, 20% זמן משחק קבוע ⏱️, 10% שונות נקודות 📉. ככל שגבוה יותר = שחקן יציב ויותר צפוי ✅',
        'def_contrib_per90': 'תרומה הגנתית ל-90 דקות (תיקולים, חטיפות, חילוצים).',
        'xDiff': 'ההפרש בין שערים+בישולים בפועל לצפי (xGI). ערך חיובי מעיד על מימוש יתר.',
        'net_transfers_event': 'סה"כ העברות נכנסות פחות יוצאות במחזור הנוכחי - מדד למומנטום ביקוש לשחקן.'
    }
};

const state = {
    allPlayersData: {
        historical: { raw: null, processed: null, fixtures: null },
        live: { raw: null, processed: null, fixtures: null },
        demo: { raw: null, processed: null, fixtures: null }
    },
    currentDataSource: 'live',
    teamsData: {},
    teamStrengthData: {},
    displayedData: [],
    sortColumn: 2,
    sortDirection: 'desc',
    activeQuickFilterName: null,
    selectedForComparison: new Set(),
    // Advanced filters
    searchQuery: '',
    priceRange: { min: 4, max: 15 },
    selectedTeams: [],
    savedFilters: null,
    draft: {
        leagueId: 689,
        details: null,
        standings: null,
        rostersByEntryId: new Map(),
        lineupsByEntryId: new Map(), // { entryId: { starting: [fplId1, ...], bench: [fplId12, ...] } }
        entryIdToTeamName: new Map(),
        allPicks: new Set(),
        ownedElementIds: new Set(),
        teamAggregates: [],
        _standingsData: [],
        _standingsSort: null,
        charts: { analytics: {}, matrix: null, progress: null },
        // Player ID mapping between Draft API and Fantasy API
        draftToFplIdMap: new Map(), // Draft ID -> Fantasy ID
        fplToDraftIdMap: new Map(), // Fantasy ID -> Draft ID
    }
};

const charts = {
    visualization: null,
    comparisonRadar: null
};

/**
 * Fetch with cache, retry logic, and rate limiting
 * 
 * Features:
 * - Cache with configurable duration
 * - Retry on failure with exponential backoff
 * - Rate limiting detection (429 status)
 * - Network error handling
 * 
 * @param {string} url - URL to fetch
 * @param {string} cacheKey - Cache key for localStorage
 * @param {number} cacheDurationMinutes - Cache validity duration
 * @param {Object} options - Fetch options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.retryDelay - Initial retry delay in ms (default: 1000)
 * @returns {Promise<Object>} - Fetched data
 */
async function fetchWithCache(url, cacheKey, cacheDurationMinutes = 120, options = {}) {
    const { maxRetries = 3, retryDelay = 1000 } = options;
    
    // Try cache first
    const cachedItem = localStorage.getItem(cacheKey);
    if (cachedItem) {
        try {
            const { timestamp, data } = JSON.parse(cachedItem);
            const isCacheValid = (new Date().getTime() - timestamp) / (1000 * 60) < cacheDurationMinutes;
            if (isCacheValid) {
                console.log(`✅ Returning cached data for ${cacheKey}`);
                return data;
            } else {
                 localStorage.removeItem(cacheKey);
                 console.log(`⏰ Cache expired for ${cacheKey}`);
            }
            } catch (e) {
            console.error('❌ Error parsing cache, removing item:', e);
            localStorage.removeItem(cacheKey);
        }
    }

    // Fetch with retry logic
    console.log(`🌐 Fetching fresh data for ${cacheKey}`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url);
            
            // Handle rate limiting (429)
            if (response.status === 429) {
                const waitTime = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                console.warn(`⚠️ Rate limited (429), waiting ${waitTime}ms before retry ${attempt}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue; // Retry
            }
            
            // Handle other HTTP errors
            if (!response.ok) {
                if (attempt === maxRetries) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                console.warn(`⚠️ HTTP ${response.status}, retry ${attempt}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                continue;
            }
            
            // Success - parse and cache
            const data = await response.json();
            
            // Save to cache
            try {
                localStorage.setItem(cacheKey, JSON.stringify({ timestamp: new Date().getTime(), data }));
                console.log(`💾 Cached data for ${cacheKey}`);
            } catch(e) {
                console.error("⚠️ Failed to write to localStorage. Cache might be full.", e);
            }
            
            return data;
            
        } catch (error) {
            // Network error or JSON parse error
            if (attempt === maxRetries) {
                console.error(`❌ Failed after ${maxRetries} attempts:`, error);
                throw error;
            }
            
            console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
    
    throw new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
}

// ============================================
// DRAFT TO FPL PLAYER ID MAPPING
// ============================================

/**
 * Normalize player name for comparison
 * Removes accents, converts to lowercase, removes extra spaces
 */
function normalizePlayerName(player) {
    const fullName = `${player.first_name} ${player.second_name}`.toLowerCase();
    // Remove accents and special characters
    return fullName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
}

/**
 * Check if two player names match (either first or second name)
 */
function namesMatch(player1, player2) {
    const name1Lower = player1.second_name.toLowerCase();
    const name2Lower = player2.second_name.toLowerCase();
    
    // Exact match on second name
    if (name1Lower === name2Lower) return true;
    
    // Check if one contains the other (for hyphenated names)
    if (name1Lower.includes(name2Lower) || name2Lower.includes(name1Lower)) return true;
    
    return false;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

/**
 * Find fuzzy match for a player using Levenshtein distance
 */
function findFuzzyMatch(draftPlayer, fplPlayers) {
    const draftName = normalizePlayerName(draftPlayer);
    const draftPos = draftPlayer.element_type;
    
    let bestMatch = null;
    let bestSimilarity = 0;
    
    for (const fplPlayer of fplPlayers) {
        // Only compare players in the same position
        if (fplPlayer.element_type !== draftPos) continue;
        
        const fplName = normalizePlayerName(fplPlayer);
        const distance = levenshteinDistance(draftName, fplName);
        const maxLength = Math.max(draftName.length, fplName.length);
        const similarity = 1 - (distance / maxLength);
        
        if (similarity > bestSimilarity && similarity > 0.8) {
            bestSimilarity = similarity;
            bestMatch = fplPlayer;
        }
    }
    
    return bestMatch ? { player: bestMatch, similarity: bestSimilarity } : null;
}

/**
 * Build mapping between Draft API player IDs and Fantasy API player IDs
 * This solves the problem where IDs don't match between the two APIs
 */
async function buildDraftToFplMapping() {
    console.log('🔄 Building Draft to FPL ID mapping...');
    
    try {
        const fplUrl = config.corsProxy + encodeURIComponent(config.urls.bootstrap);
        const draftUrl = config.corsProxy + encodeURIComponent('https://draft.premierleague.com/api/bootstrap-static');
        
        const [fplData, draftData] = await Promise.all([
            fetchWithCache(fplUrl, 'fpl_bootstrap_mapping', 60),
            fetchWithCache(draftUrl, 'draft_bootstrap_mapping', 60)
        ]);
        
        // Create lookup maps
        const fplById = new Map(fplData.elements.map(p => [p.id, p]));
        const fplByName = new Map();
        
        // Build name-based lookup for FPL players
        for (const p of fplData.elements) {
            const key = normalizePlayerName(p);
            fplByName.set(key, p);
        }
        
        // Clear existing mappings
        state.draft.draftToFplIdMap.clear();
        state.draft.fplToDraftIdMap.clear();
        
        let exactMatches = 0;
        let nameMatches = 0;
        let fuzzyMatches = 0;
        let unmapped = 0;
        
        console.log('📋 Starting player mapping...');
        
        for (const draftPlayer of draftData.elements) {
            let fplPlayer = null;
            let matchType = null;
            
            // Step 1: Try exact ID match + name verification
            const candidate = fplById.get(draftPlayer.id);
            if (candidate && namesMatch(candidate, draftPlayer)) {
                fplPlayer = candidate;
                matchType = 'exact_id';
                exactMatches++;
            }
            
            // Step 2: Try name-based matching
            if (!fplPlayer) {
                const nameKey = normalizePlayerName(draftPlayer);
                fplPlayer = fplByName.get(nameKey);
                if (fplPlayer) {
                    matchType = 'name';
                    nameMatches++;
                    if (draftPlayer.id !== fplPlayer.id) {
                        console.log(`  🔗 Name match: ${draftPlayer.web_name} - Draft:${draftPlayer.id} → FPL:${fplPlayer.id}`);
                    }
                }
            }
            
            // Step 3: Try fuzzy matching (for name variations)
            if (!fplPlayer) {
                const fuzzyMatch = findFuzzyMatch(draftPlayer, fplData.elements);
                if (fuzzyMatch && fuzzyMatch.similarity > 0.85) {
                    fplPlayer = fuzzyMatch.player;
                    matchType = 'fuzzy';
                    fuzzyMatches++;
                    console.log(`  🔍 Fuzzy match: ${draftPlayer.web_name} → ${fplPlayer.web_name} (${(fuzzyMatch.similarity * 100).toFixed(0)}% similar, Draft:${draftPlayer.id} → FPL:${fplPlayer.id})`);
                }
            }
            
            if (fplPlayer) {
                state.draft.draftToFplIdMap.set(draftPlayer.id, fplPlayer.id);
                state.draft.fplToDraftIdMap.set(fplPlayer.id, draftPlayer.id);
            } else {
                unmapped++;
                console.warn(`  ❌ No match found for: ${draftPlayer.web_name} (Draft ID: ${draftPlayer.id}, Position: ${draftPlayer.element_type})`);
            }
        }
        
        console.log('✅ Mapping complete:');
        console.log(`  - Exact ID matches: ${exactMatches}`);
        console.log(`  - Name matches: ${nameMatches}`);
        console.log(`  - Fuzzy matches: ${fuzzyMatches}`);
        console.log(`  - Unmapped: ${unmapped}`);
        console.log(`  - Total mapped: ${state.draft.draftToFplIdMap.size} / ${draftData.elements.length}`);
        
        return {
            success: true,
            mapped: state.draft.draftToFplIdMap.size,
            unmapped: unmapped
        };
        
    } catch (error) {
        console.error('❌ Failed to build Draft→FPL mapping:', error);
        return { success: false, error: error.message };
    }
}

function showLoading(message = 'טוען נתונים...') {
    const overlay = document.getElementById('loadingOverlay');
    overlay.querySelector('p').textContent = message;
    overlay.style.display = 'flex';
    showProgressBar();
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
    hideProgressBar();
}

// Progress Bar Functions
function showProgressBar() {
    const container = document.getElementById('progressBarContainer');
    const bar = document.getElementById('progressBar');
    if (!container || !bar) return;
    
    container.classList.add('active');
    bar.style.width = '0%';
    
    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90; // Never reach 100% until complete
        bar.style.width = `${progress}%`;
    }, 300);
    
    // Store interval for cleanup
    container.dataset.intervalId = interval;
}

function hideProgressBar() {
    const container = document.getElementById('progressBarContainer');
    const bar = document.getElementById('progressBar');
    if (!container || !bar) return;
    
    // Clear interval
    if (container.dataset.intervalId) {
        clearInterval(parseInt(container.dataset.intervalId));
    }
    
    // Complete to 100%
    bar.style.width = '100%';
    
    // Hide after animation
    setTimeout(() => {
        container.classList.remove('active');
        bar.style.width = '0%';
    }, 300);
}

// Toast Notification System
function showToast(title, message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    return toast;
}

// Main init function for real data
async function init() {
    Chart.register(ChartDataLabels);
    
    // Load data sources in sequence to ensure mapping works
    showLoading();
    try {
        // 1. First load FPL data
        await fetchAndProcessData();
        
        // 2. Then build the Draft→FPL mapping
        await buildDraftToFplMapping();
        
        // 3. Finally load Draft data (now mapping is ready!)
        await loadDraftDataInBackground();
        
        showToast('טעינה הושלמה', 'כל הנתונים נטענו בהצלחה!', 'success', 3000);
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('שגיאה', 'שגיאה בטעינת הנתונים', 'error', 4000);
    } finally {
        hideLoading();
    }
    
    setupEventListeners();
    const lastTab = localStorage.getItem('fplToolActiveTab');
    if (lastTab) {
        showTab(lastTab);
    }
    initializeTooltips();
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize authentication
    auth.init();
});

async function fetchAndProcessData() {
    showLoading('טוען נתוני שחקנים...');
    try {
        const needsData = !state.allPlayersData[state.currentDataSource].raw;
        const needsFixtures = !state.allPlayersData.live.fixtures;

        if (needsData || needsFixtures) {
            const dataUrl = state.currentDataSource === 'live'
                ? config.corsProxy + encodeURIComponent(config.urls.bootstrap)
                : 'FPL_Bootstrap_static.json';
            const dataCacheKey = `fpl_bootstrap_${state.currentDataSource}`;
            
            const fixturesUrl = config.corsProxy + encodeURIComponent(config.urls.fixtures);
            const fixturesCacheKey = 'fpl_fixtures';

            if (needsData) {
                 if (state.currentDataSource === 'live') {
                    state.allPlayersData.live.raw = await fetchWithCache(dataUrl, dataCacheKey, 60);
                 } else {
                    const response = await fetch(dataUrl); // Local file, no cache
                    state.allPlayersData.historical.raw = await response.json();
                 }
            }
            if (needsFixtures) {
                const fixturesData = await fetchWithCache(fixturesUrl, fixturesCacheKey, 180);
                state.allPlayersData.live.fixtures = fixturesData;
                state.allPlayersData.historical.fixtures = fixturesData;
            }
        }
        
        const data = state.allPlayersData[state.currentDataSource].raw;
        if (!data) throw new Error(`No data available for ${state.currentDataSource}.`);
        if (!state.allPlayersData[state.currentDataSource].processed) {
            state.teamsData = data.teams.reduce((acc, team) => {
                acc[team.id] = { name: team.name, short_name: team.short_name };
                return acc;
            }, {});
            state.teamStrengthData = data.teams.reduce((acc, team) => {
                acc[team.id] = { ...team };
                return acc;
            }, {});
            const setPieceTakers = config.setPieceTakers;
            let processedPlayers = preprocessPlayerData(data.elements.filter(p => p.status !== 'u'), setPieceTakers);
            processedPlayers = calculateAdvancedScores(processedPlayers);
            state.allPlayersData[state.currentDataSource].processed = processedPlayers;
        }
        
        document.getElementById('lastUpdated').textContent = `עדכון אחרון: ${new Date().toLocaleString('he-IL')}`;
        populateTeamFilter();
        updateDashboardKPIs(); // Update dashboard KPIs
        processChange();
        
        // Load draft data in background (for team filter)
        loadDraftDataInBackground();
        
        // Show success toast
        showToast('נתונים נטענו בהצלחה', `${state.allPlayersData[state.currentDataSource].processed.length} שחקנים נטענו`, 'success', 3000);
} catch (error) {
        console.error('Error in fetchAndProcessData:', error);
        document.getElementById('playersTableBody').innerHTML = `<tr><td colspan="26" style="text-align:center; padding: 20px; color: red;">שגיאה בטעינת נתונים: ${error.message}</td></tr>`;
        showToast('שגיאה בטעינת נתונים', error.message, 'error', 5000);
} finally {
    hideLoading();
}
}

function switchDataSource(source) {
    if (source === state.currentDataSource) return;
    state.currentDataSource = source;
    document.getElementById('historicalDataBtn').classList.toggle('active', source === 'historical');
    document.getElementById('liveDataBtn').classList.toggle('active', source === 'live');
    fetchAndProcessData();
}

function getPositionName(elementTypeId) {
    switch (elementTypeId) {
        case 1: return 'GKP';
        case 2: return 'DEF';
        case 3: return 'MID';
        case 4: return 'FWD';
        default: return 'Unknown';
    }
}

function preprocessPlayerData(players, setPieceTakers) {
    return players.map(p => {
        p.defensive_contribution_per_90 = p.minutes > 0 ? ((p.interceptions || 0) + (p.tackles || 0) + (p.clearances_blocks_interceptions || 0)) / (p.minutes / 90) : 0;
        p.xGI_per90 = p.minutes > 0 ? (parseFloat(p.expected_goal_involvements_per_90) || 0) : 0;
        p.def_contrib_per90 = p.defensive_contribution_per_90 || 0;
        p.net_transfers_event = (p.transfers_in_event || 0) - (p.transfers_out_event || 0);
        p.xDiff = ((p.goals_scored || 0) + (p.assists || 0)) - (parseFloat(p.expected_goal_involvements) || 0);
        p.now_cost = p.now_cost / 10;
        p.team_name = state.teamsData[p.team] ? state.teamsData[p.team].name : 'Unknown';
        p.position_name = getPositionName(p.element_type);
        
        const normalizedPlayerName = p.web_name.toLowerCase();
        const teamSetPieces = setPieceTakers[p.team_name] || { penalties: [], freekicks: [], corners: [] };
        
        p.set_piece_priority = {
            penalty: teamSetPieces.penalties.findIndex(name => normalizedPlayerName.includes(name.toLowerCase())) + 1,
            free_kick: teamSetPieces.freekicks.findIndex(name => normalizedPlayerName.includes(name.toLowerCase())) + 1,
            corner: teamSetPieces.corners.findIndex(name => normalizedPlayerName.includes(name.toLowerCase())) + 1,
        };
        
        p.points_per_game_90 = p.minutes > 0 ? (p.total_points / (p.minutes / 90)) : 0;
        p.goals_scored_assists = (p.goals_scored || 0) + (p.assists || 0);
        p.expected_goals_assists = parseFloat(p.expected_goal_involvements) || 0;
        return p;
    });
}

function setupEventListeners() {
    ['searchName', 'priceRange', 'minPoints', 'minMinutes'].forEach(id => document.getElementById(id).addEventListener('keyup', processChange));
    ['positionFilter', 'teamFilter', 'xDiffFilter', 'showEntries'].forEach(id => document.getElementById(id).addEventListener('change', processChange));
}

function initializeTooltips() {
    const tooltipEl = document.getElementById('tooltip');
    
    document.body.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (!target) return;
        
        tooltipEl.textContent = target.dataset.tooltip;
        tooltipEl.style.display = 'block';
        tooltipEl.classList.add('visible');

        const rect = target.getBoundingClientRect();
        tooltipEl.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltipEl.offsetWidth / 2)}px`;
        tooltipEl.style.top = `${rect.top + window.scrollY - tooltipEl.offsetHeight - 5}px`;
    });

    document.body.addEventListener('mouseout', (e) => {
        if (e.target.closest('[data-tooltip]')) {
            tooltipEl.classList.remove('visible');
        }
    });
}

function populateTeamFilter() {
    const teamFilter = document.getElementById('teamFilter');
    teamFilter.innerHTML = '<option value="">כל הקבוצות</option>';
    if (!state.allPlayersData[state.currentDataSource].processed) return;
    
    const draftTeamFilterGroup = document.querySelector('#teamFilter').parentNode;
    let draftTeamFilter = document.getElementById('draftTeamFilter');
    if (!draftTeamFilter) {
        draftTeamFilter = document.createElement('select');
        draftTeamFilter.id = 'draftTeamFilter';
        draftTeamFilter.onchange = processChange;
        
        const draftLabel = document.createElement('label');
        draftLabel.textContent = '🛡️ קבוצת דראפט:';
        
        const draftGroup = document.createElement('div');
        draftGroup.className = 'filter-group';
        draftGroup.appendChild(draftLabel);
        draftGroup.appendChild(draftTeamFilter);
        
        draftTeamFilterGroup.parentNode.insertBefore(draftGroup, draftTeamFilterGroup.nextSibling);
    }
    
    draftTeamFilter.innerHTML = '<option value="">כל השחקנים</option><option value="free_agents">שחקנים חופשיים</option>';
    if (state.draft.details && state.draft.details.league_entries) {
        state.draft.details.league_entries.forEach(entry => {
            if(entry.entry_name) {
        const option = document.createElement('option');
                option.value = entry.id;
                option.textContent = entry.entry_name;
                draftTeamFilter.appendChild(option);
            }
        });
    }

    const uniqueTeams = [...new Set(state.allPlayersData[state.currentDataSource].processed.map(p => p.team_name))].sort();
    uniqueTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamFilter.appendChild(option);
    });
}

function createPlayerRowHtml(player, index) {
    const icons = generatePlayerIcons(player);
    const fixturesHTML = generateFixturesHTML(player);
    const isChecked = state.selectedForComparison.has(player.id) ? 'checked' : '';
    
    // Get ML prediction
    const mlPrediction = player.ml_prediction || 0;
    const mlClass = mlPrediction >= 5 ? 'ml-high' : mlPrediction >= 3 ? 'ml-medium' : 'ml-low';
    
    // Get draft team
    const draftTeam = getDraftTeamForPlayer(player.id);
    const draftTeamDisplay = draftTeam || '🆓 חופשי';
    const draftTeamClass = draftTeam ? 'draft-owned' : 'draft-free';

    return `<tr>
        <td><input type="checkbox" class="player-select" data-player-id="${player.id}" ${isChecked}></td>
        <td>${index + 1}</td>
        <td class="name-cell"><span class="player-name-icon">${icons.icons}</span>${player.web_name}</td>
        <td class="bold-cell">${player.draft_score.toFixed(1)}</td>
        <td class="bold-cell stability-cell">${(player.stability_index || 0).toFixed(0)}</td>
        <td class="bold-cell" title="חיזוי טכני: ${(player.predicted_points_1_gw || 0).toFixed(1)} נקודות">${(player.predicted_points_1_gw || 0).toFixed(1)}</td>
        <td class="bold-cell ${mlClass}" title="חיזוי ML: ${mlPrediction.toFixed(1)} נקודות">${mlPrediction.toFixed(1)}</td>
        <td>${player.team_name}</td>
        <td class="${draftTeamClass}" title="${draftTeamDisplay}">${draftTeamDisplay}</td>
        <td>${player.position_name}</td>
        <td>${player.now_cost.toFixed(1)}</td>
        <td>${player.total_points}</td>
        <td>${player.points_per_game_90.toFixed(1)}</td>
        <td>${player.selected_by_percent}%</td>
        <td>${player.dreamteam_count}</td>
        <td class="transfers-cell" data-tooltip="${config.columnTooltips.net_transfers_event}"><span class="${player.net_transfers_event >= 0 ? 'net-transfers-positive' : 'net-transfers-negative'}">${player.net_transfers_event.toLocaleString()}</span></td>
        <td data-tooltip="${config.columnTooltips.def_contrib_per90}">${player.def_contrib_per90.toFixed(1)}</td>
        <td>${(player.goals_scored || 0) + (player.assists || 0)}</td>
        <td>${(parseFloat(player.expected_goal_involvements) || 0).toFixed(1)}</td>
        <td>${player.minutes}</td>
        <td class="${player.xDiff >= 0 ? 'xdiff-positive' : 'xdiff-negative'}" data-tooltip="${config.columnTooltips.xDiff}">${player.xDiff.toFixed(2)}</td>
        <td>${player.ict_index}</td>
        <td>${player.bonus}</td>
        <td>${player.clean_sheets}</td>
        <td class="${player.set_piece_priority.penalty === 1 ? 'set-piece-yes' : 'set-piece-no'}">${player.set_piece_priority.penalty === 1 ? '🎯 (1)' : '–'}</td>
        <td class="${player.set_piece_priority.corner > 0 ? 'set-piece-yes' : 'set-piece-no'}">${player.set_piece_priority.corner > 0 ? `(${player.set_piece_priority.corner})` : '–'}</td>
        <td class="${player.set_piece_priority.free_kick > 0 ? 'set-piece-yes' : 'set-piece-no'}">${player.set_piece_priority.free_kick > 0 ? `(${player.set_piece_priority.free_kick})` : '–'}</td>
        <td class="fixtures-cell">${fixturesHTML}</td>
    </tr>`;
}

function renderTable() {
    const columnMapping = config.tableColumns;

    state.displayedData.sort((a, b) => {
        let aValue, bValue;
        const field = columnMapping[state.sortColumn];

        if (state.sortColumn === 13) { // G+A column
            aValue = (a.goals_scored || 0) + (a.assists || 0);
            bValue = (b.goals_scored || 0) + (b.assists || 0);
        } else if (state.sortColumn === 14) { // xGI column
            aValue = parseFloat(a.expected_goal_involvements || 0);
            bValue = parseFloat(b.expected_goal_involvements || 0);
        } else {
            aValue = getNestedValue(a, field);
            bValue = getNestedValue(b, field);
            if (typeof aValue === 'string' && !isNaN(aValue)) aValue = parseFloat(aValue);
            if (typeof bValue === 'string' && !isNaN(bValue)) bValue = parseFloat(bValue);
        }
        
        if (aValue === null || aValue === undefined) aValue = -Infinity;
        if (bValue === null || bValue === undefined) bValue = -Infinity;
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return state.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        } else {
            return state.sortDirection === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
        }
    });

    const tbody = document.getElementById('playersTableBody');
    tbody.innerHTML = state.displayedData.map((player, index) => createPlayerRowHtml(player, index)).join('');

    // Update KPIs based on displayed/filtered data
    updateDashboardKPIs(state.displayedData);

    document.querySelectorAll('.player-select').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const playerId = parseInt(this.dataset.playerId);
            if (this.checked) {
                state.selectedForComparison.add(playerId);
        } else {
                state.selectedForComparison.delete(playerId);
            }
        });
    });

    // Add tooltips to headers
    const headers = document.querySelectorAll('#playersTable thead th');
    const columnKeys = ['rank', 'web_name', 'draft_score', 'stability_index', 'predicted_points_1_gw', 'ml_prediction', 'team_name', 'draft_team', 'position_name', 'now_cost', 'total_points', 'points_per_game_90', 'selected_by_percent', 'dreamteam_count', 'net_transfers_event', 'def_contrib_per90', 'goals_scored_assists', 'expected_goals_assists', 'minutes', 'xDiff', 'ict_index', 'bonus', 'clean_sheets', 'set_piece_priority.penalty', 'set_piece_priority.corner', 'set_piece_priority.free_kick', 'fixtures'];

    headers.forEach((th, i) => {
        const key = columnKeys[i-1];
        if (config.columnTooltips[key]) {
            th.dataset.tooltip = config.columnTooltips[key];
        }
    });
}

function getDraftTeamForPlayer(fplId) {
    // Check if player is owned by any team
    for (const [entryId, roster] of state.draft.rostersByEntryId.entries()) {
        if (roster.includes(fplId)) {
            return state.draft.entryIdToTeamName.get(entryId) || 'Unknown';
        }
    }
    return null; // Free agent
}

function generatePlayerIcons(p) {
    const i = [];
    if (p.set_piece_priority.penalty === 1) i.push(`🎯`);
    if (p.set_piece_priority.corner > 0) i.push(`⚽`);
    if (p.set_piece_priority.free_kick > 0) i.push(`👟`);
    if (parseFloat(p.selected_by_percent) < 5) i.push(`💎`);
    if (p.price_tier === 'Budget' && p.points_per_game_90 > 3.5) i.push(`💰`);
    if (p.minutes === 0) i.push(`🌟`);
    if (p.dreamteam_count > 0) i.push(`🏆`);
    return {
        icons: i.map(e => `<span class='player-name-icon'>${e}</span>`).join(""),
        tooltip: i.join(' ')
    };
}

function generateFixturesHTML(player) {
    const teamId = player.team;
    const fixtures = state.allPlayersData.live.fixtures || state.allPlayersData.historical.fixtures;
    if (!fixtures) return 'N/A';
    
    const teamFixtures = fixtures
        .filter(fix => (fix.team_a === teamId || fix.team_h === teamId) && !fix.finished)
        .sort((a,b) => a.event - b.event)
        .slice(0, 5)
        .map(fix => {
            const opponentId = fix.team_h === teamId ? fix.team_a : fix.team_h;
            const opponent = state.teamsData[opponentId] ? state.teamsData[opponentId].short_name : 'N/A';
            const is_home = fix.team_h === teamId;
            const difficulty = is_home ? fix.team_h_difficulty : fix.team_a_difficulty;
            return `<span class="fixture fdr-${difficulty}" title="${opponent} (${is_home ? 'H' : 'A'})">${opponent}(${is_home ? 'H' : 'A'})</span>`;
        }).join(' ');

    return teamFixtures;
}

function processChange() {
    if (!state.allPlayersData[state.currentDataSource].processed) return;
    const nameFilter = document.getElementById('searchName').value.toLowerCase();
    const posFilter = document.getElementById('positionFilter').value;
    const teamFilter = document.getElementById('teamFilter').value;
    const priceInput = document.getElementById('priceRange').value;
    const pointsInput = document.getElementById('minPoints').value;
    const minutesInput = document.getElementById('minMinutes').value;
    const xDiffFilter = document.getElementById('xDiffFilter').value;
    const showEntries = document.getElementById('showEntries').value;
    const draftTeamFilter = document.getElementById('draftTeamFilter').value;

    let minPrice = 0, maxPrice = 20;
    if (priceInput) {
        const p = priceInput.split('-');
        if (p.length === 2) {
            minPrice = parseFloat(p[0]) || 0;
            maxPrice = parseFloat(p[1]) || 20;
        } else {
            const s = parseFloat(priceInput);
            if (!isNaN(s)) minPrice = maxPrice = s;
        }
    }

    const minPoints = parseInt(pointsInput) || 0;
    const minMinutes = parseInt(minutesInput) || 0;

    let filteredData = state.allPlayersData[state.currentDataSource].processed.filter(p => 
        (!nameFilter || p.web_name.toLowerCase().includes(nameFilter)) &&
        (!posFilter || p.position_name === posFilter) &&
        (!teamFilter || p.team_name === teamFilter) &&
        (p.now_cost >= minPrice && p.now_cost <= maxPrice) &&
        p.total_points >= minPoints &&
        p.minutes >= minMinutes &&
        (xDiffFilter === '' || (xDiffFilter === 'positive' && p.xDiff > 0) || (xDiffFilter === 'negative' && p.xDiff < 0))
    );

    if (draftTeamFilter) {
        if (draftTeamFilter === 'free_agents') {
            filteredData = filteredData.filter(p => !state.draft.ownedElementIds.has(p.id));
        } else {
            const entryId = parseInt(draftTeamFilter);
            if (state.draft.rostersByEntryId.has(entryId)) {
                const teamPlayerIds = new Set(state.draft.rostersByEntryId.get(entryId));
                filteredData = filteredData.filter(p => teamPlayerIds.has(p.id));
            }
        }
    }

    state.displayedData = filteredData;
    if (state.activeQuickFilterName) applyQuickFilter(state.activeQuickFilterName);
    if (showEntries !== 'all') state.displayedData = state.displayedData.slice(0, parseInt(showEntries));
    renderTable();
}

function applyQuickFilter(filterName) {
    const data = state.allPlayersData[state.currentDataSource].processed;
    switch(filterName) {
        case 'set_pieces':
            state.displayedData = state.displayedData.filter(p => p.set_piece_priority.penalty > 0 || p.set_piece_priority.corner > 0 || p.set_piece_priority.free_kick > 0);
            break;
        case 'attacking_defenders':
            state.displayedData = state.displayedData.filter(p => p.position_name === 'DEF' && p.minutes > 300).sort((a,b) => b.xGI_per90 - a.xGI_per90);
            break;
        case 'differentials':
            state.displayedData = state.displayedData.filter(p => parseFloat(p.selected_by_percent) < 5);
            break;
    }
}

function sortTable(columnIndex) {
    if (state.sortColumn === columnIndex) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        state.sortColumn = columnIndex;
        // Default to DESC for score/points columns (draft_score, xPts 1GW, total_points, etc.)
        if ([2, 3, 7, 8, 9, 10, 13, 14, 16, 17, 18, 19].includes(columnIndex)) {
            state.sortDirection = 'desc';
        } else {
            state.sortDirection = 'asc';
        }
    }
    
    document.querySelectorAll('#playersTable thead th').forEach((th, i) => {
        const indicator = th.querySelector('.sort-indicator');
        if (indicator) {
            indicator.textContent = '';
            if (i - 1 === columnIndex) {
                th.classList.add('sorted');
                indicator.textContent = state.sortDirection === 'desc' ? '▼' : '▲';
            } else {
                th.classList.remove('sorted');
            }
        }
    });
    
    renderTable();
}

function setActiveButton(button) {
    document.querySelectorAll('.control-button').forEach(btn => btn.classList.remove('active'));
    if (button) button.classList.add('active');
}

function showAllPlayers(button) {
    setActiveButton(button);
    state.activeQuickFilterName = null;
    ['searchName','positionFilter','teamFilter','priceRange','minPoints','xDiffFilter', 'draftTeamFilter'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    document.getElementById('minMinutes').value='30';
    document.getElementById('showEntries').value='all';
    processChange();
    sortTable(2);
}

function quickFilter(button, filterName) {
    setActiveButton(button);
    state.activeQuickFilterName = filterName;
    ['searchName','positionFilter','teamFilter','priceRange','minPoints','xDiffFilter'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('minMinutes').value='0';
    processChange();
    sortTable(2);
}

function exportToCsv() {
    const headers = ['Rank','Player','Draft Score','Stability','Prediction Score','Quality Score','xPts (4GW)','Team','Pos','Price','Pts','PPG','Sel %','DreamTeam','Net TF (GW)','DC/90','G+A','xGI','Mins','xDiff','ICT','Bonus','CS','Pen','Cor','FK'];
    let csvContent = headers.join(',') + '\n';
    
    state.displayedData.forEach((p, i) => {
        const row = [
            i + 1,
            p.web_name.replace(/,/g, ''),
            p.draft_score.toFixed(2),
            (p.stability_index || 0).toFixed(0),
            p.base_score.toFixed(2),
            p.quality_score.toFixed(2),
            (p.predicted_points_4_gw || 0).toFixed(2),
            p.team_name,
            p.position_name,
            p.now_cost,
            p.total_points,
            p.points_per_game_90.toFixed(2),
            p.selected_by_percent,
            p.dreamteam_count,
            p.net_transfers_event,
            p.def_contrib_per90.toFixed(2),
            (p.goals_scored || 0) + (p.assists || 0),
            (p.expected_goal_involvements || 0).toFixed(2),
            p.minutes,
            p.xDiff.toFixed(2),
            p.ict_index,
            p.bonus,
            p.clean_sheets,
            p.set_piece_priority.penalty,
            p.set_piece_priority.corner,
            p.set_piece_priority.free_kick,
        ];
        csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'fpl_players_data.csv';
    link.click();
}

function generateComparisonTableHTML(players) {
    // 🎨 ULTIMATE PLAYER COMPARISON - COMPLETE MAKEOVER
    
    const photoUrl = (p) => `https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.code}.png`;
    const fallbackSVG = (name) => `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22110%22 height=%22140%22%3E%3Crect fill=%22%2394a3b8%22 width=%22110%22 height=%22140%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23fff%22 font-size=%2248%22 font-weight=%22bold%22%3E${name.charAt(0)}%3C/text%3E%3C/svg%3E`;
    
    let html = `
        <div class="ultimate-comparison-container">
            <!-- 🏆 HEADER -->
            <div class="comparison-hero-header">
                <div class="hero-title-wrapper">
                    <span class="hero-icon">⚔️</span>
                    <h2 class="hero-title">השוואת שחקנים</h2>
                    <span class="hero-badge">${players.length} שחקנים</span>
                </div>
                <p class="hero-subtitle">ניתוח מקיף לקבלת החלטה מושכלת</p>
            </div>
            
            <!-- 👥 PLAYER CARDS GRID -->
            <div class="ultimate-players-grid">
    `;
    
    // Player Cards with enhanced stats
    players.forEach((p, idx) => {
        const positionColors = {
            'GKP': '#f59e0b',
            'DEF': '#3b82f6',
            'MID': '#10b981',
            'FWD': '#ef4444'
        };
        const posColor = positionColors[p.position_name] || '#6366f1';
        
        html += `
            <div class="ultimate-player-card" style="animation-delay: ${idx * 0.1}s; border-top: 4px solid ${posColor}">
                <div class="player-card-photo-wrapper">
                    <img src="${photoUrl(p)}" alt="${p.web_name}" class="player-card-photo-ultimate" onerror="this.src='${fallbackSVG(p.web_name)}'">
                    <div class="player-position-badge" style="background: ${posColor}">${p.position_name}</div>
                </div>
                <div class="player-card-info">
                    <h3 class="player-name-ultimate">${p.web_name}</h3>
                    <p class="player-team-ultimate">${p.team_name}</p>
                    
                    <!-- Quick Stats Grid -->
                    <div class="quick-stats-grid">
                        <div class="quick-stat">
                            <span class="quick-stat-icon">💰</span>
                            <div class="quick-stat-content">
                                <span class="quick-stat-label">מחיר</span>
                                <span class="quick-stat-value">£${p.now_cost.toFixed(1)}M</span>
                            </div>
                        </div>
                        <div class="quick-stat">
                            <span class="quick-stat-icon">⭐</span>
                            <div class="quick-stat-content">
                                <span class="quick-stat-label">ציון דראפט</span>
                                <span class="quick-stat-value">${p.draft_score.toFixed(1)}</span>
                            </div>
                        </div>
                        <div class="quick-stat">
                            <span class="quick-stat-icon">🎯</span>
                            <div class="quick-stat-content">
                                <span class="quick-stat-label">נק' כולל</span>
                                <span class="quick-stat-value">${p.total_points}</span>
                            </div>
                        </div>
                        <div class="quick-stat">
                            <span class="quick-stat-icon">🔥</span>
                            <div class="quick-stat-content">
                                <span class="quick-stat-label">כושר</span>
                                <span class="quick-stat-value">${parseFloat(p.form || 0).toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
            
            <!-- 📊 COMPREHENSIVE METRICS COMPARISON -->
            <div class="ultimate-metrics-section">
                <h3 class="metrics-section-title">
                    <span class="metrics-icon">📊</span>
                    השוואה מפורטת
                </h3>
                
                <div class="metrics-comparison-table">
    `;
    
    // Define comprehensive metrics (ordered by importance)
    const comprehensiveMetrics = [
        { name: 'ציון דראפט', key: 'draft_score', format: v => v.toFixed(1), icon: '⭐', reversed: false },
        { name: 'העברות נטו', key: 'net_transfers_event', format: v => (v >= 0 ? '+' : '') + v, icon: '🔄', reversed: false },
        { name: 'חיזוי למחזור הבא', key: 'predicted_points_1_gw', format: v => v.toFixed(1), icon: '🔮', reversed: false },
        { name: 'כושר', key: 'form', format: v => parseFloat(v || 0).toFixed(1), icon: '🔥', reversed: false },
        { name: 'נקודות/90', key: 'points_per_game_90', format: v => v.toFixed(1), icon: '📈', reversed: false },
        { name: 'נקודות כולל', key: 'total_points', format: v => v, icon: '🎯', reversed: false },
        { name: 'יציבות', key: 'stability_index', format: v => v.toFixed(0), icon: '📊', reversed: false },
        { name: 'xGI/90', key: 'xGI_per90', format: v => v.toFixed(2), icon: '⚽', reversed: false },
        { name: 'G+A', key: 'goals_scored_assists', format: v => v, icon: '🎯', reversed: false },
        { name: 'מחיר', key: 'now_cost', format: v => '£' + v.toFixed(1) + 'M', icon: '💰', reversed: true },
        { name: '% בעלות', key: 'selected_by_percent', format: v => v + '%', icon: '👥', reversed: false },
        { name: 'דקות', key: 'minutes', format: v => v.toLocaleString(), icon: '⏱️', reversed: false },
        { name: 'בונוס', key: 'bonus', format: v => v, icon: '⭐', reversed: false },
        { name: 'דרימטים', key: 'dreamteam_count', format: v => v, icon: '🏆', reversed: false },
        { name: 'ICT Index', key: 'ict_index', format: v => v.toFixed(1), icon: '🧬', reversed: false },
        { name: 'DC/90', key: 'def_contrib_per90', format: v => v.toFixed(1), icon: '🛡️', reversed: false },
        { name: 'xDiff', key: 'xDiff', format: v => (v >= 0 ? '+' : '') + v.toFixed(2), icon: '📉', reversed: false },
        { name: 'CS', key: 'clean_sheets', format: v => v, icon: '🧤', reversed: false },
    ];
    
    comprehensiveMetrics.forEach((metric, idx) => {
        const values = players.map(p => {
            let val = getNestedValue(p, metric.key);
            if (metric.key === 'goals_scored_assists') {
                val = (p.goals_scored || 0) + (p.assists || 0);
            }
            return typeof val === 'number' ? val : parseFloat(val) || 0;
        });
        
        const maxVal = Math.max(...values);
        const minVal = Math.min(...values);
        
        html += `
            <div class="metric-comparison-row" style="animation-delay: ${idx * 0.03}s">
                <div class="metric-row-label">
                    <span class="metric-row-icon">${metric.icon}</span>
                    <span class="metric-row-name">${metric.name}</span>
                </div>
                <div class="metric-row-values">
        `;
        
        players.forEach((p, pIdx) => {
            const value = values[pIdx];
            const isBest = metric.reversed ? (value === minVal) : (value === maxVal);
            const isWorst = metric.reversed ? (value === maxVal) : (value === minVal);
            const percentage = maxVal > minVal ? ((value - minVal) / (maxVal - minVal) * 100) : 50;
            
            html += `
                <div class="metric-value-box ${isBest ? 'best-value' : ''} ${isWorst ? 'worst-value' : ''}">
                    <div class="metric-value-number">${metric.format(value)}</div>
                    <div class="metric-value-bar-container">
                        <div class="metric-value-bar" style="width: ${percentage}%"></div>
                    </div>
                    ${isBest ? '<span class="best-badge">🏆</span>' : ''}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    // Fixtures Row
    html += `
            <div class="metric-comparison-row fixtures-comparison-row">
                <div class="metric-row-label">
                    <span class="metric-row-icon">📅</span>
                    <span class="metric-row-name">משחקים קרובים</span>
                </div>
                <div class="metric-row-values">
    `;
    
    players.forEach(p => {
        const fixturesHTML = generateFixturesHTML(p);
        html += `
            <div class="metric-value-box fixtures-box">
                ${fixturesHTML || '<span class="no-fixtures">אין נתונים</span>'}
            </div>
        `;
    });
    
    html += `
                </div>
            </div>
        </div>
    </div>
</div>
    `;
    
    return html;
}

function compareSelectedPlayers() {
    if (state.selectedForComparison.size < 2) {
        showToast('בחר שחקנים', 'יש לבחור לפחות שני שחקנים להשוואה', 'warning', 3000);
        return;
    }
    const players = state.allPlayersData[state.currentDataSource].processed.filter(p => state.selectedForComparison.has(p.id));
    const contentDiv = document.getElementById('compareContent');
    
    const tableHTML = generateComparisonTableHTML(players);

    contentDiv.innerHTML = tableHTML;
    document.getElementById('compareModal').style.display = 'block';
}

function getMetricValueClass(value, values, reversed) {
    const numericValues = values.filter(v => typeof v === 'number');
    if (numericValues.length < 2) return '';
    const max = Math.max(...numericValues);
    const min = Math.min(...numericValues);
    if (value === (reversed ? min : max)) return 'metric-value-best';
    if (value === (reversed ? max : min)) return 'metric-value-worst';
    return 'metric-value-mid';
}

// Radar chart removed - not needed for the new comparison design

function closeModal() {
    document.getElementById('compareModal').style.display = 'none';
    document.getElementById('visualizationModal').style.display = 'none';
    if(charts.visualization){charts.visualization.destroy();charts.visualization=null;}
}

// ============================================
// ADVANCED SEARCH & FILTERS
// ============================================

function handleSearch() {
    const query = document.getElementById('playerSearch').value.toLowerCase();
    state.searchQuery = query;
    applyFilters();
}

function clearSearch() {
    document.getElementById('playerSearch').value = '';
    state.searchQuery = '';
    applyFilters();
}

function updatePriceFilter() {
    const minEl = document.getElementById('priceMin');
    const maxEl = document.getElementById('priceMax');
    
    let min = parseFloat(minEl.value);
    let max = parseFloat(maxEl.value);
    
    // Ensure min <= max
    if (min > max) {
        [min, max] = [max, min];
        minEl.value = min;
        maxEl.value = max;
    }
    
    state.priceRange = { min, max };
    
    document.getElementById('priceMinVal').textContent = min.toFixed(1);
    document.getElementById('priceMaxVal').textContent = max.toFixed(1);
    
    applyFilters();
}

function applyFilters() {
    const select = document.getElementById('teamMultiSelect');
    if (!select) return;
    
    state.selectedTeams = Array.from(select.selectedOptions).map(opt => opt.value);
    
    let filtered = state.allPlayersData[state.currentDataSource].processed;
    
    // Search query
    if (state.searchQuery) {
        filtered = filtered.filter(p => 
            p.web_name.toLowerCase().includes(state.searchQuery) ||
            p.team_name.toLowerCase().includes(state.searchQuery) ||
            p.now_cost.toString().includes(state.searchQuery)
        );
    }
    
    // Price range
    filtered = filtered.filter(p => 
        p.now_cost >= state.priceRange.min && 
        p.now_cost <= state.priceRange.max
    );
    
    // Selected teams
    if (state.selectedTeams.length > 0) {
        filtered = filtered.filter(p => state.selectedTeams.includes(p.team_name));
    }
    
    state.displayedData = filtered;
    renderTable();
    
    // Show results count
    showToast('תוצאות', `נמצאו ${filtered.length} שחקנים`, 'info', 2000);
}

function resetAllFilters() {
    // Reset search
    document.getElementById('playerSearch').value = '';
    state.searchQuery = '';
    
    // Reset price
    document.getElementById('priceMin').value = 4;
    document.getElementById('priceMax').value = 15;
    state.priceRange = { min: 4, max: 15 };
    document.getElementById('priceMinVal').textContent = '4.0';
    document.getElementById('priceMaxVal').textContent = '15.0';
    
    // Reset teams
    const select = document.getElementById('teamMultiSelect');
    if (select) {
        Array.from(select.options).forEach(opt => opt.selected = false);
    }
    state.selectedTeams = [];
    
    // Reset quick filters
    state.activeQuickFilterName = null;
    document.querySelectorAll('.control-button[data-filter-name]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show all data
    state.displayedData = state.allPlayersData[state.currentDataSource].processed;
    renderTable();
    
    showToast('אופס', 'כל הפילטרים אופסו', 'success', 2000);
}

function saveFilters() {
    const filters = {
        searchQuery: state.searchQuery,
        priceRange: state.priceRange,
        selectedTeams: state.selectedTeams
    };
    
    localStorage.setItem('fpl_saved_filters', JSON.stringify(filters));
    showToast('נשמר', 'העדפות הפילטרים נשמרו בהצלחה', 'success', 3000);
}

function loadSavedFilters() {
    const saved = localStorage.getItem('fpl_saved_filters');
    if (!saved) return;
    
    try {
        const filters = JSON.parse(saved);
        
        // Restore search
        if (filters.searchQuery) {
            const searchEl = document.getElementById('playerSearch');
            if (searchEl) {
                searchEl.value = filters.searchQuery;
                state.searchQuery = filters.searchQuery;
            }
        }
        
        // Restore price
        if (filters.priceRange) {
            const minEl = document.getElementById('priceMin');
            const maxEl = document.getElementById('priceMax');
            const minValEl = document.getElementById('priceMinVal');
            const maxValEl = document.getElementById('priceMaxVal');
            
            if (minEl && maxEl) {
                minEl.value = filters.priceRange.min;
                maxEl.value = filters.priceRange.max;
                state.priceRange = filters.priceRange;
                if (minValEl) minValEl.textContent = filters.priceRange.min.toFixed(1);
                if (maxValEl) maxValEl.textContent = filters.priceRange.max.toFixed(1);
            }
        }
        
        // Restore teams
        if (filters.selectedTeams && filters.selectedTeams.length > 0) {
            const select = document.getElementById('teamMultiSelect');
            if (select) {
                filters.selectedTeams.forEach(team => {
                    const option = Array.from(select.options).find(opt => opt.value === team);
                    if (option) option.selected = true;
                });
                state.selectedTeams = filters.selectedTeams;
            }
        }
        
        showToast('טעינה', 'העדפות הפילטרים נטענו', 'info', 2000);
    } catch (e) {
        console.error('Failed to load saved filters:', e);
    }
}

function populateTeamSelect() {
    const select = document.getElementById('teamMultiSelect');
    if (!select) return;
    
    const teams = [...new Set(state.allPlayersData[state.currentDataSource].processed.map(p => p.team_name))].sort();
    
    select.innerHTML = teams.map(team => `<option value="${team}">${team}</option>`).join('');
}

// ============================================
// EXPORT TO CSV
// ============================================

function exportToCsv() {
    const data = state.displayedData;
    if (!data || data.length === 0) {
        showToast('אין נתונים', 'אין נתונים לייצוא', 'warning', 3000);
        return;
    }
    
    // Define columns to export (all table columns)
    const columns = [
        { key: 'web_name', header: 'שם' },
        { key: 'draft_score', header: 'ציון דראפט' },
        { key: 'stability_index', header: 'יציבות' },
        { key: 'predicted_points_1_gw', header: 'חיזוי טכני' },
        { key: 'ml_prediction', header: 'ML חיזוי' },
        { key: 'team_name', header: 'קבוצה' },
        { key: 'draft_team', header: 'קבוצת דראפט', format: (player) => getDraftTeamForPlayer(player.id) || 'חופשי' },
        { key: 'position_name', header: 'עמדה' },
        { key: 'now_cost', header: 'מחיר' },
        { key: 'total_points', header: 'נקודות' },
        { key: 'points_per_game_90', header: 'נק/משחק' },
        { key: 'selected_by_percent', header: 'בחירה %' },
        { key: 'dreamteam_count', header: 'DreamTeam' },
        { key: 'net_transfers_event', header: 'העברות' },
        { key: 'def_contrib_per90', header: 'DC/90' },
        { key: 'goals_scored_assists', header: 'G+A', format: (player) => (player.goals_scored || 0) + (player.assists || 0) },
        { key: 'expected_goals_assists', header: 'xG+xA', format: (player) => parseFloat(player.expected_goal_involvements || 0).toFixed(2) },
        { key: 'minutes', header: 'דקות' },
        { key: 'xDiff', header: 'xDiff' },
        { key: 'ict_index', header: 'ICT' },
        { key: 'bonus', header: 'Bonus' },
        { key: 'clean_sheets', header: 'CS' },
        { key: 'penalty_priority', header: 'פנדל', format: (player) => player.set_piece_priority?.penalty === 1 ? 'כן' : 'לא' },
        { key: 'corner_priority', header: 'קרן', format: (player) => player.set_piece_priority?.corner || 0 },
        { key: 'free_kick_priority', header: 'בעיטה חופשית', format: (player) => player.set_piece_priority?.free_kick || 0 }
    ];
    
    // Create CSV header
    const csvHeader = columns.map(col => col.header).join(',');
    
    // Create CSV rows
    const csvRows = data.map(player => {
        return columns.map(col => {
            // Use custom format function if provided
            let value;
            if (col.format && typeof col.format === 'function') {
                value = col.format(player);
            } else {
                value = player[col.key];
            }
            
            // Format numbers
            if (typeof value === 'number') {
                value = value.toFixed(2);
            }
            
            // Handle undefined/null
            if (value === undefined || value === null) {
                value = '';
            }
            
            // Convert to string
            value = String(value);
            
            // Escape commas and quotes
            value = value.replace(/"/g, '""');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = `"${value}"`;
            }
            
            return value;
        }).join(',');
    });
    
    // Combine header and rows
    const csv = [csvHeader, ...csvRows].join('\n');
    
    // Add BOM for Hebrew support in Excel
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csv;
    
    // Create blob and download
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `FPL_Players_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('הורדה הושלמה', `${data.length} שחקנים יוצאו בהצלחה`, 'success', 3000);
}

// ============================================
// DASHBOARD KPIs
// ============================================

function updateDashboardKPIs(dataToUse = null) {
    // Use filtered/displayed data if available, otherwise use all processed data
    const data = dataToUse || state.displayedData || state.allPlayersData[state.currentDataSource].processed;
    if (!data || data.length === 0) {
        // Show "no data" state
        document.getElementById('kpiHotPlayer').textContent = '-';
        document.getElementById('kpiHotPlayerForm').textContent = 'אין נתונים';
        document.getElementById('kpiBestDraft').textContent = '-';
        document.getElementById('kpiBestDraftScore').textContent = 'אין נתונים';
        document.getElementById('kpiTopScorer').textContent = '-';
        document.getElementById('kpiTopScorerGoals').textContent = 'אין נתונים';
        document.getElementById('kpiTopAssister').textContent = '-';
        document.getElementById('kpiTopAssisterAssists').textContent = 'אין נתונים';
        document.getElementById('kpiTopPoints').textContent = '-';
        document.getElementById('kpiTopPointsValue').textContent = 'אין נתונים';
        document.getElementById('kpiBestValue').textContent = '-';
        document.getElementById('kpiBestValueRatio').textContent = 'אין נתונים';
        return;
    }
    
    // Hot player (best form - last 5 games average)
    const withMinutes = data.filter(p => p.minutes > 450);
    if (withMinutes.length > 0) {
        const hotPlayer = withMinutes.reduce((max, p) => {
            const form = parseFloat(p.form) || 0;
            const maxForm = parseFloat(max.form) || 0;
            return form > maxForm ? p : max;
        }, withMinutes[0]);
        
        document.getElementById('kpiHotPlayer').textContent = hotPlayer.web_name;
        document.getElementById('kpiHotPlayerForm').textContent = `כושר: ${parseFloat(hotPlayer.form).toFixed(1)} נק'/משחק`;
    }
    
    // Best draft score
    const bestDraft = data.reduce((max, p) => p.draft_score > max.draft_score ? p : max, data[0]);
    document.getElementById('kpiBestDraft').textContent = bestDraft.web_name;
    document.getElementById('kpiBestDraftScore').textContent = `ציון: ${bestDraft.draft_score.toFixed(1)}`;
    
    // Top scorer
    const topScorer = data.reduce((max, p) => p.goals_scored > max.goals_scored ? p : max, data[0]);
    document.getElementById('kpiTopScorer').textContent = topScorer.web_name;
    document.getElementById('kpiTopScorerGoals').textContent = `${topScorer.goals_scored} שערים`;
    
    // Top assister
    const topAssister = data.reduce((max, p) => p.assists > max.assists ? p : max, data[0]);
    document.getElementById('kpiTopAssister').textContent = topAssister.web_name;
    document.getElementById('kpiTopAssisterAssists').textContent = `${topAssister.assists} בישולים`;
    
    // Top points
    const topPoints = data.reduce((max, p) => p.total_points > max.total_points ? p : max, data[0]);
    document.getElementById('kpiTopPoints').textContent = topPoints.web_name;
    document.getElementById('kpiTopPointsValue').textContent = `${topPoints.total_points} נקודות`;
    
    // Best value (points per million)
    const withValue = data.filter(p => p.now_cost > 0 && p.total_points > 0);
    if (withValue.length > 0) {
        const bestValue = withValue.reduce((max, p) => {
            const ratio = p.total_points / p.now_cost;
            const maxRatio = max.total_points / max.now_cost;
            return ratio > maxRatio ? p : max;
        }, withValue[0]);
        
        const ratio = (bestValue.total_points / bestValue.now_cost).toFixed(1);
        document.getElementById('kpiBestValue').textContent = bestValue.web_name;
        document.getElementById('kpiBestValueRatio').textContent = `${ratio} נק'/M`;
    }
}

function getNestedValue(obj, path) {
    if (!path) return obj;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function showVisualization(type) {
    if (!state.allPlayersData[state.currentDataSource].processed) {
        showToast('המתן', 'יש להמתין לטעינת הנתונים', 'warning', 3000);
        return;
    }
    const specMap = config.visualizationSpecs;

    const spec = specMap[type];
    if (!spec) {
        console.error(`Visualization spec not found for type: ${type}`);
        showToast('שגיאה', 'סוג ויזואליזציה לא נמצא', 'error', 3000);
        return;
    }
    
    document.getElementById('visualizationTitle').textContent = spec.title;
    
    // If user filtered data, show all filtered players. Otherwise, filter by minutes
    const isFiltered = state.displayedData.length < state.allPlayersData[state.currentDataSource].processed.length;
    const players = isFiltered 
        ? state.displayedData.filter(p => spec.pos.includes(p.position_name))
        : state.displayedData.filter(p => spec.pos.includes(p.position_name) && p.minutes > 300);
    if(players.length < 2) {
        showToast('אין מספיק נתונים', `לא נמצאו מספיק שחקנים (${spec.pos.join('/')}) להשוואה`, 'warning', 4000);
        return;
    }
    
    const chartConfig = getChartConfig(players, spec.x, spec.y, spec.xLabel, spec.yLabel, spec.quadLabels);
    const ctx = document.getElementById('visualizationChart').getContext('2d');
    if (charts.visualization) charts.visualization.destroy();
    charts.visualization = new Chart(ctx, chartConfig);
    document.getElementById('visualizationModal').style.display = 'block';
}

function showTeamDefenseChart() {
    if (!state.allPlayersData[state.currentDataSource].processed) {
        showToast('המתן', 'יש להמתין לטעינת הנתונים', 'warning', 3000);
        return;
    }
    document.getElementById('visualizationTitle').textContent = 'הגנת קבוצות (צפוי ספיגות מול ספיגות בפועל)';
    
    // Use filtered data if available, otherwise use all data
    const dataToUse = state.displayedData || state.allPlayersData[state.currentDataSource].processed;
    
    const teamStats = {};
    dataToUse.forEach(p => {
        if (!teamStats[p.team_name]) teamStats[p.team_name] = { xGC: 0, GC: 0, minutes: 0 };
        teamStats[p.team_name].xGC += parseFloat(p.expected_goals_conceded) || 0;
        teamStats[p.team_name].GC += p.goals_conceded || 0;
        if (p.element_type === 1 || p.element_type === 2) { // GKP or DEF
             teamStats[p.team_name].minutes += p.minutes;
        }
    });

    const dataPoints = Object.entries(teamStats).map(([team, stats]) => {
        const gamesPlayed = stats.minutes > 0 ? (stats.minutes / 90) / 11 : 0;
        return {
            x: gamesPlayed > 0 ? stats.xGC / gamesPlayed : 0,
            y: gamesPlayed > 0 ? stats.GC / gamesPlayed : 0,
            team: team
        };
    }).filter(d => d.x > 0 || d.y > 0);
    
    const quadLabels = {topRight: 'הגנה חלשה', topLeft: 'חוסר מזל', bottomRight: 'בר מזל', bottomLeft: 'הגנת ברזל'};
    const getPointColor = (c) => { const {x, y} = c.raw; return y > x ? 'rgba(255, 99, 132, 0.7)' : 'rgba(75, 192, 192, 0.7)'; };
    const config = getChartConfig(dataPoints, 'x', 'y', 'צפי ספיגות / 90 (xGC) - שמאלה זה טוב', 'ספיגות בפועל / 90 - למטה זה טוב', quadLabels, getPointColor, (v) => v.team);

    const ctx = document.getElementById('visualizationChart').getContext('2d');
    if (charts.visualization) charts.visualization.destroy();
    charts.visualization = new Chart(ctx, config);
    document.getElementById('visualizationModal').style.display = 'block';
}

function showTeamAttackChart() {
    if (!state.allPlayersData[state.currentDataSource].processed) {
        showToast('המתן', 'יש להמתין לטעינת הנתונים', 'warning', 3000);
        return;
    }
    document.getElementById('visualizationTitle').textContent = 'התקפת קבוצות (צפי מעורבות בשערים מול מעורבות בפועל)';
    
    // Use filtered data if available, otherwise use all data
    const dataToUse = state.displayedData || state.allPlayersData[state.currentDataSource].processed;
    
    const teamStats = {};
    dataToUse.forEach(p => {
        if (!teamStats[p.team_name]) teamStats[p.team_name] = { xGI: 0, GI: 0, minutes: 0 };
        teamStats[p.team_name].xGI += parseFloat(p.expected_goal_involvements) || 0;
        teamStats[p.team_name].GI += (p.goals_scored || 0) + (p.assists || 0);
        if (p.element_type === 3 || p.element_type === 4) { // MID or FWD
             teamStats[p.team_name].minutes += p.minutes;
        }
    });

    const dataPoints = Object.entries(teamStats).map(([team, stats]) => {
        const gamesPlayed = stats.minutes > 0 ? (stats.minutes / 90) / 11 : 0;
        return {
            x: gamesPlayed > 0 ? stats.xGI / gamesPlayed : 0,
            y: gamesPlayed > 0 ? stats.GI / gamesPlayed : 0,
            team: team
        };
    }).filter(d => d.x > 0 || d.y > 0);

    const quadLabels = {topRight: 'התקפה קטלנית', topLeft: 'חוסר מימוש', bottomRight: 'מימוש יתר', bottomLeft: 'התקפה חלשה'};
    const getPointColor = (c) => { const {x, y} = c.raw; return y > x ? 'rgba(75, 192, 192, 0.7)' : 'rgba(255, 99, 132, 0.7)'; };
    const config = getChartConfig(dataPoints, 'x', 'y', 'צפי מעורבות בשערים / 90 (xGI) - ימינה זה טוב', 'שערים+בישולים / 90 - למעלה זה טוב', quadLabels, getPointColor, (v) => v.team);

    const ctx = document.getElementById('visualizationChart').getContext('2d');
    if (charts.visualization) charts.visualization.destroy();
    charts.visualization = new Chart(ctx, config);
    document.getElementById('visualizationModal').style.display = 'block';
}

function showPriceVsScoreChart() {
    if (!state.allPlayersData[state.currentDataSource].processed) {
        showToast('המתן', 'יש להמתין לטעינת הנתונים', 'warning', 3000);
        return;
    }
    document.getElementById('visualizationTitle').textContent = 'תמורה למחיר (ציון דראפט מול מחיר)';
    
    // If user filtered data, show all filtered players. Otherwise, filter by minutes
    const isFiltered = state.displayedData.length < state.allPlayersData[state.currentDataSource].processed.length;
    const players = isFiltered ? state.displayedData : state.displayedData.filter(p => p.minutes > 300);
    if(players.length < 2) {
        showToast('אין מספיק נתונים', 'לא נמצאו מספיק שחקנים להשוואה', 'warning', 3000);
        return;
    }
    
    const dataPoints=players.map(p=>({x:p.now_cost,y:p.draft_score,player:p.web_name,team:p.team_name,pos:p.position_name}));
    const colorMap={DEF:'rgba(100,149,237,0.7)',MID:'rgba(60,179,113,0.7)',FWD:'rgba(255,99,132,0.7)',GKP:'rgba(255,159,64,0.7)'};
    const ctx = document.getElementById('visualizationChart').getContext('2d');
    if (charts.visualization) charts.visualization.destroy();
    charts.visualization = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Players',
                data: dataPoints,
                backgroundColor: dataPoints.map(p => colorMap[p.pos])
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: { display: false },
                tooltip:{callbacks:{label: c => {const p = c.raw; return `${p.player} (${p.team}): ציון ${p.y.toFixed(1)} ב-${p.x.toFixed(1)}M`} }}
            },
            scales: {
                x: { title: { display: true, text: 'מחיר' } },
                y: { title: { display: true, text: 'ציון דראפט' } }
            }
        }
    });
    document.getElementById('visualizationModal').style.display = 'block';
}

function showIctBreakdownChart() {
    if (!state.allPlayersData[state.currentDataSource].processed) {
        showToast('המתן', 'יש להמתין לטעינת הנתונים', 'warning', 3000);
        return;
    }
    
    // If user filtered data, show all filtered players. Otherwise, filter by minutes
    const isFiltered = state.displayedData.length < state.allPlayersData[state.currentDataSource].processed.length;
    const filteredPlayers = isFiltered ? state.displayedData : state.displayedData.filter(p => p.minutes > 300);
    const topPlayers = filteredPlayers.sort((a,b) => b.ict_index - a.ict_index).slice(0, 15);
    if(topPlayers.length < 2) {
        showToast('אין מספיק נתונים', 'לא נמצאו מספיק שחקנים להשוואה', 'warning', 3000);
        return;
    }
    document.getElementById('visualizationTitle').textContent = 'פרופיל שחקן (פירוק ICT)';
    
    const chartData = {
        labels: topPlayers.map(p => p.web_name),
        datasets: [
            { label: 'השפעה (Influence)', data: topPlayers.map(p => parseFloat(p.influence)), backgroundColor: 'rgba(54, 162, 235, 0.7)' },
            { label: 'יצירתיות (Creativity)', data: topPlayers.map(p => parseFloat(p.creativity)), backgroundColor: 'rgba(75, 192, 192, 0.7)' },
            { label: 'איום (Threat)', data: topPlayers.map(p => parseFloat(p.threat)), backgroundColor: 'rgba(255, 99, 132, 0.7)' }
        ]
    };
    
    const ctx = document.getElementById('visualizationChart').getContext('2d');
    if (charts.visualization) charts.visualization.destroy();
    charts.visualization = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true } },
            plugins: { legend: { position: 'bottom' } }
        }
    });
    document.getElementById('visualizationModal').style.display = 'block';
}

function getMatrixChartConfig(data, xLabel, yLabel, quadLabels = {}) {
    const dataPoints = data.map(d => ({ x: d.x, y: d.y, team: d.team }));
    const xValues = dataPoints.map(p => p.x);
    const yValues = dataPoints.map(p => p.y);
    const xMedian = xValues.sort((a,b) => a-b)[Math.floor(xValues.length / 2)];
    const yMedian = yValues.sort((a,b) => a-b)[Math.floor(yValues.length / 2)];
    
    // Color function based on quadrant - Green (top-right), Red (bottom-left), Orange (others)
    const getPointColor = (point) => {
        if (point.x >= xMedian && point.y >= yMedian) {
            return 'rgba(34, 197, 94, 0.85)'; // Green - Best
        } else if (point.x < xMedian && point.y < yMedian) {
            return 'rgba(239, 68, 68, 0.85)'; // Red - Worst
        } else {
            return 'rgba(251, 146, 60, 0.85)'; // Orange - Medium
        }
    };

    return {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Teams',
                data: dataPoints,
                pointRadius: 6,
                pointHoverRadius: 9,
                pointBorderWidth: 2,
                pointBorderColor: 'rgba(255, 255, 255, 0.9)',
                backgroundColor: (context) => {
                    if (!context.raw) return 'rgba(156, 163, 175, 0.7)';
                    return getPointColor(context.raw);
                },
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 30, right: 20, bottom: 10, left: 10 }
            },
            scales: {
                x: { 
                    title: { 
                        display: true, 
                        text: xLabel, 
                        font: { size: 13.8, weight: '700' },
                        color: '#475569'
                    },
                    ticks: {
                        font: { size: 11.5, weight: '600' },
                        color: '#64748b'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: { 
                    title: { 
                        display: true, 
                        text: yLabel, 
                        font: { size: 13.8, weight: '700' },
                        color: '#475569'
                    },
                    ticks: {
                        font: { size: 11.5, weight: '600' },
                        color: '#64748b'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(2, 132, 199, 0.5)',
                    borderWidth: 2,
                    padding: 12,
                    displayColors: false,
                    titleFont: { size: 15, weight: '700' },
                    bodyFont: { size: 13.8 },
                    callbacks: {
                        label: function(context) {
                            const d = context.raw;
                            return `${d.team}: (${d.x.toFixed(2)}, ${d.y.toFixed(2)})`;
                        },
                        title: function() { return ''; }
                    }
                },
                datalabels: {
                    display: true,
                    align: 'top',
                    offset: 4,
                    color: '#1e293b',
                    font: { size: 9.7, weight: '700' },
                    backgroundColor: null,
                    borderWidth: 0,
                    formatter: (value, context) => {
                        return context.dataset.data[context.dataIndex].team || '';
                    },
                },
                annotation: {
                    annotations: {
                        xLine: { 
                            type: 'line', 
                            xMin: xMedian, 
                            xMax: xMedian, 
                            borderColor: 'rgba(0,0,0,0.2)', 
                            borderWidth: 2, 
                            borderDash: [6, 6] 
                        },
                        yLine: { 
                            type: 'line', 
                            yMin: yMedian, 
                            yMax: yMedian, 
                            borderColor: 'rgba(0,0,0,0.2)', 
                            borderWidth: 2, 
                            borderDash: [6, 6] 
                        },
                        ...(quadLabels.topRight && {
                            topRight: { 
                                type: 'label', 
                                xValue: xMedian * 1.01, 
                                yValue: yMedian * 1.01, 
                                content: quadLabels.topRight, 
                                position: 'start', 
                                xAdjust: 6, 
                                yAdjust: -6, 
                                font: { size: 10.4, weight: '700' }, 
                                color: 'rgba(34, 197, 94, 0.8)',
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                borderRadius: 3,
                                padding: 4
                            }
                        }),
                        ...(quadLabels.topLeft && {
                            topLeft: { 
                                type: 'label', 
                                xValue: xMedian * 0.99, 
                                yValue: yMedian * 1.01, 
                                content: quadLabels.topLeft, 
                                position: 'end', 
                                xAdjust: -6, 
                                yAdjust: -6, 
                                font: { size: 10.4, weight: '700' }, 
                                color: 'rgba(251, 146, 60, 0.8)',
                                backgroundColor: 'rgba(251, 146, 60, 0.1)',
                                borderRadius: 3,
                                padding: 4
                            }
                        }),
                        ...(quadLabels.bottomRight && {
                            bottomRight: { 
                                type: 'label', 
                                xValue: xMedian * 1.01, 
                                yValue: yMedian * 0.99, 
                                content: quadLabels.bottomRight, 
                                position: 'start', 
                                xAdjust: 6, 
                                yAdjust: 6, 
                                font: { size: 10.4, weight: '700' }, 
                                color: 'rgba(251, 146, 60, 0.8)',
                                backgroundColor: 'rgba(251, 146, 60, 0.1)',
                                borderRadius: 3,
                                padding: 4
                            }
                        }),
                        ...(quadLabels.bottomLeft && {
                            bottomLeft: { 
                                type: 'label', 
                                xValue: xMedian * 0.99, 
                                yValue: yMedian * 0.99, 
                                content: quadLabels.bottomLeft, 
                                position: 'end', 
                                xAdjust: -6, 
                                yAdjust: 6, 
                                font: { size: 10.4, weight: '700' }, 
                                color: 'rgba(239, 68, 68, 0.8)',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: 3,
                                padding: 4
                            }
                        })
                    }
                }
            }
        }
    };
}

function getChartConfig(data, xKey, yKey, xLabel, yLabel, quadLabels = {}, colorFunc = null, dataLabelFunc = null) {
    const dataPoints = data.map(d => ({ x: getNestedValue(d, xKey), y: getNestedValue(d, yKey), ...d }));
    const xValues = dataPoints.map(p => p.x);
    const yValues = dataPoints.map(p => p.y);
    const xMedian = xValues.sort((a,b) => a-b)[Math.floor(xValues.length / 2)];
    const yMedian = yValues.sort((a,b) => a-b)[Math.floor(yValues.length / 2)];

    return {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Players',
                data: dataPoints,
                pointRadius: 6,
                pointHoverRadius: 9,
                pointBorderWidth: 2,
                pointBorderColor: 'rgba(255, 255, 255, 0.9)',
                backgroundColor: colorFunc ? colorFunc : (context) => {
                    if (!context.raw) return 'rgba(156, 163, 175, 0.7)';
                    const point = context.raw;
                    if (point.x >= xMedian && point.y >= yMedian) {
                        return 'rgba(34, 197, 94, 0.85)'; // Green - Best
                    } else if (point.x < xMedian && point.y < yMedian) {
                        return 'rgba(239, 68, 68, 0.85)'; // Red - Worst
        } else {
                        return 'rgba(251, 146, 60, 0.85)'; // Orange - Medium
                    }
                },
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 30, right: 20, bottom: 10, left: 10 }
            },
            scales: {
                x: { 
                    title: { 
                        display: true, 
                        text: xLabel, 
                        font: { size: 13.8, weight: '700' },
                        color: '#475569'
                    },
                    ticks: {
                        font: { size: 11.5, weight: '600' },
                        color: '#64748b'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: { 
                    title: { 
                        display: true, 
                        text: yLabel, 
                        font: { size: 13.8, weight: '700' },
                        color: '#475569'
                    },
                    ticks: {
                        font: { size: 11.5, weight: '600' },
                        color: '#64748b'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(2, 132, 199, 0.5)',
                    borderWidth: 2,
                    padding: 16,
                    displayColors: false,
                    titleFont: { size: 15, weight: '700' },
                    bodyFont: { size: 13.8 },
                    footerFont: { size: 14 },
                    callbacks: {
                        label: function(context) {
                            const d = context.raw;
                            const name = d.web_name || d.player || d.team || 'Point';
                            return `${name}: (${d.x.toFixed(2)}, ${d.y.toFixed(2)})`;
                        },
                        title: function(context) {
                            return ''; // Hide default title
                        },
                        footer: function(context) {
                            const d = context[0].raw;
                            if (d.position_name || d.pos) {
                                 return `Position: ${d.position_name || d.pos}`;
                            }
                            if (d.team_name) {
                                return `Team: ${d.team_name}`;
                            }
                            return '';
                        }
                    }
                },
                datalabels: {
                    display: true,
                    align: 'top',
                    offset: 4,
                    color: '#1e293b',
                    font: { size: 9.7, weight: '700' },
                    backgroundColor: null,
                    borderWidth: 0,
                    formatter: (value, context) => {
                        const dataPoint = context.dataset.data[context.dataIndex];
                        if (dataLabelFunc) {
                            return dataLabelFunc(dataPoint);
                        }
                        // Return player name (web_name) or team name
                        return dataPoint.web_name || dataPoint.player || dataPoint.team || '';
                    },
                },
                annotation: {
                    annotations: {
                        xLine: { 
                            type: 'line', 
                            xMin: xMedian, 
                            xMax: xMedian, 
                            borderColor: 'rgba(0,0,0,0.2)', 
                            borderWidth: 2, 
                            borderDash: [6, 6] 
                        },
                        yLine: { 
                            type: 'line', 
                            yMin: yMedian, 
                            yMax: yMedian, 
                            borderColor: 'rgba(0,0,0,0.2)', 
                            borderWidth: 2, 
                            borderDash: [6, 6] 
                        },
                        ...(quadLabels.topRight && {
                            topRight: { 
                                type: 'label', 
                                xValue: xMedian * 1.01, 
                                yValue: yMedian * 1.01, 
                                content: quadLabels.topRight, 
                                position: 'start', 
                                xAdjust: 6, 
                                yAdjust: -6, 
                                font: { size: 10.4, weight: '700' }, 
                                color: 'rgba(34, 197, 94, 0.8)',
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                borderRadius: 3,
                                padding: 4
                            }
                        }),
                        ...(quadLabels.topLeft && {
                            topLeft: { 
                                type: 'label', 
                                xValue: xMedian * 0.99, 
                                yValue: yMedian * 1.01, 
                                content: quadLabels.topLeft, 
                                position: 'end', 
                                xAdjust: -6, 
                                yAdjust: -6, 
                                font: { size: 10.4, weight: '700' }, 
                                color: 'rgba(251, 146, 60, 0.8)',
                                backgroundColor: 'rgba(251, 146, 60, 0.1)',
                                borderRadius: 3,
                                padding: 4
                            }
                        }),
                        ...(quadLabels.bottomRight && {
                            bottomRight: { 
                                type: 'label', 
                                xValue: xMedian * 1.01, 
                                yValue: yMedian * 0.99, 
                                content: quadLabels.bottomRight, 
                                position: 'start', 
                                xAdjust: 6, 
                                yAdjust: 6, 
                                font: { size: 10.4, weight: '700' }, 
                                color: 'rgba(251, 146, 60, 0.8)',
                                backgroundColor: 'rgba(251, 146, 60, 0.1)',
                                borderRadius: 3,
                                padding: 4
                            }
                        }),
                        ...(quadLabels.bottomLeft && {
                            bottomLeft: { 
                                type: 'label', 
                                xValue: xMedian * 0.99, 
                                yValue: yMedian * 0.99, 
                                content: quadLabels.bottomLeft, 
                                position: 'end', 
                                xAdjust: -6, 
                                yAdjust: 6, 
                                font: { size: 10.4, weight: '700' }, 
                                color: 'rgba(239, 68, 68, 0.8)',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: 3,
                                padding: 4
                            }
                        })
                    }
                }
            }
        }
    };
}

function calculatePercentiles(players, metric, isAscending = false) {
    const sortedPlayers = [...players].sort((a, b) => {
        const valA = getNestedValue(a, metric) || 0;
        const valB = getNestedValue(b, metric) || 0;
        return isAscending ? valA - valB : valB - valA;
    });
    const n = sortedPlayers.length;
    sortedPlayers.forEach((p, i) => {
        if (!p.percentiles) p.percentiles = {};
        const percentile = (i / (n - 1)) * 100;
        p.percentiles[metric] = percentile;
    });
}

function calculateAllPredictions(players) {
    // Get fixtures based on current data source
    let fixtures = null;
    if (state.currentDataSource === 'demo') {
        fixtures = state.allPlayersData.demo?.fixtures || [];
    } else {
        fixtures = state.allPlayersData.live?.fixtures || state.allPlayersData.historical?.fixtures || [];
    }
    
    if (!fixtures || fixtures.length === 0) return players;
    
    const teamFixtures = {};
    fixtures.forEach(f => {
        if (!f.finished) {
            if (!teamFixtures[f.team_h]) teamFixtures[f.team_h] = [];
            if (!teamFixtures[f.team_a]) teamFixtures[f.team_a] = [];
            teamFixtures[f.team_h].push(f);
            teamFixtures[f.team_a].push(f);
        }
    });

    for (let teamId in teamFixtures) {
        teamFixtures[teamId].sort((a, b) => a.event - b.event);
    }
    
    players.forEach(p => {
        const upcomingFixtures = (teamFixtures[p.team] || []);
        
        // Calculate xPts for next gameweek only
        const nextFixture = upcomingFixtures.slice(0, 1);
        p.predicted_points_1_gw = nextFixture.length > 0 
            ? predictPointsForFixture(p, nextFixture[0])
            : 0;
        
        // Keep old 4GW for backward compatibility (draft analytics)
        const next4Fixtures = upcomingFixtures.slice(0, 4);
        p.predicted_points_4_gw = next4Fixtures.length > 0
            ? next4Fixtures.reduce((total, fix) => total + predictPointsForFixture(p, fix), 0)
            : 0;
        
        // ============================================
        // 🤖 ML PREDICTION
        // ============================================
        // Calculate ML prediction using the trained model
        if (typeof predictPlayerPoints === 'function') {
            try {
                const prediction = predictPlayerPoints(p);
                // If model not ready yet (returns null), keep existing value or 0
                p.ml_prediction = (prediction !== null && prediction !== undefined) ? prediction : (p.ml_prediction || 0);
            } catch (error) {
                console.warn('ML prediction failed for player:', p.web_name, error);
                p.ml_prediction = 0;
            }
        } else {
            p.ml_prediction = 0;
        }
    });
    
    return players;
}

function predictPointsForFixture(player, fixture) {
    const isHome = player.team === fixture.team_h;
    const opponentTeamId = isHome ? fixture.team_a : fixture.team_h;
    
    const playerTeam = state.teamStrengthData[player.team];
    const opponentTeam = state.teamStrengthData[opponentTeamId];
    if (!playerTeam || !opponentTeam) return 0;
    
    const pos = player.position_name;
    const gamesPlayed = Math.max((player.minutes || 0) / 90, 0.1);
    
    // ============================================
    // 1️⃣ TRANSFER MOMENTUM (17%) 🔥
    // ============================================
    const netTransfers = (player.transfers_in_event || 0) - (player.transfers_out_event || 0);
    const transferMomentum = Math.min(Math.max(netTransfers / 50, -1), 1); // Normalize to [-1, 1]
    const transferScore = (transferMomentum + 1) * 50; // Convert to [0, 100]
    
    // ============================================
    // 2️⃣ FORM (28%) 📈
    // ============================================
    const form = parseFloat(player.form) || 0;
    const formScore = Math.min(form * 10, 100); // 10 form = 100
    
    // ============================================
    // 3️⃣ xGI PER 90 (25%) ⚽
    // ============================================
    const xgiScore = Math.min((player.xGI_per90 || 0) * 100, 100); // 1.0 xGI/90 = 100
    
    // ============================================
    // 4️⃣ FIXTURE DIFFICULTY (20%) 🎯
    // ============================================
    const attackScore = isHome ? playerTeam.strength_attack_home : playerTeam.strength_attack_away;
    const defenseScore = isHome ? opponentTeam.strength_defence_home : opponentTeam.strength_defence_away;
    const fixtureDifficulty = (attackScore / Math.max(defenseScore, 1)) * 50; // Normalize
    const fixtureScore = Math.min(fixtureDifficulty, 100);
    
    // ============================================
    // 5️⃣ TEAM ATTACK STRENGTH (10%) 💪
    // ============================================
    const teamAttackStrength = (attackScore / 1300) * 100; // Normalize (1300 is typical max)
    const teamScore = Math.min(teamAttackStrength, 100);
    
    // ============================================
    // 🎯 WEIGHTED PREDICTION MODEL
    // ============================================
    const baseScore = (
        transferScore * 0.17 +      // 17% Transfer Momentum
        formScore * 0.28 +           // 28% Form
        xgiScore * 0.25 +            // 25% xGI per 90
        fixtureScore * 0.20 +        // 20% Fixture Difficulty
        teamScore * 0.10             // 10% Team Attack Strength
    );
    
    // ============================================
    // 🛡️ CLEAN SHEET BONUS (DEF/GKP)
    // ============================================
    let cleanSheetBonus = 0;
    if (pos === 'GKP' || pos === 'DEF') {
        const defStrength = isHome ? playerTeam.strength_defence_home : playerTeam.strength_defence_away;
        const oppAttack = isHome ? opponentTeam.strength_attack_home : opponentTeam.strength_attack_away;
        const csProb = (defStrength / Math.max(oppAttack, 1)) * 0.5; // Normalize
        cleanSheetBonus = csProb * (pos === 'GKP' ? 4 : 4) * (isHome ? 1.1 : 0.9);
    }
    
    // ============================================
    // ⚽ GOAL/ASSIST SCORING ADJUSTMENT
    // ============================================
    // Defenders and Midfielders get MORE points for goals!
    // DEF goal = 6pts, MID goal = 5pts, FWD goal = 4pts
    let goalValueBonus = 0;
    const expectedGoals = (player.expected_goals_per_90 || 0) / 90;
    const expectedAssists = (player.expected_assists_per_90 || 0) / 90;
    
    if (pos === 'DEF') {
        goalValueBonus = expectedGoals * 6 + expectedAssists * 3; // DEF: 6pts goal, 3pts assist
    } else if (pos === 'MID') {
        goalValueBonus = expectedGoals * 5 + expectedAssists * 3; // MID: 5pts goal, 3pts assist
    } else if (pos === 'FWD') {
        goalValueBonus = expectedGoals * 4 + expectedAssists * 3; // FWD: 4pts goal, 3pts assist
    } else if (pos === 'GKP') {
        goalValueBonus = expectedGoals * 6 + expectedAssists * 3; // GKP: 6pts goal (rare!), 3pts assist
    }
    
    // ============================================
    // ⭐ BONUS POINTS POTENTIAL
    // ============================================
    const bonusPerGame = (player.bonus || 0) / Math.max(gamesPlayed, 1);
    const bonusPoints = bonusPerGame * 0.6; // Conservative estimate
    
    // ============================================
    // 🎲 FINAL PREDICTION
    // ============================================
    const predictedPoints = (baseScore / 10) + cleanSheetBonus + goalValueBonus + bonusPoints + 2; // +2 for appearance
    
    return Math.max(0, Math.min(predictedPoints, 20)); // Cap at 20 points per game
}

/**
 * Calculate Stability Index for a player
 * Measures consistency/reliability (0-100, higher = more stable)
 * 
 * Based on:
 * 1. Form consistency (40%) - Higher form = more stable
 * 2. xG accuracy (30%) - xG close to actual goals = predictable
 * 3. Minutes consistency (20%) - Playing regularly = reliable
 * 4. Points variance (10%) - Points per game variation
 */
function calculateStabilityIndex(player) {
    const gamesPlayed = Math.max((player.minutes || 0) / 90, 0.1);
    
    // 1. Form Factor (40%) - Higher form = more stable recent performance
    const form = parseFloat(player.form) || 0;
    const formStability = Math.min(form * 10, 100); // 10 form = 100 stability
    
    // 2. xG Accuracy (30%) - How predictable are the player's returns?
    const actualGoals = player.goals_scored || 0;
    const expectedGoals = parseFloat(player.expected_goals) || 0;
    const goalsPerGame = actualGoals / gamesPlayed;
    const xGPerGame = expectedGoals / gamesPlayed;
    
    // Calculate how close actual is to expected (lower diff = more stable)
    const xGDiff = Math.abs(goalsPerGame - xGPerGame);
    const xGAccuracy = Math.max(0, 100 - (xGDiff * 100)); // Perfect match = 100
    
    // 3. Minutes Stability (20%) - Playing regularly
    const minutesPlayed = player.minutes || 0;
    const appearancesEstimate = Math.max((player.appearances || gamesPlayed), 1);
    const minutesPerAppearance = minutesPlayed / appearancesEstimate;
    const minutesStability = Math.min((minutesPerAppearance / 90) * 100, 100); // 90 min/game = 100
    
    // 4. Points Variance (10%) - Using coefficient of variation approach
    const totalPoints = player.total_points || 0;
    const pointsPerGame = totalPoints / gamesPlayed;
    
    // Estimate variance using form as proxy (form is avg last 5 GW)
    // If form is close to PPG, variance is low (stable)
    const formVsPPG = Math.abs(form - pointsPerGame);
    const pointsStability = Math.max(0, 100 - (formVsPPG * 20)); // Small diff = stable
    
    // Calculate weighted stability index
    const stabilityIndex = (
        formStability * 0.40 +      // 40% Form
        xGAccuracy * 0.30 +          // 30% xG Accuracy
        minutesStability * 0.20 +    // 20% Minutes
        pointsStability * 0.10       // 10% Points Variance
    );
    
    return Math.round(Math.max(0, Math.min(stabilityIndex, 100)));
}

function calculateAdvancedScores(players) {
    // Filter out players with less than 180 minutes (2 full games)
    const activePlayers = players.filter(p => (p.minutes || 0) >= 180);
    
    // Calculate percentiles for all metrics (only for active players)
    const metricsToPercentile = [
        { key: 'xGI_per90', asc: false }, 
        { key: 'def_contrib_per90', asc: false }, 
        { key: 'creativity_per_90', asc: false }, 
        { key: 'saves_per_90', asc: false }, 
        { key: 'clean_sheets_per_90', asc: false }, 
        { key: 'threat_per_90', asc: false },
        { key: 'now_cost', asc: true }, 
        { key: 'form', asc: false }, 
        { key: 'minutes', asc: false },
        { key: 'total_points', asc: false },
        { key: 'bonus', asc: false },
        { key: 'clean_sheets', asc: false },
        { key: 'selected_by_percent', asc: false },
        { key: 'dreamteam_count', asc: false }
    ];
    metricsToPercentile.forEach(m => calculatePercentiles(activePlayers, m.key, m.asc));

    // Calculate scores for active players
    activePlayers.forEach(p => {
        const pos = p.position_name;
        const minutes = p.minutes || 1; // Avoid division by zero
        const gamesPlayed = Math.max(minutes / 90, 0.1); // At least 0.1 to avoid division by zero
        
        // Calculate per-game metrics
        const goalsPerGame = (p.goals_scored || 0) / gamesPlayed;
        const assistsPerGame = (p.assists || 0) / gamesPlayed;
        const gaPerGame = goalsPerGame + assistsPerGame;
        const xgPerGame = (parseFloat(p.expected_goals) || 0) / gamesPlayed;
        const xaPerGame = (parseFloat(p.expected_assists) || 0) / gamesPlayed;
        const xgiPerGame = xgPerGame + xaPerGame;
        
        // 1. נקודות בפועל (35%) - הכי חשוב! 🏆
        const totalPoints = p.total_points || 0;
        const pointsScore = Math.min(totalPoints / 2, 100); // Normalize: 200 pts = 100
        
        // 2. תרומה הגנתית (15%) - DefCon 🛡️
        const defconScore = p.percentiles.def_contrib_per90 || 0;
        
        // 3. G+A per game (12%) ⚽
        const gaPerGameNorm = Math.min(gaPerGame * 50, 100); // 2 G+A per game = 100
        
        // 4. xG per game (12%) 📈
        const xgPerGameNorm = Math.min(xgiPerGame * 50, 100); // 2 xGI per game = 100
        
        // 5. איכות משחק (10%) - xGI/90, creativity 🎯
        let qualityScore = 0;
        if (pos === 'GKP') {
            qualityScore = (p.percentiles.saves_per_90 || 0) * 0.6 + (p.percentiles.clean_sheets_per_90 || 0) * 0.4;
        } else if (pos === 'DEF') {
            qualityScore = (p.percentiles.xGI_per90 || 0) * 0.3 + (p.percentiles.def_contrib_per90 || 0) * 0.4 + (p.percentiles.clean_sheets_per_90 || 0) * 0.3;
        } else if (pos === 'MID') {
            qualityScore = (p.percentiles.xGI_per90 || 0) * 0.5 + (p.percentiles.creativity_per_90 || 0) * 0.4 + (p.percentiles.def_contrib_per90 || 0) * 0.1;
        } else if (pos === 'FWD') {
            qualityScore = (p.percentiles.xGI_per90 || 0) * 0.7 + (p.percentiles.threat_per_90 || 0) * 0.3;
        }
        
        // 6. אחוז בעלות (8%) - inverted: lower is better for draft 💎
        const ownershipScore = 100 - (p.percentiles.selected_by_percent || 0);
        
        // 7. בונוס (8%) ⭐
        const bonusScore = p.percentiles.bonus || 0;
        
        // Calculate final draft score with weights
        p.draft_score = (
            pointsScore * 0.35 +          // 35% נקודות בפועל
            defconScore * 0.15 +          // 15% תרומה הגנתית
            gaPerGameNorm * 0.12 +        // 12% G+A למשחק
            xgPerGameNorm * 0.12 +        // 12% xG למשחק
            qualityScore * 0.10 +         // 10% איכות משחק
            ownershipScore * 0.08 +       // 8% אחוז בעלות (inverted)
            bonusScore * 0.08             // 8% בונוס
        );
        
        // Store component scores for debugging/display
        p.quality_score = qualityScore;
        p.base_score = pointsScore;
        p.performance_score = pointsScore;
        p.ga_per_game = gaPerGame;
        p.xgi_per_game = xgiPerGame;
        
        // ============================================
        // 📊 STABILITY INDEX - New!
        // ============================================
        // Measures player consistency (0-100, higher = more stable)
        p.stability_index = calculateStabilityIndex(p);
        
        // Calculate predictions for future reference
        p = calculateAllPredictions([p])[0];
    });
    
    // Set draft_score to 0 for inactive players (less than 180 minutes)
    players.forEach(p => {
        if ((p.minutes || 0) < 180) {
            p.draft_score = 0;
            p.quality_score = 0;
            p.base_score = 0;
            p.performance_score = 0;
            p.ga_per_game = 0;
            p.xgi_per_game = 0;
        }
    });
    
    return players.sort((a,b) => b.draft_score - a.draft_score);
}

function sortTableDraft(field) {
    const standingsData = state.draft._standingsData;
    if (!standingsData || !standingsData.length) return;

    const currentSort = state.draft._standingsSort;
    let direction = 'desc';
    
    if (currentSort && currentSort.field === field) {
        direction = currentSort.direction === 'desc' ? 'asc' : 'desc';
    }

    state.draft._standingsSort = { field, direction };

    standingsData.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return direction === 'desc' ? bVal - aVal : aVal - bVal;
        } else {
            return direction === 'desc' ? String(bVal).localeCompare(String(aVal)) : String(aVal).localeCompare(String(bVal));
        }
    });

    const tbody = document.querySelector('#draftStandingsTable tbody');
    if (tbody) {
        tbody.innerHTML = standingsData.map(s => `
            <tr>
                <td>${s.rank}</td>
                <td>${s.manager}</td>
                <td>${s.team}</td>
                <td>${s.wins}</td>
                <td>${s.draws}</td>
                <td>${s.losses}</td>
                <td>${s.pf}</td>
                <td>${s.pa}</td>
                <td>${s.diff > 0 ? '+' : ''}${s.diff}</td>
                <td>${s.total}</td>
            </tr>
        `).join('');
    }
}

function showTab(tab) {
    const playersEl = document.getElementById('playersTabContent');
    const draftEl = document.getElementById('draftTabContent');
    const btnPlayers = document.getElementById('tabPlayersBtn');
    const btnDraft = document.getElementById('tabDraftBtn');

    if (!playersEl || !draftEl) return;

    if (tab === 'draft') {
        playersEl.style.display = 'none';
        draftEl.style.display = 'block';
        btnPlayers && btnPlayers.classList.remove('active');
        btnDraft && btnDraft.classList.add('active');
        loadDraftLeague();
    } else {
        playersEl.style.display = 'block';
        draftEl.style.display = 'none';
        btnDraft && btnDraft.classList.remove('active');
        btnPlayers && btnPlayers.classList.add('active');
    }
    localStorage.setItem('fplToolActiveTab', tab);
}

function getProcessedByElementId() {
    // Check if we're in demo mode first
    if (state.currentDataSource === 'demo' && state.allPlayersData.demo && state.allPlayersData.demo.processed) {
        const map = new Map();
        state.allPlayersData.demo.processed.forEach(p => map.set(p.id, p));
        return map;
    }
    
    // Otherwise use live or historical data
    // Since rostersByEntryId now stores FPL IDs (not Draft IDs), 
    // we only need to map by FPL ID
    const processed = (state.allPlayersData.live && state.allPlayersData.live.processed) || (state.allPlayersData.historical && state.allPlayersData.historical.processed) || [];
    const map = new Map();
    
    processed.forEach(p => {
        map.set(p.id, p); // Map by FPL ID only
    });
    
    return map;
}

function pickStartingXI(playerIds) {
    const processedById = getProcessedByElementId();
    const players = playerIds.map(id => processedById.get(id)).filter(Boolean);

    const byPos = { GKP: [], DEF: [], MID: [], FWD: [] };
    players.forEach(p => byPos[p.position_name].push(p));

    const sortFn = (a, b) => b.draft_score - a.draft_score;
    Object.values(byPos).forEach(arr => arr.sort(sortFn));

    const gk = byPos.GKP.slice(0, 1);
    const def = byPos.DEF.slice(0, 4);
    const mid = byPos.MID.slice(0, 4);
    const fwd = byPos.FWD.slice(0, 2);
    
    let needed = 11 - (gk.length + def.length + mid.length + fwd.length);
    if (needed > 0) {
        const pool = [...byPos.DEF.slice(4), ...byPos.MID.slice(4), ...byPos.FWD.slice(2)].sort(sortFn);
        for (let i=0; i<needed && i<pool.length; i++) mid.push(pool[i]);
    }
    
    return [...gk, ...def, ...mid, ...fwd].map(p=>p.id);
}

function getCurrentEventId() {
    const data = (state.allPlayersData.live && state.allPlayersData.live.raw) || (state.allPlayersData.historical && state.allPlayersData.historical.raw);
    if (!data || !data.events) return 1;
    
    const current = data.events.find(e => e.is_current) || data.events.find(e => e.is_next);
    if (current) return current.id;

    const maxFinished = [...data.events].filter(e => e.finished || e.finished_provisional).sort((a,b)=>b.id-a.id)[0];
    return maxFinished ? maxFinished.id : 1;
}

function getCompletedGWCount() {
    const data = (state.allPlayersData.live && state.allPlayersData.live.raw) || (state.allPlayersData.historical && state.allPlayersData.historical.raw);
    if (!data || !data.events) return 0;
    return data.events.filter(e => e.finished || e.finished_provisional).length;
}

function getPlayerImageUrl(player) {
    const base = 'https://resources.premierleague.com/premierleague/photos/players/110x140';
    const code = player && player.code ? player.code : null;
    if (code) return config.urls.playerImage(code);
    const photo = player && player.photo ? String(player.photo).split('.')[0] : null;
    if (photo) return `${base}/p${photo}.png`;
    return config.urls.missingPlayerImage;
}

function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(217, 217, 217, ${alpha})`; // Default grey for safety
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length == 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`;
    }
    console.error('Bad Hex:', hex);
    return `rgba(217, 217, 217, ${alpha})`; // Fallback for bad hex
}

function getTeamColor(name) {
    const palette = [
        '#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462',
        '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f'
    ];
    if (!name) return palette[8]; // Return grey for safety if name is falsy
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
}

async function loadDraftDataInBackground() {
    // Load draft data silently in the background without showing loading overlay
    try {
        const detailsUrl = `${config.corsProxy}${encodeURIComponent(`https://draft.premierleague.com/api/league/${state.draft.leagueId}/details`)}`;
        const detailsCacheKey = `fpl_draft_details_${state.draft.leagueId}`;
        
        const details = await fetchWithCache(detailsUrl, detailsCacheKey, 30);
        
        if (details && details.league_entries) {
            state.draft.details = details;
            
            // Process draft data to get owned players
            const currentGW = details.league?.current_event || 10;
            
            // Build entryId to team name map
            state.draft.entryIdToTeamName.clear();
            details.league_entries.forEach(entry => {
                if (entry && entry.id && entry.entry_name) {
                    state.draft.entryIdToTeamName.set(entry.id, entry.entry_name);
                }
            });
            
            // Fetch all team rosters
            const rosterPromises = details.league_entries
                .filter(e => e && e.id && e.entry_id)
                .map(async entry => {
                    const picksUrl = `${config.corsProxy}${encodeURIComponent(`https://draft.premierleague.com/api/entry/${entry.entry_id}/event/${currentGW}`)}`;
                    const picksCacheKey = `fpl_draft_picks_bg_${entry.entry_id}_gw${currentGW}`;
                    try {
                        const picksData = await fetchWithCache(picksUrl, picksCacheKey, 30);
                        if (picksData && picksData.picks) {
                            // Convert picks to FPL IDs and preserve position info
                            const picksWithFplIds = picksData.picks.map(pick => ({
                                fplId: state.draft.draftToFplIdMap.get(pick.element) || pick.element,
                                position: pick.position
                            }));
                            
                            // Extract all FPL IDs for roster
                            const fplPlayerIds = picksWithFplIds.map(p => p.fplId);
                            
                            // Store FPL IDs (not Draft IDs!)
                            state.draft.rostersByEntryId.set(entry.id, fplPlayerIds);
                            
                            // Store lineup info (starting vs bench)
                            const starting = picksWithFplIds.filter(p => p.position >= 1 && p.position <= 11).map(p => p.fplId);
                            const bench = picksWithFplIds.filter(p => p.position >= 12 && p.position <= 15).map(p => p.fplId);
                            state.draft.lineupsByEntryId.set(entry.id, { starting, bench });
                            
                            // Add to owned set (already FPL IDs)
                            fplPlayerIds.forEach(fplId => {
                                state.draft.ownedElementIds.add(fplId);
                            });
                        }
                    } catch (err) {
                        console.log(`Could not load roster for ${entry.entry_name}`);
                    }
                });
            
            await Promise.all(rosterPromises);
            
            // Populate team filter with draft teams
            populateTeamFilter();
            
            // Re-render table to update draft team column
            renderTable();
            
            console.log('✅ Draft data loaded in background:', state.draft.ownedElementIds.size, 'players owned');
        }
    } catch (error) {
        console.log('Draft data not available:', error.message);
        // Silently fail - not critical for main page
    }
}

async function loadDraftLeague() {
    showLoading('טוען ליגת דראפט...');
    const draftContainer = document.getElementById('draftTabContent');
    const sectionsToClear = ['draftStandingsContent', 'draftRecommendations', 'draftAnalytics', 'draftComparison', 'draftMatrices'];
    
    // Clear containers that will be rendered into
    const myLineupContainer = document.getElementById('myLineupContainer');
    const otherRostersContainer = document.getElementById('otherRosters');
    if (myLineupContainer) myLineupContainer.innerHTML = '';
    if (otherRostersContainer) otherRostersContainer.innerHTML = '';

    // Show mini loaders for sections that take time
    sectionsToClear.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.innerHTML = `<div class="mini-loader" style="display:block;"></div>`;
        }
    });

    try {
        // Make sure we have player data loaded (demo or real)
        if (state.currentDataSource === 'demo') {
            // In demo mode, ensure demo data is loaded
            if (!state.allPlayersData.demo || !state.allPlayersData.demo.processed) {
                showToast('שגיאה', 'נתוני דמו לא נטענו. אנא רענן את הדף.', 'error', 3000);
                hideLoading();
                return;
            }
        } else if (!state.allPlayersData.live.raw && !state.allPlayersData.historical.raw) {
            await fetchAndProcessData();
        }
        
        // CRITICAL: Ensure Draft→FPL mapping is built before processing rosters
        if (state.draft.draftToFplIdMap.size === 0) {
            console.log('⚠️ Mapping not found, building now...');
            await buildDraftToFplMapping();
        } else {
            console.log(`✅ Using existing mapping: ${state.draft.draftToFplIdMap.size} players mapped`);
        }

        const detailsCacheKey = `fpl_draft_details_${config.draftLeagueId}`;
        const standingsCacheKey = `fpl_draft_standings_${config.draftLeagueId}`;
        localStorage.removeItem(detailsCacheKey);
        localStorage.removeItem(standingsCacheKey);
        
        const encodedDetails = config.corsProxy + encodeURIComponent(config.urls.draftLeagueDetails(config.draftLeagueId));
        const encodedStandings = config.corsProxy + encodeURIComponent(config.urls.draftLeagueStandings(config.draftLeagueId));

        const [detailsData, standingsData] = await Promise.all([
            fetchWithCache(encodedDetails, detailsCacheKey, 5),
            fetchWithCache(encodedStandings, standingsCacheKey, 5).catch(() => null)
        ]);
        
        state.draft.details = detailsData;
        state.draft.standings = standingsData;
        
        console.log("--- Draft League Debug ---");
        console.log("1. Fetched Details Data:", JSON.parse(JSON.stringify(detailsData)));
        
        state.draft.entryIdToTeamName = new Map((state.draft.details?.league_entries || []).filter(e=>e && e.entry_name).map(e => [e.id, e.entry_name]));
        
        // --- Final, reliable roster population method V4 ---
        // Based on debug logs, element_status is empty. We MUST revert to fetching individual picks.
        // This is the most robust method confirmed by community projects.
        try {
            state.draft.rostersByEntryId.clear();
            state.draft.ownedElementIds.clear();

            const leagueEntries = state.draft.details?.league_entries || [];
            const draftGw = state.draft.details?.league?.current_event || getCurrentEventId();
            console.log(`2. Determined Draft GW: ${draftGw}. Found ${leagueEntries.length} league entries.`);

            const picksPromises = leagueEntries.map(async (entry) => {
                if (!entry || !entry.entry_id || !entry.id) {
                    return;
                }
                
                const url = config.corsProxy + encodeURIComponent(config.urls.draftEntryPicks(entry.entry_id, draftGw));
                const picksCacheKey = `fpl_draft_picks_final_v4_${entry.entry_id}_gw${draftGw}`;
                
                localStorage.removeItem(picksCacheKey); 
                
                try {
                    const picksData = await fetchWithCache(url, picksCacheKey, 5);
                    if (picksData && picksData.picks) {
                        // Convert picks to FPL IDs and preserve position info
                        const picksWithFplIds = picksData.picks.map(pick => ({
                            fplId: state.draft.draftToFplIdMap.get(pick.element) || pick.element,
                            position: pick.position
                        }));
                        
                        // Extract all FPL IDs for roster
                        const fplPlayerIds = picksWithFplIds.map(p => p.fplId);
                        
                        // Store FPL IDs
                        state.draft.rostersByEntryId.set(entry.id, fplPlayerIds);
                        
                        // Store lineup info (starting vs bench)
                        const starting = picksWithFplIds.filter(p => p.position >= 1 && p.position <= 11).map(p => p.fplId);
                        const bench = picksWithFplIds.filter(p => p.position >= 12 && p.position <= 15).map(p => p.fplId);
                        state.draft.lineupsByEntryId.set(entry.id, { starting, bench });
                    } else {
                        state.draft.rostersByEntryId.set(entry.id, []);
                        state.draft.lineupsByEntryId.set(entry.id, { starting: [], bench: [] });
                    }
                } catch (err) {
                    console.error(`Failed to fetch final picks for entry ${entry.entry_name} (${entry.entry_id})`, err);
                    state.draft.rostersByEntryId.set(entry.id, []);
                    state.draft.lineupsByEntryId.set(entry.id, { starting: [], bench: [] });
                }
            });

            await Promise.all(picksPromises);

            // Add all roster players to ownedElementIds (already FPL IDs!)
            for (const fplPlayerIds of state.draft.rostersByEntryId.values()) {
                fplPlayerIds.forEach(fplId => {
                    state.draft.ownedElementIds.add(fplId);
                });
            }
            
            console.log("3. Rosters Populated:", state.draft.rostersByEntryId.size, "teams.");
            console.log(`   Mapping size: ${state.draft.draftToFplIdMap.size} Draft→FPL, ${state.draft.fplToDraftIdMap.size} FPL→Draft`);
            console.log(`   Lineups stored: ${state.draft.lineupsByEntryId.size} teams`);
            
            let totalPlayers = 0;
            const processedById = getProcessedByElementId();
            console.log(`   ProcessedById map size: ${processedById.size} players`);
            
            state.draft.rostersByEntryId.forEach((roster, teamId) => {
                const teamName = state.draft.entryIdToTeamName.get(teamId) || `Unknown ID: ${teamId}`;
                // roster now contains FPL IDs (already converted), so lookup is straightforward
                const playerNames = roster.map(fplId => {
                    const player = processedById.get(fplId);
                    if (!player) {
                        console.warn(`  ⚠️ FPL ID ${fplId} not found in processed players`);
                        return `ID ${fplId} not found`;
                    }
                    return player.web_name;
                }).join(', ');
                console.log(`  - Team '${teamName}':`, roster.length, "players -> [", playerNames, "]");
                totalPlayers += roster.length;
            });
            console.log("4. Total players in all rosters:", totalPlayers);
            console.log("5. Total owned player IDs:", state.draft.ownedElementIds.size);

        } catch (debugError) {
            console.error("!!! CRITICAL ERROR during roster population !!!", debugError);
            draftContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: red;">שגיאה קריטית בעיבוד נתוני הסגלים: ${debugError.message}<br>אנא בדוק את הקונסול.</div>`;
            return; // Stop execution if rosters failed
        }
        // --- End of Roster Population ---
        
        renderDraftStandings();
        
        populateMyTeamSelector(); // Populate My Team Selector
        const myTeam = findMyTeam();

        if (myTeam) {
            renderMyLineup(myTeam.id);
            renderNextRivalAnalysis(); // Update Rival Analysis
        } else {
             renderMyLineup(null); // Show empty state
        }
        
        renderRecommendations();

        const aggregates = computeDraftTeamAggregates();
        populateAnalyticsHighlight(); // Populate highlight dropdown
        renderDraftAnalytics(aggregates);
        renderDraftComparison(aggregates);
        renderDraftRosters();
        renderDraftMatrices(aggregates);
        renderAllTeamsTrendChart(aggregates); // Render the race chart
        populateTeamFilter(); // Repopulate with draft teams
        
        // Show success toast
        const totalTeams = state.draft.rostersByEntryId.size;
        const totalPlayers = state.draft.ownedElementIds.size;
        showToast('ליגת דראפט נטענה בהצלחה', `${totalTeams} קבוצות, ${totalPlayers} שחקנים`, 'success', 3000);
    } catch (e) {
        console.error('loadDraftLeague error', e);
        draftContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: red;">שגיאה בטעינת נתוני הליגה: ${e.message}</div>`;
        showToast('שגיאה בטעינת הליגה', e.message, 'error', 5000);
    } finally {
        hideLoading();
    }
}

function renderDraftStandings() {
    const container = document.getElementById('draftStandingsContent');
    if (!container) return;

    const standingsSource = (state.draft.standings?.standings) || (state.draft.details?.standings) || [];
    const leagueEntries = state.draft.details?.league_entries;

    if (standingsSource.length === 0 || !leagueEntries) {
        container.innerHTML = '<p style="text-align:center; padding:20px;">לא נמצא מידע על טבלת הליגה.</p>';
        return;
    }

    const standingsData = standingsSource.map(s => {
        const entry = leagueEntries.find(le => le.id === s.league_entry);
        if (!entry || !entry.entry_name || entry.entry_name.toLowerCase() === 'average') {
            return null; // Filter out invalid or average entries
        }
        const pf = s.points_for || 0;
        const pa = s.points_against || 0;
        const total = s.total || 0;
        const diff = pf - pa;
        
        return {
            rank: s.rank,
            manager: entry.player_first_name + ' ' + entry.player_last_name,
            team: entry.entry_name,
            wins: s.matches_won || 0,
            draws: s.matches_drawn || 0,
            losses: s.matches_lost || 0,
            pf,
            pa,
            diff,
            total
        };
    }).filter(Boolean); // Remove nulls

    standingsData.sort((a, b) => a.rank - b.rank);
    state.draft._standingsData = standingsData; // Save for sorting

    const table = document.createElement('table');
    table.id = 'draftStandingsTable';
    table.className = 'styled-table draft-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th onclick="sortTableDraft('rank')">דירוג</th>
            <th onclick="sortTableDraft('manager')">מנהל</th>
            <th onclick="sortTableDraft('team')">קבוצה</th>
            <th onclick="sortTableDraft('wins')">נצ'</th>
            <th onclick="sortTableDraft('draws')">ת'</th>
            <th onclick="sortTableDraft('losses')">הפ'</th>
            <th onclick="sortTableDraft('pf')">בעד</th>
            <th onclick="sortTableDraft('pa')">נגד</th>
            <th onclick="sortTableDraft('diff')">+/-</th>
            <th onclick="sortTableDraft('total')">נק'</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.id = 'draftStandingsBody'; // Add ID for sorting
    tbody.innerHTML = standingsData.map(s => `
        <tr>
            <td>${s.rank}</td>
            <td>${s.manager}</td>
            <td>${s.team}</td>
            <td>${s.wins}</td>
            <td>${s.draws}</td>
            <td>${s.losses}</td>
            <td>${s.pf}</td>
            <td>${s.pa}</td>
            <td>${s.diff > 0 ? '+' : ''}${s.diff}</td>
            <td>${s.total}</td>
        </tr>
    `).join('');
    table.appendChild(tbody);
    
    container.innerHTML = ''; // Clear loader
    container.appendChild(table);

    const completed = getCompletedGWCount();
    const gwCountEl = document.getElementById('gwCount');
    if (gwCountEl) {
        gwCountEl.textContent = `לאחר ${completed} מחזורים`;
    }
}

function renderLineupStats(stats, diffs = null) {
    const renderBox = (label, value, colorClass, diffVal) => {
        let diffHtml = '';
        if (diffs && diffVal !== undefined) {
            const isPos = diffVal >= 0;
            const sign = isPos ? '+' : '';
            const displayVal = typeof diffVal === 'number' ? diffVal.toFixed(1) : diffVal;
            diffHtml = `<div style="font-size: 10px; color: ${isPos ? '#10b981' : '#ef4444'}; font-weight: 700; margin-top: 2px;">
                ${sign}${displayVal}
            </div>`;
        }
        return `
            <div style="text-align: center; padding: 10px; background: #fff; border-radius: 12px; border: 1px solid #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 4px;">${label}</div>
                <div style="font-size: 20px; font-weight: 800; color: ${colorClass}; line-height: 1;">${typeof value === 'number' ? value.toFixed(1) : value}</div>
                ${diffHtml}
            </div>
        `;
    };

    return `
        <div class="lineup-stats-card" style="margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 12px;">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                ${renderBox('צפי (GW הבא)', stats.predicted, '#3b82f6', diffs?.predicted)}
                ${renderBox('נקודות (GW אחרון)', stats.lastGw, '#10b981', diffs?.lastGw)}
                ${renderBox('PPG/90', stats.ppg90, '#f59e0b', diffs?.ppg90)}
                ${renderBox('כושר (Form)', stats.form, '#8b5cf6', diffs?.form)}
            </div>
        </div>
    `;
}

function showRecommendedLineup() {
    const myTeamId = state.draft.myTeamId;
    if (!myTeamId) return;
    
    const rosterIds = state.draft.rostersByEntryId.get(parseInt(myTeamId));
    if (!rosterIds) return;

    const processedById = getProcessedByElementId();
    const roster = rosterIds.map(id => processedById.get(id)).filter(Boolean);

    const gks = roster.filter(p => p.element_type === 1).sort((a,b) => (b.predicted_points_1_gw||0) - (a.predicted_points_1_gw||0));
    const others = roster.filter(p => p.element_type !== 1).sort((a,b) => (b.predicted_points_1_gw||0) - (a.predicted_points_1_gw||0));
    
    const selectedGK = gks[0];
    const benchGK = gks.slice(1);
    
    const selectedOutfield = others.slice(0, 10);
    const benchOutfield = others.slice(10);
    
    let starters = [selectedGK, ...selectedOutfield];
    let bench = [...benchGK, ...benchOutfield];

    const container = document.getElementById('myLineupContainer');
    if (container) {
        const btnMy = document.getElementById('btnShowMyLineup');
        const btnRec = document.getElementById('btnShowRecLineup');
        if(btnMy) { btnMy.classList.remove('active'); btnMy.style.background='white'; btnMy.style.color='#64748b'; btnMy.style.border='1px solid #cbd5e1'; }
        if(btnRec) { btnRec.classList.add('active'); btnRec.style.background='#3b82f6'; btnRec.style.color='white'; btnRec.style.border='none'; }
        
        const controls = container.querySelector('.draft-lineup-controls');
        container.innerHTML = '';
        container.appendChild(controls);
        
        const calculateStats = (players) => {
            return {
                predicted: players.reduce((sum, p) => sum + (parseFloat(p.predicted_points_1_gw) || 0), 0),
                lastGw: players.reduce((sum, p) => sum + (p.total_points || 0), 0), 
                ppg90: players.reduce((sum, p) => sum + (parseFloat(p.points_per_game_90) || 0), 0) / (players.length || 1),
                form: players.reduce((sum, p) => sum + (parseFloat(p.form) || 0), 0) / (players.length || 1)
            };
        };
        const stats = calculateStats(starters);
        
        const statsDiv = document.createElement('div');
        statsDiv.innerHTML = renderLineupStats(stats);
        container.appendChild(statsDiv);

        const pitchWrapper = document.createElement('div');
        pitchWrapper.className = 'pitch-wrapper';
        container.appendChild(pitchWrapper);

        renderPitch(pitchWrapper, starters.map(p => p.id), true, bench.map(p => p.id));
        
        showToast('הרכב אופטימלי', 'ההרכב מחושב לפי צפי נקודות למחזור הקרוב', 'success');
    }
}

function renderMyLineup(teamId) {
    const container = document.getElementById('myLineupContainer');
    if (!container) return;
    
    if (!teamId) {
        container.innerHTML = '<p style="text-align:center; padding: 20px;">לא נמצאה קבוצה</p>';
        return;
    }

    const rosterIds = state.draft.rostersByEntryId.get(parseInt(teamId)) || [];
    if (!rosterIds.length) {
        container.innerHTML = '<p style="text-align:center; padding: 20px;">אין סגל להצגה</p>';
        return;
    }

    let starters = [];
    let bench = [];
    
    const lineupData = state.draft.lineupsByEntryId ? state.draft.lineupsByEntryId.get(parseInt(teamId)) : null;
    const processedById = getProcessedByElementId();

    if (lineupData && lineupData.starting && lineupData.starting.length > 0) {
        starters = lineupData.starting.map(id => processedById.get(id)).filter(Boolean);
        bench = lineupData.bench.map(id => processedById.get(id)).filter(Boolean);
    } else {
        const roster = rosterIds.map(id => processedById.get(id)).filter(Boolean);
        starters = roster.slice(0, 11);
        bench = roster.slice(11);
    }

    const calculateStats = (players) => {
        return {
            predicted: players.reduce((sum, p) => sum + (parseFloat(p.predicted_points_1_gw) || 0), 0),
            lastGw: players.reduce((sum, p) => sum + (p.total_points || 0), 0), 
            ppg90: players.reduce((sum, p) => sum + (parseFloat(p.points_per_game_90) || 0), 0) / (players.length || 1),
            form: players.reduce((sum, p) => sum + (parseFloat(p.form) || 0), 0) / (players.length || 1)
        };
    };

    const stats = calculateStats(starters);
    
    container.innerHTML = '';
    
    const controls = document.createElement('div');
    controls.className = 'draft-lineup-controls';
    controls.style.cssText = 'display: flex; justify-content: center; gap: 10px; margin-bottom: 15px;';
    controls.innerHTML = `
        <button id="btnShowMyLineup" class="lineup-toggle active" style="padding: 8px 16px; border-radius: 8px; border: none; background: #3b82f6; color: white; font-weight: 600; cursor: pointer;" onclick="renderMyLineup('${teamId}')">הרכב נוכחי</button>
        <button id="btnShowRecLineup" class="lineup-toggle" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; color: #64748b; font-weight: 600; cursor: pointer;" onclick="showRecommendedLineup()">הרכב אופטימלי</button>
    `;
    container.appendChild(controls);

    const statsDiv = document.createElement('div');
    statsDiv.innerHTML = renderLineupStats(stats);
    container.appendChild(statsDiv);

    const pitchWrapper = document.createElement('div');
    pitchWrapper.className = 'pitch-wrapper';
    container.appendChild(pitchWrapper);

    renderPitch(pitchWrapper, starters.map(p => p.id), true, bench.map(p => p.id));
}

function findFreeAgents() {
    // Check if we're in demo mode first
    let allPlayers = [];
    if (state.currentDataSource === 'demo' && state.allPlayersData.demo && state.allPlayersData.demo.processed) {
        allPlayers = state.allPlayersData.demo.processed;
    } else {
        allPlayers = (state.allPlayersData.live && state.allPlayersData.live.processed) || [];
    }
    return allPlayers.filter(p => !state.draft.ownedElementIds.has(p.id));
}

function getRecommendationData() {
    const myId = findMyTeam()?.id;
    if (!myId) return null;

    const myPlayerIds = new Set(state.draft.rostersByEntryId.get(myId) || []);
    if (!myPlayerIds.size) return null;

    const processedById = getProcessedByElementId();
    const myPlayers = Array.from(myPlayerIds).map(id => processedById.get(id)).filter(Boolean);
    
    // Get ONLY free agents (not owned by ANY team)
    const freeAgents = findFreeAgents();
    
    console.log(`DEBUG Recommendations: Found ${freeAgents.length} free agents out of ${processedById.size} total players`);
    console.log(`DEBUG: My team has ${myPlayers.length} players`);
    console.log(`DEBUG: Total owned players across all teams: ${state.draft.ownedElementIds.size}`);

    // Calculate Smart Score for a player
    const calculateSmartScore = (p) => {
        if (!p) return 0;
        
        // Base metrics (normalized to 0-100 scale)
        const xPts1GW = (p.predicted_points_1_gw || 0) * 10; // Weight: 0.30
        const draftScore = (p.draft_score || 0); // Weight: 0.25
        const form = parseFloat(p.form || 0) * 10; // Weight: 0.15
        
        // Transfers balance (difference between transfers_in and transfers_out)
        const transfersIn = parseInt(p.transfers_in_event || 0);
        const transfersOut = parseInt(p.transfers_out_event || 0);
        const transfersBalance = transfersIn - transfersOut;
        const transfersScore = Math.max(0, Math.min(100, transfersBalance * 2 + 50)); // Weight: 0.20
        
        // Ownership percentage (higher is better for comeback players)
        const ownership = parseFloat(p.selected_by_percent || 0);
        const ownershipScore = Math.min(100, ownership * 2); // Weight: 0.10
        
        // Comeback bonus: High ownership but low minutes = returning from injury
        let comebackBonus = 0;
        const minutes = p.minutes || 0;
        if (minutes < 270 && ownership > 30 && draftScore > 70) {
            comebackBonus = 20; // Significant bonus for comeback players
        } else if (minutes < 180 && ownership > 20 && draftScore > 60) {
            comebackBonus = 10; // Moderate bonus
        }
        
        // Calculate weighted smart score
        const smartScore = (
            (xPts1GW * 0.30) +
            (draftScore * 0.25) +
            (form * 0.15) +
            (transfersScore * 0.20) +
            (ownershipScore * 0.10) +
            comebackBonus
        );
        
        return smartScore;
    };

    // Add smart_score and transfers_balance to all players for display
    const enrichPlayer = (p) => {
        const transfersIn = parseInt(p.transfers_in_event || 0);
        const transfersOut = parseInt(p.transfers_out_event || 0);
        return {
            ...p,
            smart_score: calculateSmartScore(p),
            transfers_balance: transfersIn - transfersOut
        };
    };

    // Enrich my players and free agents
    const myPlayersEnriched = myPlayers.map(enrichPlayer);
    const freeAgentsEnriched = freeAgents.map(enrichPlayer);

    const myPlayersWithScore = myPlayersEnriched.map(p => ({ player: p, score: p.smart_score }));

    // Find 4 weakest players overall (not necessarily one per position)
    // EXCLUDE GOALKEEPERS - never recommend replacing them
    const weakestPlayers = myPlayersWithScore
        .filter(p => p.player.position_name !== 'GKP') // Exclude goalkeepers
        .sort((a, b) => a.score - b.score) // Sort by Smart Score (lowest first)
        .slice(0, 4); // Take 4 weakest
    
    console.log('=== SMART RECOMMENDATION LOGIC ===');
    console.log('Smart Score calculation:');
    console.log('  - xPts (1GW) × 30% - תחזית למחזור הבא');
    console.log('  - Draft Score × 25% - איכות כללית');
    console.log('  - Form × 15% - כושר אחרון');
    console.log('  - Transfers Balance × 20% - הפרש העברות (חכמת ההמונים)');
    console.log('  - Ownership × 10% - אחוז בעלות');
    console.log('  - Comeback Bonus - בונוס לשחקנים חוזרים מפציעה');
    console.log('');
    console.log('4 Weakest players (excluding GKP):');
    weakestPlayers.forEach((p, i) => {
        console.log(`  ${i+1}. ${p.player.web_name} (${p.player.position_name}) - Smart Score: ${p.score.toFixed(1)}`);
    });
    
    const recommendations = {};
    
    // Track already recommended players to avoid duplicates across multiple recommendations
    const alreadyRecommended = new Set();
    
    weakestPlayers.forEach((playerToReplace, index) => {
        const pos = playerToReplace.player.position_name;
        
        // Find top free agents in same position with better smart score
        // We'll get more than 3 initially, then filter out already recommended ones
        const allCandidates = freeAgentsEnriched
            .filter(p => {
                // Must be same position
                if (p.position_name !== pos) return false;
                
                // Must have played at least 1 minute (to allow comeback players)
                if (p.minutes <= 0) return false;
                
                // CRITICAL: Double-check player is NOT in ownedElementIds
                if (state.draft.ownedElementIds.has(p.id)) {
                    console.warn(`Player ${p.web_name} (${p.id}) is marked as free agent but is actually owned!`);
                    return false;
                }
                
                // Must have better smart score
                if (p.smart_score <= playerToReplace.score) return false;
                
                // NEW: Must have transfers_balance > 1000 (high demand)
                if (Math.abs(p.transfers_balance) < 1000) return false;
                
                // CRITICAL: Exclude players already recommended for other positions
                if (alreadyRecommended.has(p.id)) return false;
                
                return true;
            })
            .sort((a, b) => b.smart_score - a.smart_score);
        
        // Take top 3 candidates
        const candidates = allCandidates.slice(0, 3);

        console.log(`DEBUG ${pos}: Found ${candidates.length} unique free agent candidates better than ${playerToReplace.player.web_name} (smart score: ${playerToReplace.score.toFixed(1)})`);
        
        if (candidates.length) {
            // Mark these candidates as recommended so they won't appear in future recommendations
            candidates.forEach(c => alreadyRecommended.add(c.id));
            
            // Use unique key based on player ID to avoid conflicts
            recommendations[`rec_${index}_${playerToReplace.player.id}`] = { 
                player: playerToReplace.player, 
                candidates,
                position: pos
            };
        }
    });

    return recommendations;
}

function renderRecommendations() {
    const container = document.getElementById('draftRecommendations');
    if (!container) return;
    container.innerHTML = ''; // Clear loader

    const recommendationData = getRecommendationData();
    if (!recommendationData || Object.keys(recommendationData).length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px;">🎉 כל השחקנים שלך מצוינים! אין המלצות להחלפה כרגע.</p>';
        return;
    }

    const tablesContainer = document.createElement('div');
    tablesContainer.className = 'recs-grid-tables';

    // Position names in Hebrew
    const posNames = {
        'GKP': '🧤 שוער',
        'DEF': '🛡️ מגן',
        'MID': '⚙️ קשר',
        'FWD': '⚽ חלוץ'
    };
    
    // Create recommendation reason for each candidate
    const getRecommendationReason = (candidate) => {
        const reasons = [];
        
        // Check comeback player
        if (candidate.minutes < 270 && candidate.selected_by_percent > 30 && candidate.draft_score > 70) {
            reasons.push('🔥 חוזר');
        } else if (candidate.minutes < 180 && candidate.selected_by_percent > 20 && candidate.draft_score > 60) {
            reasons.push('⚡ חוזר');
        }
        
        // Check high transfers balance
        if (candidate.transfers_balance > 50) {
            reasons.push('📈 גבוה');
        } else if (candidate.transfers_balance > 20) {
            reasons.push('📈 עולה');
        }
        
        // Check high xPts
        if (candidate.predicted_points_1_gw > 6) {
            reasons.push('⚽ תחזית');
        }
        
        // Check good form
        if (parseFloat(candidate.form) > 5) {
            reasons.push('💪 כושר');
        }
        
        // Check high draft score
        if (candidate.draft_score > 85) {
            reasons.push('⭐ עלית');
        }
        
        return reasons.length > 0 ? reasons.join(' • ') : 'איכותי';
    };

    Object.entries(recommendationData).forEach(([key, { player, candidates, position }]) => {
        if (candidates.length === 0) return;
        
        const allInvolved = [player, ...candidates];
        const metrics = config.recommendationMetrics;
        
        let tableHTML = `
            <div class="rec-card">
                <div class="rec-header">
                    <h4>${player.web_name}</h4>
                    <p class="rec-subtitle">${posNames[position]} • ציון: ${player.smart_score.toFixed(1)}</p>
                        </div>
                <table class="rec-table">
                    <thead>
                        <tr>
                            <th style="width: 20%;">מדד</th>
                            <th style="width: 20%;">נוכחי</th>
                            <th style="width: 20%;">#1</th>
                            <th style="width: 20%;">#2</th>
                            <th style="width: 20%;">#3</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="rec-player-row">
                            <td><strong>שחקן</strong></td>
                            ${allInvolved.map(p => `
                                <td>
                                    <div class="rec-player-cell">
                                        <img src="${getPlayerImageUrl(p)}" class="rec-player-img" alt="${p.web_name}">
                                        <div class="rec-player-name">${p.web_name}</div>
                    </div>
                                </td>
            `).join('')}
                        </tr>
                        <tr class="rec-reason-row">
                            <td><strong>סיבה</strong></td>
                            <td>-</td>
                            ${candidates.map(c => `<td class="rec-reason">${getRecommendationReason(c)}</td>`).join('')}
                        </tr>`;
        
        // Add metrics rows
        Object.entries(metrics).forEach(([name, {key, format}]) => {
            const values = allInvolved.map(p => {
                const val = getNestedValue(p, key);
                return val !== null && val !== undefined ? val : 0;
            });
            const bestValue = Math.max(...values);
            const worstValue = Math.min(...values);
            
            tableHTML += `<tr><td><strong>${name}</strong></td>`;
            allInvolved.forEach((p, i) => {
                const val = values[i];
                let cellClass = '';
                if (val === bestValue && bestValue !== worstValue) {
                    cellClass = 'rec-best';
                } else if (val === worstValue && bestValue !== worstValue) {
                    cellClass = 'rec-worst';
                }
                tableHTML += `<td class="${cellClass}">${format(val)}</td>`;
            });
            tableHTML += `</tr>`;
        });
        
        tableHTML += `
                    </tbody>
                </table>
            </div>`;
        
        tablesContainer.innerHTML += tableHTML;
    });

    container.appendChild(tablesContainer);
}

function computeDraftTeamAggregates() {
    const processedById = getProcessedByElementId();
    return (state.draft.details?.league_entries || []).filter(e => e && e.entry_name).map(e => {
        const playerIds = state.draft.rostersByEntryId.get(e.id) || [];
        const players = playerIds.map(id => processedById.get(id)).filter(Boolean);
        if (!players.length) return { team: e.entry_name, metrics: {} };
        
        const sumDraft = players.reduce((s,p)=>s+p.draft_score,0);
        const sumPred = players.reduce((s,p)=>s+(p.predicted_points_4_gw||0),0);
        const totalPrice = players.reduce((s,p)=>s+p.now_cost,0);
        const sumSelectedBy = players.reduce((s,p)=>s+parseFloat(p.selected_by_percent),0);
        const gaTotal = players.reduce((s,p)=>s+(p.goals_scored||0)+(p.assists||0),0);
        const totalCleanSheets = players.reduce((s,p)=>s+(p.clean_sheets||0),0);
        const totalXGI = players.reduce((s,p)=>s+(parseFloat(p.expected_goal_involvements)||0),0);
        const totalDefCon = players.reduce((s,p)=>s+(p.def_contrib_per90||0),0);
        const teamName = e.entry_name;

        return { team: teamName, metrics: { sumDraft, sumPred, totalPrice, sumSelectedBy, gaTotal, totalCleanSheets, totalXGI, totalDefCon } };
    });
}

function populateAnalyticsHighlight() {
    const select = document.getElementById('analyticsHighlight');
    if (!select) return;
    
    select.innerHTML = '<option value="">כל הקבוצות (ללא הדגשה)</option>';
    
    if (state.draft.details && state.draft.details.league_entries) {
        state.draft.details.league_entries
            .filter(e => e && e.entry_name && e.entry_name.toLowerCase() !== 'average')
            .forEach(entry => {
                const option = document.createElement('option');
                option.value = entry.entry_name;
                option.textContent = entry.entry_name;
                select.appendChild(option);
            });
    }
}

function updateAnalyticsHighlight() {
    const aggregates = computeDraftTeamAggregates();
    renderDraftAnalytics(aggregates);
    
    const selectedTeam = document.getElementById('analyticsHighlight')?.value;
    if (selectedTeam) {
        showToast('הדגשה', `מדגיש את ${selectedTeam}`, 'info', 2000);
    } else {
        showToast('הדגשה', 'הוסרה ההדגשה', 'info', 2000);
    }
}

function renderH2HCalendar() {
    const container = document.getElementById('h2hCalendar');
    if (!container) return;
    
    const matches = state.draft.details?.matches || [];
    if (matches.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">אין נתוני משחקים זמינים</p>';
        return;
    }
    
    const currentGW = state.draft.details?.league?.current_event || 10;
    
    // Group matches by gameweek and sort
    const matchesByGW = {};
    matches.forEach(m => {
        const gw = m.event;
        if (!matchesByGW[gw]) matchesByGW[gw] = [];
        matchesByGW[gw].push(m);
    });
    
    // Show only last 3 GWs and next 3 GWs
    const gwsToShow = [];
    for (let i = Math.max(1, currentGW - 2); i <= Math.min(currentGW + 3, 38); i++) {
        if (matchesByGW[i]) gwsToShow.push(i);
    }
    
    let html = '<div class="h2h-grid">';
    
    gwsToShow.forEach(gw => {
        matchesByGW[gw].forEach((match, idx) => {
            const team1Name = state.draft.entryIdToTeamName.get(match.league_entry_1) || 'Unknown';
            const team2Name = state.draft.entryIdToTeamName.get(match.league_entry_2) || 'Unknown';
            const score1 = match.league_entry_1_points || 0;
            const score2 = match.league_entry_2_points || 0;
            const isFinished = match.finished || gw < currentGW;
            const winner = isFinished && score1 !== score2 ? (score1 > score2 ? 1 : 2) : 0;
            
            html += `
                <div class="h2h-match ${winner ? 'h2h-winner' : ''}" style="animation-delay: ${idx * 0.05}s;">
                    <div class="h2h-match-header">
                        <span class="h2h-gw">GW${gw}</span>
                        <span class="h2h-status ${isFinished ? 'finished' : 'upcoming'}">
                            ${isFinished ? '✓ הסתיים' : '⏳ עתידי'}
                        </span>
                    </div>
                    <div class="h2h-teams">
                        <div class="h2h-team ${winner === 1 ? 'winner' : ''}">
                            <div class="h2h-team-name">${team1Name}</div>
                            <div class="h2h-team-score">${isFinished ? score1 : '-'}</div>
                        </div>
                        <div class="h2h-vs">VS</div>
                        <div class="h2h-team ${winner === 2 ? 'winner' : ''}">
                            <div class="h2h-team-name">${team2Name}</div>
                            <div class="h2h-team-score">${isFinished ? score2 : '-'}</div>
                        </div>
                    </div>
                </div>
            `;
        });
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function renderProgressChart() {
    const canvas = document.getElementById('progressChartCanvas');
    if (!canvas) return;
    
    const standings = state.draft.standings?.standings || state.draft.details?.standings || [];
    if (standings.length === 0) return;
    
    // Get current gameweek
    const currentGW = state.draft.details?.league?.current_event || 10;
    
    // Create gameweek labels
    const labels = Array.from({length: currentGW}, (_, i) => `GW${i + 1}`);
    
    // Get team colors
    const colorMap = {};
    standings.forEach(s => {
        const teamName = s.entry_name || s.league_entry?.entry_name;
        if (teamName) colorMap[teamName] = getTeamColor(teamName);
    });
    
    // Create datasets (one per team)
    const datasets = standings
        .filter(s => s.entry_name && s.entry_name.toLowerCase() !== 'average')
        .map(s => {
            const teamName = s.entry_name;
            const color = colorMap[teamName];
            
            // Simulate cumulative points over gameweeks
            // In real implementation, you'd fetch actual gameweek-by-gameweek data
            const totalPoints = s.points_for || 0;
            const pointsPerGW = totalPoints / currentGW;
            const data = Array.from({length: currentGW}, (_, i) => 
                Math.round(pointsPerGW * (i + 1) + (Math.random() * 20 - 10)) // Add some variance
            );
            
            return {
                label: teamName,
                data: data,
                borderColor: color,
                backgroundColor: hexToRgba(color, 0.1),
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: false
            };
        });
    
    const ctx = canvas.getContext('2d');
    
    if (state.draft.charts.progress) {
        state.draft.charts.progress.destroy();
    }
    
    state.draft.charts.progress = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: 'התקדמות נקודות לאורך העונה',
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    color: '#0f172a'
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 11,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(2, 132, 199, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y} נקודות`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'נקודות מצטברות',
                        font: {
                            size: 13,
                            weight: '600'
                        }
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.15)'
                    },
                    ticks: {
                        color: '#64748b',
                        font: { size: 11 }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'מחזור',
                        font: {
                            size: 13,
                            weight: '600'
                        }
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#475569',
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}

function renderDraftAnalytics(teamAggregates) {
    const host = document.getElementById('draftAnalytics');
    host.innerHTML = '';
    if (!teamAggregates.length) return;

    const highlightTeam = document.getElementById('analyticsHighlight')?.value || '';
    const colorMap = {};
    teamAggregates.forEach(t => colorMap[t.team] = getTeamColor(t.team));

    const dims = config.draftAnalyticsDimensions;

    dims.forEach((dim, index) => {
        const card = document.createElement('div');
        card.className = 'analytics-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        // Header with icon
        const header = document.createElement('div');
        header.className = 'analytics-card-header';
        
        const iconMap = {
            'sumDraft': '🏆',
            'sumPred': '📈',
            'totalPrice': '💰',
            'sumSelectedBy': '👥',
            'gaTotal': '⚽',
            'totalCleanSheets': '🛡️',
            'totalXGI': '🎯',
            'totalDefCon': '🔒'
        };
        
        const icon = document.createElement('span');
        icon.className = 'analytics-icon';
        icon.textContent = iconMap[dim.key] || '📊';
        
        const title = document.createElement('h3');
        title.className = 'analytics-title';
        title.textContent = dim.label;
        
        header.appendChild(icon);
        header.appendChild(title);
        
        // Canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'analytics-canvas-container';
        
        const canvas = document.createElement('canvas');
        canvas.id = `draftAnalytic_${dim.key}`;
        canvasContainer.appendChild(canvas);
        
        card.appendChild(header);
        card.appendChild(canvasContainer);
        host.appendChild(card);
        
        // Sort teams by the metric desc
        const sorted = teamAggregates.map(t => ({ name: t.team, value: t.metrics[dim.key] || 0 }))
            .sort((a,b)=> b.value - a.value);
            
        const labels = sorted.map(s=>s.name);
        const values = sorted.map(s=>s.value);
        
        if (state.draft.charts.analytics[dim.key]) { state.draft.charts.analytics[dim.key].destroy(); }

        const ctx = canvas.getContext('2d');
        state.draft.charts.analytics[dim.key] = new Chart(ctx, {
            type: 'bar',
        data: {
                labels,
            datasets: [{
                    label: dim.label,
                    data: values,
                    borderRadius: 12,
                    barThickness: 'flex',
                    maxBarThickness: 60,
                    backgroundColor: labels.map(n => {
                        const c = colorMap[n];
                        const isHi = highlightTeam && n === highlightTeam;
                        // Highlighted: full opacity with glow, Others: faded
                        if (highlightTeam) {
                            return isHi ? c : hexToRgba(c, 0.25);
                        }
                        return hexToRgba(c, 0.75);
                    }),
                    borderColor: labels.map(n => {
                        const c = colorMap[n];
                        const isHi = highlightTeam && n === highlightTeam;
                        return isHi ? '#ffffff' : 'transparent';
                    }),
                    borderWidth: labels.map(n => {
                        const isHi = highlightTeam && n === highlightTeam;
                        return isHi ? 5 : 0;
                    }),
                    hoverBackgroundColor: labels.map(n => {
                        const c = colorMap[n];
                        return hexToRgba(c, 0.95);
                    }),
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        grid: { 
                            color: 'rgba(148, 163, 184, 0.15)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: { size: 14, weight: '600' },
                            padding: 8
                        }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: {
                            color: '#475569',
                            font: { size: 11, weight: '600' },
                            padding: 6,
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                },
            plugins: {
                    legend: { display: false },
                tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        titleColor: '#1e293b',
                        bodyColor: '#334155',
                        footerColor: '#64748b',
                        borderColor: 'rgba(2, 132, 199, 0.8)',
                        borderWidth: 2,
                        padding: 11,
                        displayColors: false,
                        titleFont: { size: 12.1, weight: '700' },
                        bodyFont: { size: 9.9, family: 'system-ui, -apple-system' },
                        footerFont: { size: 8.8, weight: '500' },
                        bodySpacing: 3.3,
                        footerSpacing: 4.4,
                        footerMarginTop: 6.6,
                        cornerRadius: 8,
                        caretSize: 5.5,
                        caretPadding: 6.6,
                    callbacks: {
                            title: function(context) {
                                const teamName = context[0].label;
                                const value = context[0].parsed.y;
                                const formattedValue = typeof value === 'number' ? 
                                    (value % 1 === 0 ? Math.round(value) : value.toFixed(1)) : value;
                                return `${teamName} - סה"כ: ${formattedValue}`;
                            },
                            beforeBody: function(context) {
                                return ''; // Remove separator
                            },
                        label: function(context) {
                                // Get team name and find its players
                                const teamName = context.label;
                                const teamEntry = (state.draft.details?.league_entries || []).find(e => e.entry_name === teamName);
                                if (!teamEntry) return ['לא נמצאו נתונים'];
                                
                                const playerIds = state.draft.rostersByEntryId.get(teamEntry.id) || [];
                                const processedById = getProcessedByElementId();
                                const players = playerIds.map(id => processedById.get(id)).filter(Boolean);
                                
                                if (players.length === 0) return ['אין שחקנים'];
                                
                                // Calculate player contributions based on metric
                                const metricKey = dim.key;
                                let playerContributions = [];
                                
                                players.forEach(p => {
                                    let contribution = 0;
                                    let displayValue = 0;
                                    
                                    switch(metricKey) {
                                        case 'sumDraft':
                                            contribution = p.draft_score || 0;
                                            displayValue = Math.round(contribution);
                                            break;
                                        case 'sumPred':
                                            contribution = p.predicted_points_4_gw || 0;
                                            displayValue = Math.round(contribution);
                                            break;
                                        case 'totalPrice':
                                            contribution = p.now_cost || 0;
                                            displayValue = contribution.toFixed(1);
                                            break;
                                        case 'sumSelectedBy':
                                            contribution = parseFloat(p.selected_by_percent) || 0;
                                            displayValue = contribution.toFixed(1);
                                            break;
                                        case 'gaTotal':
                                            contribution = (p.goals_scored || 0) + (p.assists || 0);
                                            displayValue = contribution;
                                            break;
                                        case 'totalCleanSheets':
                                            contribution = p.clean_sheets || 0;
                                            displayValue = contribution;
                                            break;
                                        case 'totalXGI':
                                            contribution = parseFloat(p.expected_goal_involvements) || 0;
                                            displayValue = contribution.toFixed(1);
                                            break;
                                        case 'totalDefCon':
                                            contribution = p.def_contrib_per90 || 0;
                                            displayValue = contribution.toFixed(1);
                                            break;
                                    }
                                    
                                    if (contribution > 0) {
                                        playerContributions.push({
                                            name: p.web_name,
                                            value: contribution,
                                            display: displayValue,
                                            position: p.position_name
                                        });
                                    }
                                });
                                
                                // Sort by contribution (descending)
                                playerContributions.sort((a, b) => b.value - a.value);
                                
                                // Return all players (up to 15) - simple format: Position | Name | Value
                                // Top 3 will be marked with a special prefix and bold name
                                const posMap = {
                                    'GKP': 'GK',
                                    'DEF': 'DF',
                                    'MID': 'MF',
                                    'FWD': 'ST'
                                };
                                
                                // Helper function to convert text to bold (Unicode Mathematical Bold)
                                const toBold = (text) => {
                                    const boldMap = {
                                        'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
                                        'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
                                        'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
                                        'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
                                        'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
                                        'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
                                        '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
                                    };
                                    return text.split('').map(char => boldMap[char] || char).join('');
                                };
                                
                                return playerContributions.slice(0, 15).map((pc, idx) => {
                                    const pos = posMap[pc.position] || pc.position;
                                    // Mark top 3 with green indicator and bold name
                                    const prefix = idx < 3 ? '🟢 ' : '   ';
                                    const playerName = idx < 3 ? toBold(pc.name) : pc.name;
                                    return `${prefix}${pos} | ${playerName} | ${pc.display}`;
                                });
                            },
                            footer: function(context) {
                                const teamName = context[0].label;
                                const teamEntry = (state.draft.details?.league_entries || []).find(e => e.entry_name === teamName);
                                if (!teamEntry) return '';
                                
                                const playerIds = state.draft.rostersByEntryId.get(teamEntry.id) || [];
                                const total = playerIds.length;
                                
                                return total > 15 ? `מציג 15 מתוך ${total} שחקנים` : `סה"כ ${total} שחקנים`;
                            }
                        }
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        clamp: true,
                        offset: 6,
                        color: function(context) {
                            const isHighlighted = highlightTeam && labels[context.dataIndex] === highlightTeam;
                            return isHighlighted ? '#ffffff' : '#475569';
                        },
                        backgroundColor: function(context) {
                            const isHighlighted = highlightTeam && labels[context.dataIndex] === highlightTeam;
                            return isHighlighted ? '#0284c7' : 'transparent';
                        },
                        borderRadius: function(context) {
                            const isHighlighted = highlightTeam && labels[context.dataIndex] === highlightTeam;
                            return isHighlighted ? 6 : 0;
                        },
                        padding: function(context) {
                            const isHighlighted = highlightTeam && labels[context.dataIndex] === highlightTeam;
                            return isHighlighted ? { top: 6, bottom: 6, left: 10, right: 10 } : 0;
                        },
                        font: function(context) {
                            const isHighlighted = highlightTeam && labels[context.dataIndex] === highlightTeam;
                            return { 
                                size: isHighlighted ? 18 : 14, 
                                weight: isHighlighted ? '900' : '700' 
                            };
                        },
                        textAlign: 'center',
                        formatter: (v, context) => {
                            const isHighlighted = highlightTeam && labels[context.dataIndex] === highlightTeam;
                            const value = typeof v === 'number' ? Math.round(v) : v;
                            return isHighlighted ? `⭐ ${value}` : value;
                        }
                    }
                }
            }
        });
    });
}

function teamPointsFor(teamName) {
    const standings = (state.draft.standings && state.draft.standings.standings) || (state.draft.details && state.draft.details.standings) || [];
    const teamEntry = (state.draft.details?.league_entries || []).find(e => e.entry_name === teamName);
    if (!teamEntry) return 0;
    const teamStanding = standings.find(s => s.league_entry === teamEntry.id);
    return teamStanding ? (teamStanding.points_for || teamStanding.points_for_total || 0) : 0;
}

function renderDraftMatrices(teamAggregates) {
    const host = document.getElementById('draftMatrices');
    if (!host) return;
    host.innerHTML = '';
    const specs = config.draftMatrixSpecs;

    specs.forEach(spec => {
        const card = document.createElement('div');
        card.className='matrix-card';
        const titleEl = document.createElement('div');
        titleEl.className = 'title';
        titleEl.textContent = spec.title;
        card.appendChild(titleEl);
        
        const chartHost = document.createElement('div');
        chartHost.className = 'chart-host';
        const canvas = document.createElement('canvas');
        canvas.id = `draftMatrix_${spec.key}`;
        chartHost.appendChild(canvas);
        card.appendChild(chartHost);

        host.appendChild(card);
        
        const data = spec.build(teamAggregates);
        
        if (state.draft.charts.matrix && state.draft.charts.matrix[spec.key]) {
             state.draft.charts.matrix[spec.key].destroy();
        }
        if (!state.draft.charts.matrix) state.draft.charts.matrix = {};
        
        // Create improved matrix chart
        const configChart = getMatrixChartConfig(data, spec.xLabel, spec.yLabel, spec.quads);
        state.draft.charts.matrix[spec.key] = new Chart(canvas.getContext('2d'), configChart);
    });
}

function findMyTeam() {
    if (!state.draft.details || !state.draft.details.league_entries) return null;
    // This is fragile, what if the user changes their team name?
    const myEntry = state.draft.details.league_entries.find(e => e.entry_name.includes('Amit'));
    if (!myEntry) {
        console.warn("Could not find user's team by name 'Amit'. Taking first team as fallback.");
        // Fallback to the first team in the list if user's team is not found
        return state.draft.details.league_entries.length > 0 ? { id: state.draft.details.league_entries[0].id, name: state.draft.details.league_entries[0].entry_name } : null;
    }

    return {
        id: myEntry.id, // This is league_entry.id
        name: myEntry.entry_name
    };
}

function renderDraftComparison(aggregates) {
    const container = document.getElementById('draftComparison');
    if (!container) return;
    container.innerHTML = ''; // Clear loader
    
    let tableHTML = '<h2>השוואת קבוצות</h2><table class="styled-table draft-comparison-table"><thead><tr><th>Metric</th>';
    aggregates.forEach(agg => {
        tableHTML += `<th>${agg.team}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    config.draftAnalyticsDimensions.forEach(dim => {
        const values = aggregates.map(agg => agg.metrics[dim.key] || 0);
        const maxVal = Math.max(...values);
        const minVal = Math.min(...values);

        tableHTML += `<tr><td>${dim.label}</td>`;
        aggregates.forEach(agg => {
            const val = agg.metrics[dim.key] || 0;
            let className = '';
            if (val === maxVal) className = 'metric-value-best';
            if (val === minVal) className = 'metric-value-worst';
            tableHTML += `<td class="${className}">${val.toFixed(1)}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

function renderPitch(containerEl, playerIds, isMyLineup = false, benchIds = null) {
    if (!containerEl) {
        console.error('renderPitch: containerEl is null or undefined');
        return;
    }
    
    containerEl.innerHTML = ''; // Clear loader
    
    if (!playerIds || playerIds.length === 0) {
        containerEl.innerHTML = '<p style="text-align:center; padding: 20px; color: #666;">אין שחקנים בסגל.</p>';
        return;
    }
    
    const processedById = getProcessedByElementId();
    
    let startingXI, benchPlayers;
    
    if (benchIds) {
        // Use provided lineup (starting + bench)
        startingXI = playerIds.map(id => processedById.get(id)).filter(Boolean);
        benchPlayers = benchIds.map(id => processedById.get(id)).filter(Boolean);
        console.log(`🎯 Using actual lineup: ${startingXI.length} starting, ${benchPlayers.length} bench`);
            } else {
        // Fallback: auto-select best 11
        const players = playerIds.map(id => processedById.get(id)).filter(Boolean);
        const startingXI_ids = pickStartingXI(playerIds);
        startingXI = startingXI_ids.map(id => processedById.get(id)).filter(Boolean);
        benchPlayers = players.filter(p => !startingXI_ids.includes(p.id));
        console.log(`⚙️ Auto-selected lineup: ${startingXI.length} starting, ${benchPlayers.length} bench`);
    }
    
    if (startingXI.length === 0) {
        console.warn(`renderPitch: Could not find any player data for IDs:`, playerIds.slice(0, 5));
        containerEl.innerHTML = '<p style="text-align:center; padding: 20px; color: #e74c3c;">לא נמצאו נתוני שחקנים.</p>';
        return;
    }

    const pitch = document.createElement('div');
    pitch.className = isMyLineup ? 'pitch-container my-lineup' : 'pitch-container other-team';
    
    // Add pitch lines
    pitch.innerHTML = `
        <div class="pitch-lines">
            <div class="pitch-half"></div>
            <div class="pitch-circle"></div>
            <div class="penalty-top"></div>
            <div class="penalty-bottom"></div>
            <div class="goal-top"></div>
            <div class="goal-bottom"></div>
        </div>
    `;

    const byPos = { GKP: [], DEF: [], MID: [], FWD: [] };
    startingXI.forEach(p => byPos[p.position_name].push(p));
    
    // Sort players within position by name for consistent layout
    for (const pos in byPos) {
        byPos[pos].sort((a,b) => a.web_name.localeCompare(b.web_name));
    }

    const rowsY = { GKP: 92, DEF: 75, MID: 50, FWD: 25 };

    const placeRow = (players, y) => {
        const count = players.length;
        if (count === 0) return;
        players.forEach((p, i) => {
            const spot = document.createElement('div');
            spot.className = 'player-spot';
            spot.style.top = `${y}%`;
            spot.style.left = `${(i + 1) * 100 / (count + 1)}%`;
            
            spot.innerHTML = `
                <img class="player-photo" src="${getPlayerImageUrl(p)}" alt="${p.web_name}" 
                     onerror="this.src='${config.urls.missingPlayerImage}'">
                <div class="player-name">${p.web_name}</div>
            `;
            pitch.appendChild(spot);
        });
    };

    placeRow(byPos.GKP, rowsY.GKP);
    placeRow(byPos.DEF, rowsY.DEF);
    placeRow(byPos.MID, rowsY.MID);
    placeRow(byPos.FWD, rowsY.FWD);
    
    containerEl.appendChild(pitch);

    // Bench
    if (benchPlayers.length > 0) {
        const bench = document.createElement('div');
        bench.className = 'bench-strip';
        bench.innerHTML = benchPlayers.map(p => `
            <div class="bench-item">
                <img src="${getPlayerImageUrl(p)}" alt="${p.web_name}" 
                     onerror="this.src='${config.urls.missingPlayerImage}'">
                <div>${p.web_name}</div>
            </div>
        `).join('');
        containerEl.appendChild(bench);
    }
}

function renderDraftRosters() {
    const container = document.getElementById('otherRosters');
    if (!container) {
        console.error('renderDraftRosters: otherRosters container not found');
        return;
    }
    
    container.innerHTML = '';
    const myTeamId = findMyTeam()?.id;

    if (!state.draft.rostersByEntryId || state.draft.rostersByEntryId.size === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 40px; color: #666;">לא נמצאו סגלים להצגה.</p>';
        console.warn('renderDraftRosters: No rosters found in state');
        return;
    }

    let rosteredCount = 0;
    for (const [teamId, playerIds] of state.draft.rostersByEntryId.entries()) {
        if (teamId === myTeamId) continue;
        
        const teamName = state.draft.entryIdToTeamName.get(teamId);
        if (!teamName || teamName.toLowerCase() === 'average') continue;

        const rosterContainer = document.createElement('div');
        rosterContainer.className = 'roster-container';
        
        const title = document.createElement('h3');
        title.className = 'roster-title';
        title.textContent = teamName;
        rosterContainer.appendChild(title);
        
        const pitchHost = document.createElement('div');
        rosterContainer.appendChild(pitchHost);

        // Append container first, then render pitch
        container.appendChild(rosterContainer);
        renderPitch(pitchHost, playerIds, false);
        rosteredCount++;
    }
    
    console.log(`renderDraftRosters: Successfully rendered ${rosteredCount} team rosters`);
    
    if (rosteredCount === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 40px; color: #666;">לא נמצאו סגלים להצגה.</p>';
    }
}

// ============================================
// MY TEAM SELECTOR (Added)
// ============================================
function populateMyTeamSelector() {
    const select = document.getElementById('myTeamSelect');
    if (!select) return;
    
    // Clear existing
    select.innerHTML = '<option value="">-- בחר קבוצה --</option>';
    
    // Get league entries
    const entries = state.draft.details?.league_entries || [];
    
    entries.forEach(entry => {
        if (!entry.entry_name) return;
        const option = document.createElement('option');
        option.value = entry.id;
        option.textContent = `${entry.player_first_name} ${entry.player_last_name} (${entry.entry_name})`;
        select.appendChild(option);
    });
    
    // Set current value if exists
    if (state.draft.myTeamId) {
        select.value = state.draft.myTeamId;
    }
}

function setMyTeam(teamId) {
    if (!teamId) return;
    
    state.draft.myTeamId = parseInt(teamId);
    
    // Save to local storage for persistence
    localStorage.setItem('draft_my_team_id', teamId);
    
    // Update UI components that depend on My Team
    renderMyLineup(teamId);
    renderRecommendations();
    renderNextRivalAnalysis(); // Update Rival Analysis
    
    // Update Chart Highlight
    renderAllTeamsTrendChart(null, 'cumulative', teamId);
    
    showToast('הקבוצה עודכנה', 'הנתונים וההמלצות עודכנו בהתאם לקבוצה שנבחרה', 'success');
}

// ============================================
// RIVAL ANALYSIS & SQUAD COMPARISON
// ============================================
function getNextOpponent(myEntryId) {
    const details = state.draft.details;
    if (!details || !details.matches) return null;

    const currentEvent = details.league.current_event; 
    
    // 1. Try Current Event Match (Exact Match)
    let nextMatch = details.matches.find(m => 
        m.event === currentEvent && 
        (m.league_entry_1 === myEntryId || m.league_entry_2 === myEntryId)
    );

    // 2. If not found, try Next Event Match (Current + 1)
    if (!nextMatch) {
        nextMatch = details.matches.find(m => 
            m.event === currentEvent + 1 && 
            (m.league_entry_1 === myEntryId || m.league_entry_2 === myEntryId)
        );
    }
    
    // 3. Fallback: Find first unfinished/future match (Event >= Current)
    if (!nextMatch) {
         const futureMatches = details.matches.filter(m => 
            m.event >= currentEvent && 
            (m.league_entry_1 === myEntryId || m.league_entry_2 === myEntryId)
         ).sort((a,b) => a.event - b.event);
         
         if (futureMatches.length > 0) nextMatch = futureMatches[0];
    }

    if (!nextMatch) return null;

    const isEntry1 = nextMatch.league_entry_1 === myEntryId;
    const opponentId = isEntry1 ? nextMatch.league_entry_2 : nextMatch.league_entry_1;
    
    return {
        match: nextMatch,
        opponentId: opponentId,
        opponentName: state.draft.entryIdToTeamName.get(opponentId) || 'Unknown',
        isHome: isEntry1 
    };
}

function renderNextRivalAnalysis() {
    const container = document.getElementById('rivalAnalysisContainer');
    if (!container) return;
    
    // Initial Loading State
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;"><div class="spinner"></div> מחשב סיכויים ומנתח הרכבים...</div>';

    try {
        const myTeam = findMyTeam();
        if (!myTeam) {
            container.innerHTML = '<div class="alert alert-warning">לא נבחרה קבוצה. אנא בחר את הקבוצה שלך בתפריט ההגדרות.</div>';
            return;
        }

        const opponentData = getNextOpponent(myTeam.id);
        
        // Handle "No Match Found" cleanly
        if (!opponentData) {
            container.innerHTML = `
                <div class="alert alert-info" style="text-align:center; padding:30px; border: 2px dashed #cbd5e1; border-radius: 12px; background: #f8fafc;">
                    <div style="font-size:40px; margin-bottom:10px;">🏖️</div>
                    <h3 style="margin:0; color:#475569;">אין משחקים קרובים</h3>
                    <p style="margin:5px 0 0; color:#64748b;">העונה הסתיימה או שאין משחקים מתוכננים בלוח השנה.</p>
                </div>`;
            return;
        }

        // Get Squads
        const myRosterIds = state.draft.rostersByEntryId.get(myTeam.id) || [];
        const oppRosterIds = state.draft.rostersByEntryId.get(opponentData.opponentId) || [];
        
        const processedById = getProcessedByElementId();
        const mySquad = myRosterIds.map(id => processedById.get(id)).filter(Boolean);
        const oppSquad = oppRosterIds.map(id => processedById.get(id)).filter(Boolean);

        // Helper: Calculate Stats
        const calcStats = (squad) => {
            const totalXPts = squad.reduce((sum, p) => sum + (parseFloat(p.predicted_points_1_gw) || 0), 0);
            const totalXGI = squad.reduce((sum, p) => sum + (parseFloat(p.expected_goal_involvements) || 0), 0);
            const totalForm = squad.reduce((sum, p) => sum + (parseFloat(p.form) || 0), 0);
            return { xPts: totalXPts, xGI: totalXGI, form: totalForm };
        };

        const myStats = calcStats(mySquad);
        const oppStats = calcStats(oppSquad);
        
        // Prevent division by zero for charts
        const formTotal = (myStats.form + oppStats.form) || 1;
        const xgiTotal = (myStats.xGI + oppStats.xGI) || 1;

        // Build HTML
        let html = `
            <div class="rival-header" style="display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 15px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 20px;">
                <div class="team-badge my-team" style="text-align: center;">
                    <div style="font-size: 24px;">🦁</div>
                    <div style="font-weight: 800; color: #0f172a;">${myTeam.name}</div>
                    <div style="font-size: 12px; color: #3b82f6; font-weight: 700;">xPts: ${myStats.xPts.toFixed(1)}</div>
                </div>
                
                <div class="versus-badge" style="text-align: center;">
                    <span style="display: block; font-weight: 900; font-size: 18px; color: #94a3b8;">VS</span>
                    <span style="display: block; font-size: 11px; background: #f1f5f9; padding: 2px 8px; border-radius: 10px; color: #64748b;">GW${opponentData.match.event || '?'}</span>
                </div>
                
                <div class="team-badge opp-team" style="text-align: center;">
                    <div style="font-size: 24px;">🛡️</div>
                    <div style="font-weight: 800; color: #0f172a;">${opponentData.opponentName}</div>
                    <div style="font-size: 12px; color: #ef4444; font-weight: 700;">xPts: ${oppStats.xPts.toFixed(1)}</div>
                </div>
            </div>

            <div class="rival-stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div class="stat-box" style="background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <h4 style="margin: 0 0 10px; font-size: 13px; color: #64748b;">כושר נוכחי (Form)</h4>
                    <div class="stat-bar-container" style="display: flex; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; margin-bottom: 5px;">
                        <div class="stat-bar my-bar" style="width: ${(myStats.form / formTotal * 100)}%; background: #3b82f6;"></div>
                        <div class="stat-bar opp-bar" style="width: ${(oppStats.form / formTotal * 100)}%; background: #ef4444;"></div>
                    </div>
                    <div class="stat-values" style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700;">
                        <span style="color:#3b82f6">${myStats.form.toFixed(1)}</span>
                        <span style="color:#ef4444">${oppStats.form.toFixed(1)}</span>
                    </div>
                </div>

                <div class="stat-box" style="background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <h4 style="margin: 0 0 10px; font-size: 13px; color: #64748b;">פוטנציאל התקפי (xGI)</h4>
                    <div class="stat-bar-container" style="display: flex; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; margin-bottom: 5px;">
                        <div class="stat-bar my-bar" style="width: ${(myStats.xGI / xgiTotal * 100)}%; background: #3b82f6;"></div>
                        <div class="stat-bar opp-bar" style="width: ${(oppStats.xGI / xgiTotal * 100)}%; background: #ef4444;"></div>
                    </div>
                    <div class="stat-values" style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700;">
                        <span style="color:#3b82f6">${myStats.xGI.toFixed(2)}</span>
                        <span style="color:#ef4444">${oppStats.xGI.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;

        // === SQUAD OVERLAPS LOGIC ===
        const analyzeSquadComposition = (squad) => {
            const composition = {};
            squad.forEach(p => {
                const key = `${p.team_name} ${p.position_name}`; // e.g. "Arsenal DEF"
                composition[key] = (composition[key] || 0) + 1;
            });
            return composition;
        };
        
        const myComp = analyzeSquadComposition(mySquad);
        const oppComp = analyzeSquadComposition(oppSquad);
        
        let overlapsHtml = '';
        const allKeys = new Set([...Object.keys(myComp), ...Object.keys(oppComp)]);
        
        allKeys.forEach(key => {
            const myCount = myComp[key] || 0;
            const oppCount = oppComp[key] || 0;
            
            if (myCount > 0 && oppCount > 0) {
                overlapsHtml += `
                    <div class="overlap-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                        <div class="overlap-label" style="font-weight: 600; font-size: 13px; color: #334155;">${key}</div>
                        <div class="overlap-values" style="font-family: monospace; font-weight: 700;">
                            <span style="color:#3b82f6">${myCount}</span>
                            <span style="color:#94a3b8; font-size: 11px; margin: 0 4px;">vs</span>
                            <span style="color:#ef4444">${oppCount}</span>
                        </div>
                    </div>
                `;
            }
        });
        
        if (overlapsHtml) {
            html += `
                <div class="overlap-section" style="background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <h3 style="margin: 0 0 10px; font-size: 14px; color: #0f172a; font-weight: 700;">🤝 חפיפות ונטרולים (Squad Overlaps)</h3>
                    <div class="overlap-grid">${overlapsHtml}</div>
                    <div style="margin-top: 8px; font-size: 11px; color: #64748b; text-align: right;">* שחקנים מאותה קבוצה ואותה עמדה מנטרלים זה את זה</div>
                </div>
            `;
        }

        container.innerHTML = html;

    } catch (err) {
        console.error('CRITICAL ERROR in renderNextRivalAnalysis:', err);
        container.innerHTML = `<div class="alert alert-danger">
            <strong>שגיאה בטעינת הנתונים:</strong><br>
            ${err.message}
            <br><small>בדוק את הקונסול לפרטים נוספים.</small>
        </div>`;
    }
}

// ============================================
// TREND CHART (Updated)
// ============================================

window.renderAllTeamsTrendChart = function(teamAggregates, mode = 'cumulative', highlightTeamIds = []) {
    // Note: highlightTeamIds can be a single ID (string/number) or array of IDs.
    if (!Array.isArray(highlightTeamIds)) {
        highlightTeamIds = highlightTeamIds ? [highlightTeamIds] : [];
    }

    // Default to including My Team if not specified
    if (highlightTeamIds.length === 0 && state.draft.myTeamId) {
        highlightTeamIds = [state.draft.myTeamId];
    }
    
    // Ensure all are strings for comparison
    highlightTeamIds = highlightTeamIds.map(id => String(id));

    console.log('📈 renderAllTeamsTrendChart called', { mode, highlightTeamIds });
    const container = document.getElementById('chart-progress');
    if (!container) return;

    // Data Preparation
    const matches = state.draft.details?.matches || [];
    const entries = state.draft.details?.league_entries || [];
    
    if (!matches.length || !entries.length) {
        container.innerHTML = '<div class="alert alert-info">אין נתונים להצגת גרף מגמה.</div>';
        return;
    }

    let currentMetric = document.getElementById('trendMetricSelect')?.value || 'points';

    const teamsOptions = entries.map(e => {
        const isSelected = highlightTeamIds.includes(String(e.id));
        return `<option value="${e.id}" ${isSelected ? 'selected' : ''}>${e.entry_name}</option>`;
    }).join('');

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; gap: 10px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="chart-toggles" style="display: flex; background: #f1f5f9; border-radius: 8px; padding: 2px;">
                    <button onclick="renderAllTeamsTrendChart(null, 'cumulative', getSelectedTeamsForTrend())" class="${mode === 'cumulative' ? 'active' : ''}" style="padding: 6px 12px; border: none; background: ${mode === 'cumulative' ? 'white' : 'transparent'}; color: ${mode === 'cumulative' ? '#3b82f6' : '#64748b'}; font-weight: 600; border-radius: 6px; cursor: pointer;">מצטבר</button>
                    <button onclick="renderAllTeamsTrendChart(null, 'weekly', getSelectedTeamsForTrend())" class="${mode === 'weekly' ? 'active' : ''}" style="padding: 6px 12px; border: none; background: ${mode === 'weekly' ? 'white' : 'transparent'}; color: ${mode === 'weekly' ? '#3b82f6' : '#64748b'}; font-weight: 600; border-radius: 6px; cursor: pointer;">מחזורי</button>
                </div>
                
                <select id="trendMetricSelect" onchange="renderAllTeamsTrendChart(null, '${mode}', getSelectedTeamsForTrend())" style="padding: 6px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px;">
                    <option value="points" ${currentMetric === 'points' ? 'selected' : ''}>נקודות</option>
                    <option value="table_points" ${currentMetric === 'table_points' ? 'selected' : ''}>נקודות בטבלה (נצחונות)</option>
                </select>
            </div>
            
            <div style="display: flex; align-items: center; gap: 8px;">
                <label for="chartHighlightSelect" style="font-size: 13px; color: #64748b; font-weight: 600;">השוואת קבוצות:</label>
                <select id="chartHighlightSelect" multiple onchange="renderAllTeamsTrendChart(null, '${mode}', getSelectedTeamsForTrend())" style="padding: 6px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; color: #334155; cursor: pointer; background: white; max-width: 200px; height: 35px;">
                    ${teamsOptions}
                </select>
            </div>
        </div>
        <div style="height: 400px; position: relative; width: 100%;">
            <canvas id="trendCanvas"></canvas>
        </div>
        <div style="text-align: right; font-size: 11px; color: #94a3b8; margin-top: 5px;">* החזק Ctrl כדי לבחור מספר קבוצות</div>
    `;

    const historyMap = new Map(); 
    
    entries.forEach(e => {
        historyMap.set(String(e.id), { 
            name: e.entry_name, 
            points: [],
            cumulative: [] 
        });
    });

    const finishedMatches = matches.filter(m => m.finished).sort((a, b) => a.event - b.event);
    const maxGW = finishedMatches.length ? finishedMatches[finishedMatches.length-1].event : 0;
    
    entries.forEach(e => {
        for (let gw = 1; gw <= maxGW; gw++) {
            historyMap.get(String(e.id)).points.push(0);
        }
    });

    finishedMatches.forEach(m => {
        const gwIdx = m.event - 1;
        const id1 = String(m.league_entry_1);
        const id2 = String(m.league_entry_2);
        
        let p1 = 0, p2 = 0;
        
        if (currentMetric === 'points') {
            p1 = m.league_entry_1_points;
            p2 = m.league_entry_2_points;
        } else {
            if (m.league_entry_1_points > m.league_entry_2_points) { p1 = 3; p2 = 0; }
            else if (m.league_entry_1_points < m.league_entry_2_points) { p1 = 0; p2 = 3; }
            else { p1 = 1; p2 = 1; }
        }

        if (historyMap.has(id1)) historyMap.get(id1).points[gwIdx] = p1;
        if (historyMap.has(id2)) historyMap.get(id2).points[gwIdx] = p2;
    });

    historyMap.forEach((data, id) => {
        let sum = 0;
        data.points.forEach(p => {
            sum += p;
            data.cumulative.push(sum);
        });
    });

    const datasets = Array.from(historyMap.entries())
        .filter(([entryId, team]) => highlightTeamIds.includes(entryId))
        .map(([entryId, team], index) => {
            const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];
            const color = colors[index % colors.length];
            
            return {
                label: team.name,
                data: mode === 'cumulative' ? team.cumulative : team.points,
                borderColor: color,
                backgroundColor: color,
                borderWidth: 3,
                pointRadius: 4,
                tension: 0.4,
                fill: false
            };
    });

    const labels = Array.from({length: maxGW}, (_, i) => `GW${i+1}`);
    const canvas = document.getElementById('trendCanvas');
    
    if (window.trendChartInstance) {
        window.trendChartInstance.destroy();
    }

    window.trendChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', align: 'end' },
                tooltip: { 
                    mode: 'index', 
                    intersect: false,
                    callbacks: { title: (items) => `מחזור ${items[0].label}` }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    title: { display: true, text: currentMetric === 'points' ? 'נקודות' : 'נקודות ליגה' }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}

window.getSelectedTeamsForTrend = function() {
    const select = document.getElementById('chartHighlightSelect');
    if (!select) return [];
    return Array.from(select.selectedOptions).map(opt => opt.value);
}

function switchDraftTab(tabId) {
    const contents = document.querySelectorAll('.draft-sub-content');
    contents.forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });
    
    const selected = document.getElementById(`draft-${tabId}`);
    if (selected) {
        selected.classList.add('active');
        selected.style.display = 'block';
    }
    
    const buttons = document.querySelectorAll('.draft-nav-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = '#64748b';
        btn.style.boxShadow = 'none';
        
        if (btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
            btn.style.background = '#eff6ff';
            btn.style.color = '#3b82f6';
            btn.style.boxShadow = '0 2px 4px rgba(59,130,246,0.1)';
        }
    });
    
    if (tabId === 'overview' && window.trendChartInstance) {
        setTimeout(() => window.trendChartInstance.resize(), 100);
    }
    
    if (tabId === 'rival') {
        renderNextRivalAnalysis();
    }
}

