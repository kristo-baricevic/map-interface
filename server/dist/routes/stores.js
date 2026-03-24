import { Router } from 'express';
import { getStores, updateStoreCoords } from '../db.js';
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
router.patch('/:id', (req, res) => {
    const { lng, lat } = req.body;
    if (typeof lng !== 'number' || typeof lat !== 'number') {
        res.status(400).json({ error: 'lng and lat must be numbers' });
        return;
    }
    try {
        const updated = updateStoreCoords(req.params.id, lng, lat);
        if (!updated) {
            res.status(404).json({ error: 'Store not found' });
            return;
        }
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update store' });
    }
});
export default router;
