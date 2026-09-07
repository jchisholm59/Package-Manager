const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 8300;

app.use(cors());
app.use(bodyParser.json());

// Helper function to run shell commands
const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stderr });
                return;
            }
            resolve(stdout);
        });
    });
};

// GET /api/packages - List installed packages
app.get('/api/packages', async (req, res) => {
    try {
        const output = await runCommand("dpkg-query -W -f='${Package}|${Version}|${Status}\\n'");
        const packages = output.trim().split('\n').map(line => {
            const [name, version, status] = line.split('|');
            return { name, version, status };
        });
        res.json(packages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to list packages', details: err.stderr });
    }
});

// GET /api/search?q=... - Search available packages
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Query parameter q is required' });
    try {
        const output = await runCommand(`apt-cache search "${query}" | head -n 50`);
        const results = output.trim().split('\n').map(line => {
            const parts = line.match(/^(\S+)\s+-\s+(.*)$/);
            return parts ? { name: parts[1], description: parts[2] } : null;
        }).filter(x => x);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Search failed', details: err.stderr });
    }
});

// POST /api/install - Install a package
app.post('/api/install', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Package name is required' });
    try {
        // -y for non-interactive
        await runCommand(`sudo apt-get install -y ${name}`);
        res.json({ message: `Package ${name} installed successfully` });
    } catch (err) {
        res.status(500).json({ error: `Failed to install ${name}`, details: err.stderr });
    }
});

// POST /api/remove - Remove a package
app.post('/api/remove', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Package name is required' });
    try {
        await runCommand(`sudo apt-get remove -y ${name}`);
        res.json({ message: `Package ${name} removed successfully` });
    } catch (err) {
        res.status(500).json({ error: `Failed to remove ${name}`, details: err.stderr });
    }
});

// GET /api/updates - Check for upgradable packages
app.get('/api/updates', async (req, res) => {
    try {
        await runCommand('sudo apt-get update');
        const output = await runCommand('apt list --upgradable');
        const updates = output.split('\n').slice(1) // Skip "Listing..."
            .filter(line => line.trim())
            .map(line => {
                const match = line.match(/^(\S+)\/.*?\s+(\S+)\s+(\S+)/);
                return match ? { name: match[1], newVersion: match[2], arch: match[3] } : null;
            }).filter(x => x);
        res.json(updates);
    } catch (err) {
        res.status(500).json({ error: 'Failed to check for updates', details: err.stderr });
    }
});

// POST /api/upgrade - Apply updates
app.post('/api/upgrade', async (req, res) => {
    try {
        await runCommand('sudo apt-get upgrade -y');
        res.json({ message: 'System upgraded successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Upgrade failed', details: err.stderr });
    }
});

// POST /api/fix - Fix broken installs
app.post('/api/fix', async (req, res) => {
    try {
        await runCommand('sudo apt-get install -f -y');
        res.json({ message: 'Broken dependencies fixed' });
    } catch (err) {
        res.status(500).json({ error: 'Fix failed', details: err.stderr });
    }
});

// GET /api/release-check - Check for release upgrade
app.get('/api/release-check', async (req, res) => {
    try {
        const output = await runCommand('do-release-upgrade -c');
        res.json({ status: output.trim() });
    } catch (err) {
        // If no upgrade available, do-release-upgrade -c might exit with non-zero
        res.json({ status: 'No new release found or check failed', details: err.stderr });
    }
});

// Serve static frontend if built
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
