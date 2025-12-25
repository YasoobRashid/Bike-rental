const { addBike, listBikes, verifyOwnership } = require('../controllers/bikeController');
const Bike = require('../models/Bike');
const User = require('../models/User');
const redis = require('../utils/redis');
const Tesseract = require('tesseract.js');
const messageQueue = require('../utils/queue');
const httpMocks = require('node-mocks-http');

jest.mock('../models/Bike');
jest.mock('../models/User');
jest.mock('../utils/redis');   
jest.mock('tesseract.js');    
jest.mock('../utils/queue');  
jest.mock('../utils/pubsub', () => ({
    publisher: { publish: jest.fn() } 
}));

describe('Bike Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        next = jest.fn();
        jest.clearAllMocks();
    });

    // --- ADD BIKE TEST ---
    describe('addBike', () => {
        it('should add a bike successfully', async () => {
            req.user = { id: 'owner_1' };
            req.body = { name: 'R15', pricePerHour: 50, bikeNumber: 'MH12' };

            Bike.findOne.mockResolvedValue(null); // No duplicate
            Bike.create.mockResolvedValue({ _id: 'bike_1', name: 'R15' });

            await addBike(req, res, next);

            expect(res.statusCode).toBe(201);
            expect(res._getJSONData().message).toContain('Bike listed!');
        });

        it('should fail if bikeNumber exists', async () => {
            req.body = { name: 'R15', pricePerHour: 50, bikeNumber: 'MH12' };
            Bike.findOne.mockResolvedValue({ bikeNumber: 'MH12' }); // Duplicate

            await addBike(req, res, next);

            expect(res.statusCode).toBe(409);
        });
    });

    // --- LIST BIKES TEST (REDIS) ---
    describe('listBikes', () => {
        it('should serve from Redis if cache exists (Renter)', async () => {
            req.user = { id: 'renter_1', role: 'renter' };

            // Mock Redis returning data
            const cachedBikes = JSON.stringify([{ name: 'Cached Bike' }]);
            redis.get.mockResolvedValue(cachedBikes);
            
            // Mock DB call for "rentedByMe"
            Bike.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

            await listBikes(req, res, next);

            expect(redis.get).toHaveBeenCalledWith('available_bikes');
            expect(res._getJSONData().availableBikes).toEqual([{ name: 'Cached Bike' }]);
            console.log("Test: Served from Redis Cache");
        });

        it('should fetch from DB if Redis is empty', async () => {
            req.user = { id: 'renter_1', role: 'renter' };
            redis.get.mockResolvedValue(null); // Cache Miss

            const dbBikes = [{ name: 'DB Bike' }];
            // Complex mock for Bike.find({}).lean()
            Bike.find.mockImplementation((query) => {
                if (query.available) return { lean: jest.fn().mockResolvedValue(dbBikes) };
                return { lean: jest.fn().mockResolvedValue([]) };
            });

            await listBikes(req, res, next);

            expect(redis.set).toHaveBeenCalled(); // Should save to cache
            expect(res._getJSONData().availableBikes).toEqual(dbBikes);
        });
    });

    // --- VERIFY OWNERSHIP TEST (OCR) ---
    describe('verifyOwnership', () => {
        it('should verify bike if OCR finds Owner Name', async () => {
            req.user = { id: 'owner_1' };
            req.body = { bikeId: 'bike_1' };
            req.file = { path: 'fake_image.jpg', filename: 'image.jpg' };

            // Mock Data
            const mockBike = { 
                _id: 'bike_1', 
                name: 'R15', 
                owner: 'owner_1',
                bikeNumber: 'MH12',
                save: jest.fn() 
            };
            const mockOwner = { _id: 'owner_1', username: 'Yasoob', email: 'y@test.com' };

            Bike.findOne.mockResolvedValue(mockBike);
            User.findById.mockResolvedValue(mockOwner);
            
            // Mock OCR Success
            Tesseract.recognize.mockResolvedValue({ 
                data: { text: 'Receipt confirmed for YASOOB paid fully.' } 
            });

            await verifyOwnership(req, res, next);

            // Assertions
            expect(mockBike.isVerified).toBe(true);
            expect(mockBike.save).toHaveBeenCalled();
            expect(messageQueue.add).toHaveBeenCalled(); // Email queued
            expect(res._getJSONData().status).toBe('verified');
        });

        it('should reject verification if text does not match', async () => {
            req.user = { id: 'owner_1' };
            req.body = { bikeId: 'bike_1' };
            req.file = { path: 'fake.jpg' };

            const mockBike = { _id: 'bike_1', bikeNumber: 'MH12', save: jest.fn() };
            const mockOwner = { username: 'Yasoob' };

            Bike.findOne.mockResolvedValue(mockBike);
            User.findById.mockResolvedValue(mockOwner);
            
            // Mock OCR returning random text
            Tesseract.recognize.mockResolvedValue({ 
                data: { text: 'Random grocery list: apples, bananas.' } 
            });

            await verifyOwnership(req, res, next);

            expect(mockBike.isVerified).toBe(false);
            expect(res._getJSONData().status).toBe('pending');
        });
    });
});