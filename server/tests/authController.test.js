const { signup, login } = require('../controllers/authController');
const User = require('../models/User');
const httpMocks = require('node-mocks-http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        next = jest.fn();
        jest.clearAllMocks();
    });

    // --- SIGNUP TESTS ---
    describe('signup', () => {
        it('should create a user successfully', async () => {
            req.body = { username: 'Yasoob', email: 'test@example.com', password: '123' };

            User.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(null) // User does not exist
            });

            // Mock: Hash password
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashed_pass');
            
            // Mock: Create user
            User.create.mockResolvedValue({ 
                _id: 'user_id_1', 
                username: 'Yasoob', 
                email: 'test@example.com', 
                role: 'renter' 
            });

            await signup(req, res, next);

            expect(res.statusCode).toBe(201);
            const data = res._getJSONData();
            expect(data.message).toBe('Signup successful');
            expect(data.userId).toBe('user_id_1');
        });

        it('should return 409 if email already exists', async () => {
            req.body = { username: 'Yasoob', email: 'exists@example.com', password: '123' };

            User.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({ email: 'exists@example.com' }) // User exists
            });

            await signup(req, res, next);

            expect(res.statusCode).toBe(409);
            expect(res._getJSONData().error).toBe('Email already registered');
        });
    });

    // --- LOGIN TESTS ---
    describe('login', () => {
        it('should return a token for valid credentials', async () => {
            req.body = { email: 'test@example.com', password: '123' };

            const mockUser = { 
                _id: 'user_id_1', 
                email: 'test@example.com', 
                password: 'hashed_pass',
                role: 'renter'
            };

            // Mock: User exists, Password matches, Token signed
            User.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('fake_token_abc');

            await login(req, res, next);

            expect(res.statusCode).toBe(200);
            expect(res._getJSONData().token).toBe('fake_token_abc');
        });

        it('should return 401 for wrong password', async () => {
            req.body = { email: 'test@example.com', password: 'wrong' };

            User.findOne.mockResolvedValue({ password: 'hashed_pass' });
            bcrypt.compare.mockResolvedValue(false);

            await login(req, res, next);

            expect(res.statusCode).toBe(401);
            expect(res._getJSONData().error).toBe('Invalid email or password');
        });
    });
});