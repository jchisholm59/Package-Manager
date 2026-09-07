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
    console.log(`Executing: ${command}`);
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
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
        // Run with LC_ALL=C to ensure stable output format
        const output = await runCommand("LC_ALL=C dpkg-query -W -f='${Package}|${Version}|${Status}\\n'");
        if (!output || output.trim() === "") {
            console.log("No packages returned from dpkg-query");
            return res.json([]);
        }
        const packages = output.trim().split('\n').map(line => {
            const parts = line.split('|');
            if (parts.length < 3) return null;
            const [name, version, status] = parts;
            // Only include packages that are actually installed (not "deinstall" or "purge")
            if (!status.includes("installed")) return null;
            return { name, version, status: status.trim() };
        }).filter(x => x);
        console.log(`Successfully listed ${packages.length} packages`);
        res.json(packages);
    } catch (err) {
        console.error("List packages failed", err);
        res.status(500).json({ error: 'Failed to list packages', details: err.stderr || err.error?.message });
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
        // The "Trixie Compatibility" Command (Robust Version):
        // We use -o configuration flags to avoid syntax clashes between update/install
        const env = 'DEBIAN_FRONTEND=noninteractive DEBCONF_NONINTERACTIVE_SEEN=true APT_LISTCHANGES_FRONTEND=none';
        const opts = [
            '-o Dpkg::Options::="--force-confdef"',
            '-o Dpkg::Options::="--force-confold"',
            '-o Dpkg::Options::="--force-all"',
            '-o Dpkg::Pre-Install-Pkgs::=""',
            '-o APT::Sandbox::User=root',
            '-o Apt::Key::gpgvcommand=/usr/bin/gpgv',
            '-o Acquire::AllowInsecureRepositories=true',
            '-o Acquire::AllowDowngradeToInsecureRepositories=true',
            '--allow-unauthenticated'
        ].join(' ');

        const cmd = `${env} apt-get update ${opts} || true; ${env} apt-get install -y ${opts} ${name} < /dev/null`;

        await runCommand(cmd);
        res.json({ message: `Package ${name} installed successfully` });
    } catch (err) {
        res.status(500).json({ error: `Failed to install ${name}`, details: err.stderr || err.error?.message });
    }
});

// POST /api/remove - Remove a package
app.post('/api/remove', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Package name is required' });
    try {
        const env = 'DEBIAN_FRONTEND=noninteractive DEBCONF_NONINTERACTIVE_SEEN=true';
        await runCommand(`${env} apt-get remove -y ${name} < /dev/null`);
        res.json({ message: `Package ${name} removed successfully` });
    } catch (err) {
        res.status(500).json({ error: `Failed to remove ${name}`, details: err.stderr });
    }
});

// GET /api/updates - Check for upgradable packages
app.get('/api/updates', async (req, res) => {
    try {
        const opts = '-o APT::Sandbox::User=root -o Apt::Key::gpgvcommand=/usr/bin/gpgv';
        await runCommand(`apt-get update ${opts} || true`);
        const output = await runCommand('apt list --upgradable');
        const updates = output.split('\n').slice(1) // Skip "Listing..."
            .filter(line => line.trim())
            .map(line => {
                const match = line.match(/^(\S+)\/.*?\s+(\S+)\s+(\S+)/);
                return match ? { name: match[1], newVersion: match[2], arch: match[3] } : null;
            }).filter(x => x);
        res.json(updates);
    } catch (err) {
        res.status(500).json({ error: 'Failed to check for updates', details: err.stderr || err.error?.message });
    }
});

// POST /api/upgrade - Apply updates
app.post('/api/upgrade', async (req, res) => {
    try {
        const env = 'DEBIAN_FRONTEND=noninteractive DEBCONF_NONINTERACTIVE_SEEN=true APT_LISTCHANGES_FRONTEND=none';
        const opts = [
            '-o Dpkg::Options::="--force-confdef"',
            '-o Dpkg::Options::="--force-confold"',
            '-o Dpkg::Options::="--force-all"',
            '-o Dpkg::Pre-Install-Pkgs::=""',
            '-o APT::Sandbox::User=root',
            '-o Apt::Key::gpgvcommand=/usr/bin/gpgv',
            '-o Acquire::AllowInsecureRepositories=true',
            '-o Acquire::AllowDowngradeToInsecureRepositories=true',
            '--allow-unauthenticated'
        ].join(' ');
        await runCommand(`${env} apt-get upgrade -y ${opts} < /dev/null`);
        res.json({ message: 'System upgraded successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Upgrade failed', details: err.stderr || err.error?.message });
    }
});

// POST /api/fix - Fix broken installs
app.post('/api/fix', async (req, res) => {
    try {
        const env = 'DEBIAN_FRONTEND=noninteractive DEBCONF_NONINTERACTIVE_SEEN=true APT_LISTCHANGES_FRONTEND=none';
        const opts = [
            '-o Dpkg::Options::="--force-confdef"',
            '-o Dpkg::Options::="--force-confold"',
            '-o Dpkg::Options::="--force-all"',
            '-o Dpkg::Pre-Install-Pkgs::=""',
            '-o APT::Sandbox::User=root',
            '-o Apt::Key::gpgvcommand=/usr/bin/gpgv',
            '-o Acquire::AllowInsecureRepositories=true',
            '-o Acquire::AllowDowngradeToInsecureRepositories=true',
            '--allow-unauthenticated'
        ].join(' ');
        await runCommand(`${env} apt-get install -f -y ${opts} < /dev/null`);
        res.json({ message: 'Broken dependencies fixed' });
    } catch (err) {
        res.status(500).json({ error: 'Fix failed', details: err.stderr || err.error?.message });
    }
});

// GET /api/release-check - Check for release upgrade
app.get('/api/release-check', async (req, res) => {
    try {
        // Try to detect if we are on Ubuntu or Debian
        const osInfo = await runCommand('cat /etc/os-release');
        const isUbuntu = osInfo.toLowerCase().includes('ubuntu');

        const cmd = isUbuntu ? 'do-release-upgrade -c' : 'apt-get dist-upgrade -s';
        const output = await runCommand(cmd);
        res.json({ status: isUbuntu ? output.trim() : 'Debian simulation run: ' + output.split('\n')[0] });
    } catch (err) {
        res.json({ status: 'No new release found or check failed', details: err.stderr });
    }
});

// Serve static frontend if built
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
