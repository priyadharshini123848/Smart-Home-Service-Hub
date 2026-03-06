const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3MjM1NzgzNSwiZXhwIjoxODAzOTE1NDM1fQ.OCb2FFV41sa3HmC0913Q2b1AZrKNkVO1hlBkiUmzaXs';

console.log('Using secret:', process.env.JWT_SECRET);

jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
        console.error('Verification failed:', err.message);
        // Try with the fallback secret in case that was used
        jwt.verify(token, 'your_jwt_secret_key_123', (err2, decoded2) => {
            if (err2) {
                console.error('Verification also failed with fallback secret:', err2.message);
            } else {
                console.log('Verification succeeded with FALLBACK secret!');
            }
        });
    } else {
        console.log('Verification succeeded with .env secret!');
        console.log('Decoded payload:', decoded);
    }
});
