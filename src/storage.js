// --- FILE: src/storage.js ---
const schema = {
    username: {
        type: 'string',
        default: ''
    },
    modsURL: {
        type: 'string',
        default: ''
    },
    minecraftURL: {
        type: 'string',
        default: ''
    },
    minMemory: {
        type: 'string',
        default: '2G'
    },
    maxMemory: {
        type: 'string',
        default: '4G'
    }
};

// Use a dynamic import() to load electron-store.  This returns a Promise.
async function getStore() {
    const { default: Store } = await import('electron-store'); // Correct import
    return new Store({ schema });
}

async function getSettings() {
    const store = await getStore(); // Await the store instance.
    return {
        username: store.get('username'),
        modsURL: store.get('modsURL'),
        minecraftURL: store.get('minecraftURL'),
        minMemory: store.get('minMemory'),
        maxMemory: store.get('maxMemory')
    };
}

async function setSettings(settings) {
    const store = await getStore(); // Await the store instance.
    if (settings.username !== undefined) {
        store.set('username', settings.username);
    }
    if (settings.modsURL !== undefined) {
        store.set('modsURL', settings.modsURL);
    }
    if (settings.minecraftURL !== undefined) {
        store.set('minecraftURL', settings.minecraftURL);
    }
    if (settings.minMemory !== undefined) {
        store.set('minMemory', settings.minMemory);
    }
    if (settings.maxMemory !== undefined) {
        store.set('maxMemory', settings.maxMemory);
    }
}


module.exports = {
    getSettings,
    setSettings
};