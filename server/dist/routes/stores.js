import { Router } from 'express';
import { getStores } from '../db.js';
const router = Router();
router.get('/', (_req, res) => {
    try {
        const stores = getStores();
        res.json(stores);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load stores' });
    }
});
export default router;
