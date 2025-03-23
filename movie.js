const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

// Connect to the database
const db = new sqlite3.Database('./db/rtfilms.db', sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

app.get('/movie', (req, res) => {
    const filmCode = req.query.film;
    if (!filmCode) {
        return res.status(400).send('Missing movie title parameter.');
    }

    // Query to get main movie details
    const movieQuery = `SELECT Title, Year, Score FROM Films WHERE FilmCode = ?`;

    db.get(movieQuery, [filmCode], (err, movie) => {
        if (err) {
            console.error('Error retrieving movie:', err.message);
            return res.status(500).send('Error retrieving movie data.');
        }
        if (!movie) {
            return res.status(404).send('Movie not found.');
        }

        // Default structure for movie details
        let movieDetails = {
            title: movie.Title,
            year: movie.Year,
            score: movie.Score,
            director: '⚠️ Not Provided',
            genre: '⚠️ Not Provided',
            runtime: '⚠️ Not Provided',
            boxOffice: '⚠️ Not Provided',
            mpaaRating: '⚠️ Not Provided',
            releaseCompany: '⚠️ Not Provided',
            synopsis: '⚠️ Not Provided',
            links: {
                official: '#',
                rt: '#',
                imdb: '#'
            },
            stars: []
        };

        // Query to get additional movie details from FilmDetails table
        const detailsQuery = `SELECT Attribute, Value FROM FilmDetails WHERE FilmCode = ?`;

        db.all(detailsQuery, [filmCode], (err, details) => {
            if (err) {
                console.error('Error retrieving details:', err.message);
                return res.status(500).send('Error retrieving movie details.');
            }

            // Assign retrieved details
            details.forEach(detail => {
                switch (detail.Attribute.toLowerCase()) {
                    case 'director':
                        movieDetails.director = detail.Value;
                        break;
                    case 'genre':
                        movieDetails.genre = detail.Value;
                        break;
                    case 'runtime':
                        movieDetails.runtime = detail.Value;
                        break;
                    case 'box office':
                        movieDetails.boxOffice = `$ ${detail.Value}`;
                        break;
                    case 'mpaa rating':
                        movieDetails.mpaaRating = detail.Value;
                        break;
                    case 'release company':
                        movieDetails.releaseCompany = detail.Value;
                        break;
                    case 'movie synopsis':
                        movieDetails.synopsis = detail.Value;
                        break;
                    case 'links':
                        const linksArray = detail.Value.split(', ');
                        linksArray.forEach(link => {
                            if (link.startsWith('IMDB:')) {
                                movieDetails.links.imdb = link.replace('IMDB: ', '');
                            } else if (link.startsWith('RT:')) {
                                movieDetails.links.rt = link.replace('RT: ', '');
                            } else {
                                movieDetails.links.official = link;
                            }
                        });
                        break;
                    case 'starring':
                        movieDetails.stars = detail.Value.split(', ');
                        break;
                }
            });

            console.log("Movie Details:", movieDetails); // ✅ Logging at the right place

            // Query to get reviews
            const reviewsQuery = `SELECT ReviewerName AS critic, ReviewText AS comment, Affiliation AS publication FROM Reviews WHERE FilmCode = ?`;

            db.all(reviewsQuery, [filmCode], (err, reviews) => {
                if (err) {
                    console.error('Error retrieving reviews:', err.message);
                    return res.status(500).send('Error retrieving movie reviews.');
                }

                console.log("Fetched Reviews:", reviews); // ✅ Logging reviews for debugging

                res.render('movie', { movie: movieDetails, reviews });
            });
        });
    });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
