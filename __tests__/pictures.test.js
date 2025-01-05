const request = require('supertest');
const path = require('path');
const jwt = require('jsonwebtoken');
const mockFs = require('mock-fs'); // Mockar filsystemet
const app = require('../pictures.js'); // Importera appen

// Mocka jwt.verify
jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(),
}));

describe('Tests for pictures.js', () => {
    beforeAll(() => {
        // Mockar filsystemet med en fake uppladdningsmapp och testdata
        mockFs({
            uploads: {}, // Tom uppladdningsmapp
            'test-data': {
                'test.jpg': 'fakeImageData', // Fake bildfil
            },
        });
    });

    afterAll(() => {
        mockFs.restore(); // Återställer filsystemet
    });

    beforeEach(() => {
        jest.clearAllMocks(); // Rensar tidigare mockar
    });

    test('POST /images - should upload image successfully if token & role are valid', async () => {
        jwt.verify.mockImplementation((token, key, options, callback) => {
            callback(null, { realm_access: { roles: ['worker'] } });
        });

        const response = await request(app)
            .post('/images')
            .set('Authorization', 'Bearer validMockToken')
            .attach('image', path.join(__dirname, '../test-data/test.jpg')); // Använder fake-fil

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Image uploaded successfully');
        expect(response.body).toHaveProperty('filePath'); // Kontrollera att filePath returneras
    });

    test('POST /images - should return 400 if no file was uploaded', async () => {
        jwt.verify.mockImplementation((token, key, options, callback) => {
            callback(null, { realm_access: { roles: ['worker'] } });
        });

        const response = await request(app)
            .post('/images')
            .set('Authorization', 'Bearer validMockToken'); // Ingen fil bifogad

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'No file uploaded');
    });

    test('GET /images - should list images if token & role are valid', async () => {
        jwt.verify.mockImplementation((token, key, options, callback) => {
            callback(null, { realm_access: { roles: ['doctor'] } });
        });

        const response = await request(app)
            .get('/images')
            .set('Authorization', 'Bearer validMockToken');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('files'); // Kontrollera att fil-listan returneras
        expect(Array.isArray(response.body.files)).toBe(true);
    });
});
