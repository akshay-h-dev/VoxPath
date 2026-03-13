const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Directory where per-user JSON files will be stored
const DATA_DIR = path.join(__dirname, '..', 'user-data');

// Ensure directory exists
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getUserFilePath(user) {
  // Use email in filename for readability, but avoid special characters
  const safeEmail = user.email.replace(/[^a-zA-Z0-9@._-]/g, '_');
  return path.join(DATA_DIR, `${safeEmail}.json`);
}

async function readExistingFile(filePath) {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

// POST /api/user-data
// Save arbitrary JSON payload for the authenticated user
const saveUserData = async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const { payload } = req.body || {};
    if (payload === undefined) {
      return res.status(400).json({ success: false, error: 'Missing payload' });
    }

    ensureDir();

    const filePath = getUserFilePath(req.user);
    const nowIso = new Date().toISOString();

    // Read existing file and migrate if needed (old format stored a single payload)
    let existing = await readExistingFile(filePath);
    if (existing && existing.payload && !existing.items) {
      existing = {
        email: existing.email || req.user.email,
        userId: existing.userId || String(req.user._id),
        updatedAt: existing.updatedAt || nowIso,
        items: [
          {
            id: crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex'),
            createdAt: existing.updatedAt || nowIso,
            payload: existing.payload,
          },
        ],
      };
    }

    const nextItem = {
      id: crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex'),
      createdAt: nowIso,
      payload,
    };

    const content = existing && Array.isArray(existing.items)
      ? {
          email: req.user.email,
          userId: String(req.user._id),
          updatedAt: nowIso,
          items: [...existing.items, nextItem],
        }
      : {
          email: req.user.email,
          userId: String(req.user._id),
          updatedAt: nowIso,
          items: [nextItem],
        };

    await fs.promises.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');

    return res.json({ success: true });
  } catch (err) {
    console.error('Error saving user data JSON:', err);
    return res.status(500).json({ success: false, error: 'Failed to save user data' });
  }
};

// GET /api/user-data
// Fetch stored JSON payload for the authenticated user
const getUserData = async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    ensureDir();

    const filePath = getUserFilePath(req.user);

    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const data = JSON.parse(raw);

      // Migrate on read (if older single-payload format exists)
      if (data && data.payload && !data.items) {
        const nowIso = new Date().toISOString();
        const migrated = {
          email: data.email || req.user.email,
          userId: data.userId || String(req.user._id),
          updatedAt: data.updatedAt || nowIso,
          items: [
            {
              id: crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex'),
              createdAt: data.updatedAt || nowIso,
              payload: data.payload,
            },
          ],
        };
        await fs.promises.writeFile(filePath, JSON.stringify(migrated, null, 2), 'utf8');
        return res.json({ success: true, data: migrated });
      }

      return res.json({ success: true, data });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // No data yet for this user
        return res.json({ success: true, data: null });
      }
      console.error('Error reading user data JSON:', err);
      return res.status(500).json({ success: false, error: 'Failed to read user data' });
    }
  } catch (err) {
    console.error('Unexpected error in getUserData:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { saveUserData, getUserData };

