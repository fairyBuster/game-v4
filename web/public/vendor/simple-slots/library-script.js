// Library Page JavaScript

document.addEventListener('DOMContentLoaded', function () {
    // Mobile Menu Toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Filter buttons functionality
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));

            // Add active class to clicked button
            btn.classList.add('active');

            // Get the filter value
            const filterValue = btn.getAttribute('data-filter');

            // Filter the games
            filterGames(filterValue);
        });
    });

    // Game search functionality
    const searchInput = document.getElementById('game-search');
    const searchBtn = document.getElementById('search-btn');

    searchBtn.addEventListener('click', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        searchGames(searchTerm);
    });

    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = e.target.value.toLowerCase().trim();
            searchGames(searchTerm);
        }
    });

    // Game data - populate based on your actual themes
    const gamesData = [
        {
            id: 'Gemstones',
            title: 'Gemstones Jackpot',
            description: 'Discover a dazzling world of precious gems with stunning visual effects and multiple ways to win big!',
            thumbnail: 'themes/gemstones/images/title.jpg',
            date: 'April 15, 2025',
            category: ['all', 'popular', 'jackpot', 'new'],
            badge: 'Featured'
        },
        {
            id: 'Pirate',
            title: 'Pirate\'s Treasure',
            description: 'Set sail on a swashbuckling adventure with animated ocean waves and hidden treasure chest bonuses.',
            thumbnail: 'themes/pirate/images/title.jpg',
            date: 'March 22, 2025',
            category: ['all', 'popular', 'jackpot'],
            badge: 'Hot'
        },
        {
            id: 'Ancient Egypt',
            title: 'Pharaoh\'s Fortune',
            description: 'Journey to ancient Egypt where mysterious hieroglyphs and golden pyramids can lead to legendary rewards.',
            thumbnail: 'themes/ancient-egypt/images/title.jpg',
            date: 'February 10, 2025',
            category: ['all', 'jackpot'],
            badge: null
        },
        {
            id: 'aztec',
            title: 'Aztec Gold',
            description: 'Explore the mystical temples of the Aztec civilization with sun beams and prismatic effects guiding your path to riches.',
            thumbnail: 'themes/aztec/images/title.jpg',
            date: 'January 5, 2025',
            category: ['all', 'popular'],
            badge: null
        },
        {
            id: 'classic',
            title: 'Classic Slots',
            description: 'Experience the nostalgia of traditional slot machines with fruits, sevens, and bells, enhanced with modern visual flair.',
            thumbnail: 'themes/classic/images/title.jpg',
            date: 'December 12, 2024',
            category: ['all'],
            badge: null
        },
        {
            id: 'Fantasy Forest',
            title: 'Enchanted Forest',
            description: 'Wander through a magical forest filled with fireflies, floating leaves, and mystical creatures that award generous bonuses.',
            thumbnail: 'themes/fantasy-forest/images/title.jpg',
            date: 'November 18, 2024',
            category: ['all', 'popular', 'new'],
            badge: 'New'
        },
        {
            id: 'Space Adventure',
            title: 'Cosmic Quest',
            description: 'Blast off into the stars with this space-themed adventure featuring nebulae, planets, and asteroid field bonus rounds.',
            thumbnail: 'themes/space-adventure/images/title.png',
            date: 'October 30, 2024',
            category: ['all', 'jackpot'],
            badge: null
        }
    ];

    // Function to generate game cards
    function generateGameCards(games) {
        const gamesContainer = document.getElementById('games-container');
        gamesContainer.innerHTML = '';

        if (games.length === 0) {
            gamesContainer.innerHTML = '<div class="no-results">No games found. Try a different search term.</div>';
            return;
        }

        games.forEach(game => {
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            gameCard.dataset.categories = game.category.join(' ');

            let badgeHTML = '';
            if (game.badge) {
                badgeHTML = `<div class="game-badge">${game.badge}</div>`;
            }

            gameCard.innerHTML = `
                <img src="${game.thumbnail}" alt="${game.title}" class="game-thumbnail">
                ${badgeHTML}
                <div class="game-info">
                    <h3 class="game-title">${game.title}</h3>
                    <p class="game-description">${game.description}</p>
                    <div class="game-meta">
                        <span class="game-date">${game.date}</span>
                        <a href="game.html?theme=${game.id}" class="play-btn">Play</a>
                    </div>
                </div>
            `;

            gamesContainer.appendChild(gameCard);
        });
    }

    // Function to filter games
    function filterGames(category) {
        let filteredGames;

        if (category === 'all') {
            filteredGames = gamesData;
        } else {
            filteredGames = gamesData.filter(game => game.category.includes(category));
        }

        generateGameCards(filteredGames);
    }

    // Function to search games
    function searchGames(term) {
        if (term === '') {
            generateGameCards(gamesData);
            return;
        }

        const filteredGames = gamesData.filter(game =>
            game.title.toLowerCase().includes(term) ||
            game.description.toLowerCase().includes(term)
        );

        generateGameCards(filteredGames);
    }

    // Initialize with all games
    generateGameCards(gamesData);
});
